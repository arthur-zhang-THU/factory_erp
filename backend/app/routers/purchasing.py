from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case  # <--- 关键修复：必须引用 case
from pydantic import BaseModel
from typing import List

from app.database import get_db
# ⚠️ 只引用确定存在的模型，不引用 Enum
from app.models import Material, InventoryTxn, WorkOrder, BOMHeader, BOMItem

router = APIRouter(
    prefix="/purchasing",
    tags=["采购管理 (Purchasing/MRP)"]
)

class MRPSuggestion(BaseModel):
    material_id: int
    material_name: str
    material_spec: str | None
    current_stock: float
    required_qty: float
    shortage_qty: float
    status: str

@router.get("/mrp_analysis", response_model=List[MRPSuggestion])
async def analyze_mrp(db: AsyncSession = Depends(get_db)):
    
    # 1. 获取当前实时库存 (Snapshot)
    # 修复：使用 case 函数，且直接用字符串 'IN' 判断
    stock_stmt = (
        select(
            InventoryTxn.material_id,
            func.sum(case((InventoryTxn.txn_type == 'IN', InventoryTxn.qty), else_=-InventoryTxn.qty)).label("stock")
        )
        .group_by(InventoryTxn.material_id)
    )
    stock_res = (await db.execute(stock_stmt)).all()
    # 修复：防止结果为 None
    stock_map = {r.material_id: float(r.stock or 0) for r in stock_res}

    # 2. 计算生产需求 (Demand)
    demand_stmt = (
        select(
            BOMItem.material_id,
            func.sum(BOMItem.qty_per * (1 + BOMItem.scrap_rate)).label("demand")
        )
        .join(BOMHeader, BOMHeader.id == BOMItem.bom_id)
        .join(WorkOrder, WorkOrder.project_id == BOMHeader.project_id)
        # 修复：直接用字符串列表匹配状态
        .where(WorkOrder.status.in_(['PLANNED', 'IN_PROGRESS'])) 
        .group_by(BOMItem.material_id)
    )
    demand_res = (await db.execute(demand_stmt)).all()
    # 修复：防止结果为 None
    demand_map = {r.material_id: float(r.demand or 0) for r in demand_res}

    # 3. 计算缺口
    materials = (await db.execute(select(Material))).scalars().all()
    
    suggestions = []
    for m in materials:
        curr = stock_map.get(m.id, 0.0)
        req = demand_map.get(m.id, 0.0)
        
        shortage = req - curr
        status = "SHORTAGE" if shortage > 0 else "OK"
        
        # 只有当有库存或有需求时才显示
        if curr != 0 or req != 0:
            suggestions.append(MRPSuggestion(
                material_id=m.id,
                material_name=m.name,
                material_spec=m.spec,
                current_stock=round(curr, 2),
                required_qty=round(req, 2),
                shortage_qty=round(max(shortage, 0), 2),
                status=status
            ))
            
    suggestions.sort(key=lambda x: x.shortage_qty, reverse=True)
    return suggestions