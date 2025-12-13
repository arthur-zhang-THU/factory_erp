from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
# Ensure WOType is imported here
from app.models import WorkOrder, Project, RoutingStep, WOStatus, WOType
from app.schemas import WorkOrderCreate, WorkOrderResponse, BaseSchema

router = APIRouter(
    prefix="/work_orders",
    tags=["生产管理 (Manufacturing)"]
)

# --- Define Request Body for Rework ---
class ReworkCreate(BaseModel):
    qty: int # Rework Quantity

# --- Define Request Body for Status Update ---
class WOStatusUpdate(BaseModel):
    status: WOStatus

# 1. Get Work Order List
@router.get("/", response_model=List[WorkOrderResponse])
async def read_work_orders(db: AsyncSession = Depends(get_db)):
    # Join with Project to get project name
    stmt = (
        select(WorkOrder)
        .options(selectinload(WorkOrder.project))
        .order_by(desc(WorkOrder.id))
    )
    result = await db.execute(stmt)
    wos = result.scalars().all()
    
    return [
        WorkOrderResponse(
            id=wo.id,
            project_id=wo.project_id,
            project_name=wo.project.name if wo.project else "未知项目",
            status=wo.status,
            wo_type=wo.wo_type, # Return the WO Type (STANDARD/REWORK)
            parent_id=wo.parent_id,
            planned_start=wo.planned_start,
            planned_end=wo.planned_end,
            qty=wo.qty # Use the actual qty from DB
        )
        for wo in wos
    ]

# 2. Create Work Order (Standard)
@router.post("/", response_model=WorkOrderResponse)
async def create_work_order(
    wo_in: WorkOrderCreate, 
    db: AsyncSession = Depends(get_db)
):
    # A. Create WO Header
    new_wo = WorkOrder(
        project_id=wo_in.project_id,
        planned_start=wo_in.planned_start,
        planned_end=wo_in.planned_end,
        status=WOStatus.PLANNED,
        wo_type=WOType.STANDARD, # Default to Standard
        qty=wo_in.qty
    )
    db.add(new_wo)
    await db.commit()
    await db.refresh(new_wo)

    # B. Generate Standard Routing (Simulation)
    default_steps = [
        (1, "CNC 切割", "CNC-Machine-01", 120),
        (2, "UV 打印", "Printer-05", 30),
        (3, "组装", "Assembly-Line-A", 60),
        (4, "质检 (QC)", "QC-Station", 15),
    ]

    for seq, name, wc, mins in default_steps:
        step = RoutingStep(
            wo_id=new_wo.id,
            seq_no=seq,
            process_name=name,
            workcenter=wc,
            std_minutes=mins
        )
        db.add(step)
    
    await db.commit()

    # C. Return Result (Reload Project for name)
    stmt = select(WorkOrder).options(selectinload(WorkOrder.project)).where(WorkOrder.id == new_wo.id)
    result = await db.execute(stmt)
    final_wo = result.scalar()

    return WorkOrderResponse(
        id=final_wo.id,
        project_id=final_wo.project_id,
        project_name=final_wo.project.name,
        status=final_wo.status,
        wo_type=final_wo.wo_type,
        planned_start=final_wo.planned_start,
        planned_end=final_wo.planned_end,
        qty=final_wo.qty
    )

# 3. Create Rework Order (The Missing Endpoint)
@router.post("/{wo_id}/rework", response_model=WorkOrderResponse)
async def create_rework_order(
    wo_id: int, 
    rework_in: ReworkCreate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Rework Order:
    1. Find parent WO
    2. Inherit project info
    3. Set Type=REWORK, Status=PLANNED
    """
    # 1. Find Parent WO
    stmt = select(WorkOrder).options(selectinload(WorkOrder.project)).where(WorkOrder.id == wo_id)
    result = await db.execute(stmt)
    parent_wo = result.scalar()
    
    if not parent_wo:
        raise HTTPException(status_code=404, detail="原始工单不存在")
        
    # 2. Create Child WO (Rework)
    new_wo = WorkOrder(
        project_id=parent_wo.project_id,
        status=WOStatus.PLANNED,
        wo_type=WOType.REWORK,      # Mark as Rework
        parent_id=parent_wo.id,     # Link to Parent
        qty=rework_in.qty,          # Rework Quantity
        planned_start=datetime.now().date(),
        planned_end=datetime.now().date()
    )
    
    db.add(new_wo)
    await db.commit()
    await db.refresh(new_wo)
    
    # 3. Return
    return WorkOrderResponse(
        id=new_wo.id,
        project_id=new_wo.project_id,
        project_name=parent_wo.project.name if parent_wo.project else "未知项目",
        status=new_wo.status,
        wo_type=new_wo.wo_type,
        parent_id=new_wo.parent_id,
        qty=new_wo.qty,
        planned_start=new_wo.planned_start,
        planned_end=new_wo.planned_end
    )

# 4. Update Status
@router.patch("/{wo_id}/status", response_model=WorkOrderResponse)
async def update_wo_status(
    wo_id: int, 
    update_in: WOStatusUpdate, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Find WO
    stmt = select(WorkOrder).options(selectinload(WorkOrder.project)).where(WorkOrder.id == wo_id)
    result = await db.execute(stmt)
    wo = result.scalar()
    
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")

    # 2. Status Logic
    current_status = wo.status
    new_status = update_in.status

    if current_status == new_status:
        return WorkOrderResponse(
            id=wo.id,
            project_id=wo.project_id,
            project_name=wo.project.name if wo.project else "未知项目",
            status=wo.status,
            wo_type=wo.wo_type,
            planned_start=wo.planned_start,
            planned_end=wo.planned_end,
            qty=wo.qty
        )

    # Simple validation logic
    if current_status == WOStatus.PLANNED and new_status == WOStatus.IN_PROGRESS:
        wo.status = new_status
    elif current_status == WOStatus.IN_PROGRESS and new_status == WOStatus.COMPLETED:
        wo.status = new_status
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"非法状态变更: {current_status} -> {new_status}"
        )

    await db.commit()
    await db.refresh(wo)

    return WorkOrderResponse(
        id=wo.id,
        project_id=wo.project_id,
        project_name=wo.project.name if wo.project else "未知项目",
        status=wo.status,
        wo_type=wo.wo_type,
        planned_start=wo.planned_start,
        planned_end=wo.planned_end,
        qty=wo.qty
    )

# --- Routing Endpoints ---

@router.get("/{wo_id}/routing", response_model=List[dict])
async def get_wo_routing(wo_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(RoutingStep).where(RoutingStep.wo_id == wo_id).order_by(RoutingStep.seq_no)
    result = await db.execute(stmt)
    steps = result.scalars().all()
    
    return [
        {
            "id": s.id,
            "seq_no": s.seq_no,
            "process_name": s.process_name,
            "workcenter": s.workcenter,
            "std_minutes": s.std_minutes
        }
        for s in steps
    ]

class RoutingReorder(BaseModel):
    step_ids: List[int]

@router.post("/{wo_id}/routing/reorder")
async def reorder_routing(
    wo_id: int, 
    reorder_in: RoutingReorder, 
    db: AsyncSession = Depends(get_db)
):
    for index, step_id in enumerate(reorder_in.step_ids):
        stmt = select(RoutingStep).where(RoutingStep.id == step_id)
        result = await db.execute(stmt)
        step = result.scalar()
        if step:
            step.seq_no = index + 1
            
    await db.commit()
    return {"message": "Order updated"}