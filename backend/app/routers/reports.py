from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models import Project, BOMHeader, BOMItem, Material, WorkOrder, InventoryTxn, TxnType

router = APIRouter(
    prefix="/reports",
    tags=["报表分析 (BI)"]
)

# 定义返回给前端的数据结构
class CostAnalysisDTO(BaseModel):
    project_id: int
    project_name: str
    est_material_cost: float
    act_material_cost: float
    variance: float          # 差异金额 (实际 - 预估)
    variance_pct: float      # 差异百分比

@router.get("/cost_analysis", response_model=List[CostAnalysisDTO])
async def get_cost_analysis(db: AsyncSession = Depends(get_db)):
    """
    核心 BI 逻辑：对比 BOM 预估成本 vs 实际领料成本
    """
    
    # 1. 计算预估成本 (Estimated Cost)
    # 逻辑: Sum(BOM用量 * (1+损耗率) * 标准单价) [cite: 53]
    est_stmt = (
        select(
            Project.id.label("pid"),
            func.sum(
                BOMItem.qty_per * (1 + BOMItem.scrap_rate) * Material.std_cost
            ).label("est_cost")
        )
        .join(BOMHeader, BOMHeader.project_id == Project.id)
        .join(BOMItem, BOMItem.bom_id == BOMHeader.id)
        .join(Material, Material.id == BOMItem.material_id)
        .group_by(Project.id)
    )
    
    # 2. 计算实际成本 (Actual Cost)
    # 逻辑: Sum(领料数量 * 标准单价) [cite: 54]
    act_stmt = (
        select(
            Project.id.label("pid"),
            func.sum(InventoryTxn.qty * Material.std_cost).label("act_cost")
        )
        .join(WorkOrder, WorkOrder.project_id == Project.id)
        .join(InventoryTxn, InventoryTxn.wo_id == WorkOrder.id)
        .join(Material, Material.id == InventoryTxn.material_id)
        .where(InventoryTxn.txn_type == TxnType.OUT) # 只计算领料(OUT)
        .group_by(Project.id)
    )

    # 执行查询
    est_res = (await db.execute(est_stmt)).all()
    act_res = (await db.execute(act_stmt)).all()

    # 3. 数据合并 (在 Python 层合并，避免复杂的 SQL Full Outer Join)
    # 转成字典方便查找: { project_id: cost }
    est_map = {r.pid: float(r.est_cost or 0) for r in est_res}
    act_map = {r.pid: float(r.act_cost or 0) for r in act_res}

    # 获取所有项目信息
    projects = (await db.execute(select(Project))).scalars().all()
    
    results = []
    for p in projects:
        e_cost = est_map.get(p.id, 0.0)
        a_cost = act_map.get(p.id, 0.0)
        
        # 计算差异
        diff = a_cost - e_cost
        # 防止除以零
        pct = (diff / e_cost * 100) if e_cost > 0 else 0.0
        
        # 只返回有数据的项目，或者你可以返回所有
        if e_cost > 0 or a_cost > 0:
            results.append(CostAnalysisDTO(
                project_id=p.id,
                project_name=p.name,
                est_material_cost=round(e_cost, 2),
                act_material_cost=round(a_cost, 2),
                variance=round(diff, 2),
                variance_pct=round(pct, 1)
            ))
        
    return results