from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
# ⚠️ 注意：移除了旧的 RoutingStep，只保留 WorkOrderStep
from app.models import WorkOrder, Project, WOStatus, WOType, WorkOrderStep, StepStatus, User, UserRole
from app.schemas import WorkOrderCreate, WorkOrderResponse, StepCreate, StepResponse

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
async def read_work_orders(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkOrder)
        .options(
            selectinload(WorkOrder.steps).selectinload(WorkOrderStep.assigned_user),
            selectinload(WorkOrder.project)
        )
        .order_by(desc(WorkOrder.created_at))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

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
        wo_type=WOType.STANDARD,
        qty=wo_in.qty
    )
    db.add(new_wo)
    await db.commit()
    await db.refresh(new_wo)

    # B. Generate Default Process Steps (✅ 修复：写入新表 WorkOrderStep)
    default_steps = ["激光切割", "围边焊接", "组装", "质检"]

    for idx, name in enumerate(default_steps):
        step = WorkOrderStep(
            wo_id=new_wo.id,
            name=name,
            sequence=idx + 1,
            # 第一步默认激活，后面锁定
            status=StepStatus.PENDING if idx == 0 else StepStatus.LOCKED
        )
        db.add(step)
    
    await db.commit()

    # C. Return Result (Reload Project for name)
    stmt = select(WorkOrder).options(selectinload(WorkOrder.project), selectinload(WorkOrder.steps)).where(WorkOrder.id == new_wo.id)
    result = await db.execute(stmt)
    final_wo = result.scalar()

    return final_wo

# 3. Create Rework Order
@router.post("/{wo_id}/rework", response_model=WorkOrderResponse)
async def create_rework_order(
    wo_id: int, 
    rework_in: ReworkCreate, 
    db: AsyncSession = Depends(get_db)
):
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
    
    # 3. Return (Manual construction or reload)
    return WorkOrderResponse(
        id=new_wo.id,
        project_id=new_wo.project_id,
        project_name=parent_wo.project.name if parent_wo.project else "未知项目",
        status=new_wo.status,
        wo_type=new_wo.wo_type,
        parent_id=new_wo.parent_id,
        qty=new_wo.qty,
        planned_start=new_wo.planned_start,
        planned_end=new_wo.planned_end,
        steps=[] # Rework orders start empty usually
    )

# 4. Update Status
@router.patch("/{wo_id}/status", response_model=WorkOrderResponse)
async def update_wo_status(
    wo_id: int, 
    update_in: WOStatusUpdate, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Find WO
    stmt = select(WorkOrder).options(selectinload(WorkOrder.project), selectinload(WorkOrder.steps)).where(WorkOrder.id == wo_id)
    result = await db.execute(stmt)
    wo = result.scalar()
    
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")

    wo.status = update_in.status
    await db.commit()
    await db.refresh(wo)

    return wo

# --- 🆕 Process/Routing Endpoints (Unified) ---

# 获取工人列表
@router.get("/users/workers")
async def get_workers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role == UserRole.WORKER))
    return result.scalars().all()

# 获取工艺流程 (回显)
@router.get("/{wo_id}/steps", response_model=List[StepResponse])
async def get_wo_steps(wo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkOrderStep)
        .where(WorkOrderStep.wo_id == wo_id)
        .order_by(WorkOrderStep.sequence)
    )
    return result.scalars().all()

# 保存排程 (全量更新)
@router.post("/{wo_id}/steps")
async def update_wo_steps(wo_id: int, steps_in: List[StepCreate], db: AsyncSession = Depends(get_db)):
    wo = await db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")
    
    # 1. 清空旧步骤
    await db.execute(text(f"DELETE FROM work_order_steps WHERE wo_id = {wo_id}"))
    
    # 2. 插入新步骤
    for idx, s in enumerate(steps_in):
        initial_status = StepStatus.PENDING if idx == 0 else StepStatus.LOCKED
        
        new_step = WorkOrderStep(
            wo_id=wo_id,
            name=s.name,
            sequence=idx + 1,
            assigned_to=s.assigned_to,
            status=initial_status
        )
        db.add(new_step)
        
    await db.commit()
    return {"msg": "工艺排程已保存"}

# 工序流转 (完成当前，激活下一步)
@router.post("/steps/{step_id}/complete")
async def complete_step(step_id: int, db: AsyncSession = Depends(get_db)):
    step = await db.get(WorkOrderStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="工序不存在")
        
    # 标记完成
    step.status = StepStatus.COMPLETED
    
    # 激活下一步
    result = await db.execute(
        select(WorkOrderStep)
        .where(WorkOrderStep.wo_id == step.wo_id)
        .where(WorkOrderStep.sequence == step.sequence + 1)
    )
    next_step = result.scalar()
    
    if next_step:
        next_step.status = StepStatus.PENDING
    else:
        # 全部完成
        wo = await db.get(WorkOrder, step.wo_id)
        wo.status = "COMPLETED"
    
    await db.commit()
    return {"msg": "工序已完成"}