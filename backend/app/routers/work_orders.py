from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.models import WorkOrder, Project, RoutingStep, WOStatus
from app.schemas import WorkOrderCreate, WorkOrderResponse, BaseSchema
from datetime import datetime

router = APIRouter(
    prefix="/work_orders",
    tags=["生产管理 (Manufacturing)"]
)

# 1. 获取工单列表
@router.get("/", response_model=List[WorkOrderResponse])
async def read_work_orders(db: AsyncSession = Depends(get_db)):
    # 关联查询 Project，为了拿到项目名字
    stmt = (
        select(WorkOrder)
        .options(selectinload(WorkOrder.project))
        .order_by(desc(WorkOrder.id))
    )
    result = await db.execute(stmt)
    wos = result.scalars().all()
    
    # 转换数据格式
    return [
        WorkOrderResponse(
            id=wo.id,
            project_id=wo.project_id,
            project_name=wo.project.name if wo.project else "未知项目",
            status=wo.status,
            planned_start=wo.planned_start,
            planned_end=wo.planned_end,
            qty=1 # 暂时写死，后续可扩展
        )
        for wo in wos
    ]

# 2. 创建工单 (下达生产任务)
@router.post("/", response_model=WorkOrderResponse)
async def create_work_order(
    wo_in: WorkOrderCreate, 
    db: AsyncSession = Depends(get_db)
):
    # A. 创建工单头
    new_wo = WorkOrder(
        project_id=wo_in.project_id,
        planned_start=wo_in.planned_start,
        planned_end=wo_in.planned_end,
        status=WOStatus.PLANNED
    )
    db.add(new_wo)
    await db.commit()
    await db.refresh(new_wo)

    # B. [亮点] 自动生成标准工艺路线 (Standard Routing)
    # 真实系统中这里应该读取 Standard Routing 表，我们这里模拟一下
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

    # C. 返回结果 (需要重新加载 Project 以获取名字)
    stmt = select(WorkOrder).options(selectinload(WorkOrder.project)).where(WorkOrder.id == new_wo.id)
    result = await db.execute(stmt)
    final_wo = result.scalar()

    return WorkOrderResponse(
        id=final_wo.id,
        project_id=final_wo.project_id,
        project_name=final_wo.project.name,
        status=final_wo.status,
        planned_start=final_wo.planned_start,
        planned_end=final_wo.planned_end,
        qty=1
    )


# 定义修改状态的请求体
class WOStatusUpdate(BaseModel):
    status: WOStatus

# 🟢 修复后的 update_wo_status
@router.patch("/{wo_id}/status", response_model=WorkOrderResponse)
async def update_wo_status(
    wo_id: int, 
    update_in: WOStatusUpdate, 
    db: AsyncSession = Depends(get_db)
):
    # 1. 查工单 (一定要加载 project，否则 project_name 会报错)
    stmt = select(WorkOrder).options(selectinload(WorkOrder.project)).where(WorkOrder.id == wo_id)
    result = await db.execute(stmt)
    wo = result.scalar()
    
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")

    # 2. 状态机逻辑
    current_status = wo.status
    new_status = update_in.status

    # 允许相同状态更新（避免误触报错）
    if current_status == new_status:
        # 手动构造返回，防止字段缺失
        return WorkOrderResponse(
            id=wo.id,
            project_id=wo.project_id,
            project_name=wo.project.name if wo.project else "未知项目",
            status=wo.status,
            planned_start=wo.planned_start,
            planned_end=wo.planned_end,
            qty=1 # 暂时硬编码为 1，因为你的数据库表里还没加这个字段
        )

    # 状态流转检查
    if current_status == WOStatus.PLANNED and new_status == WOStatus.IN_PROGRESS:
        wo.status = new_status
    elif current_status == WOStatus.IN_PROGRESS and new_status == WOStatus.COMPLETED:
        wo.status = new_status
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"非法状态变更: {current_status} -> {new_status}"
        )

    # 3. 提交事务 (这一步成功了，数据库就改了)
    await db.commit()
    await db.refresh(wo)

    # 4. 🟢 关键修复：手动构造 Pydantic 对象返回
    # 不要直接 return wo，因为 wo 里面可能没有 qty 属性，会导致 500 错误
    return WorkOrderResponse(
        id=wo.id,
        project_id=wo.project_id,
        project_name=wo.project.name if wo.project else "未知项目",
        status=wo.status,
        planned_start=wo.planned_start,
        planned_end=wo.planned_end,
        qty=1 # 强行补上这个字段，哄好前端
    )

# --- ⬇️ 工艺路线 (Routing) 相关接口 ---

from app.models import RoutingStep

# 1. 获取某工单的工艺路线
@router.get("/{wo_id}/routing", response_model=List[dict]) # 简单起见返回 dict
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

# 2. 拖拽排序保存接口 (Reorder)
class RoutingReorder(BaseModel):
    step_ids: List[int] # 前端传来的 ID 列表，按新顺序排列

@router.post("/{wo_id}/routing/reorder")
async def reorder_routing(
    wo_id: int, 
    reorder_in: RoutingReorder, 
    db: AsyncSession = Depends(get_db)
):
    # 遍历前端传来的 ID 列表，按索引更新 seq_no
    for index, step_id in enumerate(reorder_in.step_ids):
        # index 是 0, 1, 2... 我们存成 1, 2, 3...
        stmt = select(RoutingStep).where(RoutingStep.id == step_id)
        result = await db.execute(stmt)
        step = result.scalar()
        if step:
            step.seq_no = index + 1
            
    await db.commit()
    return {"message": "Order updated"}