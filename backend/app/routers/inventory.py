from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.models import InventoryTxn, Material
from app.schemas import MaterialScanRequest, InventoryTxnResponse, BaseSchema
from app.database import get_db
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/inventory", tags=["库存管理(Inventory)"])

@router.post("/scan", response_model=InventoryTxnResponse, summary="工人扫码录入接口")
async def scan_material(
    request: MaterialScanRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    处理工人扫码：
    1. 校验物料是否存在
    2. 记录流水 (Txn)
    3. 实时计算当前库存
    """
    # 1. 检查物料是否存在
    material = await db.get(Material, request.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="找不到该物料 (ID错误)")

    # 2. 创建流水记录
    new_txn = InventoryTxn(
        material_id=request.material_id,
        txn_type=request.txn_type,
        qty=request.qty,
        wo_id=request.wo_id
    )
    db.add(new_txn)
    
    # 3. 提交事务 (保存到数据库)
    await db.commit()
    await db.refresh(new_txn)

    # 4. 计算当前总库存 (核心修正部分)
    stmt = select(func.sum(
        case(
            (InventoryTxn.txn_type == 'OUT', -InventoryTxn.qty), 
            else_=InventoryTxn.qty                               
        )
    )).where(InventoryTxn.material_id == request.material_id)
    
    result = await db.execute(stmt)
    # 如果是第一次入库，result可能是None，所以要 or 0.0
    current_stock = result.scalar() or 0.0

    # 5. 返回结果
    return InventoryTxnResponse(
        id=new_txn.id,
        material_name=material.name,
        txn_type=new_txn.txn_type,
        qty=new_txn.qty,
        current_stock=current_stock,
        created_at=new_txn.created_at
    )

class MaterialCreate(BaseSchema):
    name: str
    spec: str = "默认规格"
    std_cost: float = 0.0

@router.post("/material", summary="[管理员] 创建新物料")
async def create_material(item: MaterialCreate, db: AsyncSession = Depends(get_db)):
    new_mat = Material(name=item.name, spec=item.spec, std_cost=item.std_cost)
    db.add(new_mat)
    await db.commit()
    await db.refresh(new_mat)
    return new_mat

# 定义返回给前端的数据结构
class InventoryStatusDTO(BaseModel):
    material_id: int
    name: str
    spec: str | None
    onhand: float

@router.get("/status", response_model=List[InventoryStatusDTO], summary="[BI] 实时库存查询")
async def get_inventory_status(db: AsyncSession = Depends(get_db)):
    """
    对应前端红色按钮“查库存”：
    使用 SQL 聚合计算：Sum(IN) + Sum(ADJ) - Sum(OUT)
    """
    # 1. 构造计算逻辑 (Case When)
    # 注意：这里使用和你上面 scan_material 一样的字符串判断逻辑
    qty_calc = case(
        (InventoryTxn.txn_type == 'IN', InventoryTxn.qty),
        (InventoryTxn.txn_type == 'ADJ', InventoryTxn.qty), 
        (InventoryTxn.txn_type == 'OUT', -InventoryTxn.qty),
        else_=0
    )

    # 2. 构造查询语句 (Select)
    # 逻辑：Material 表左连接 InventoryTxn 表，然后按物料分组求和
    stmt = (
        select(
            Material.id,
            Material.name,
            Material.spec,
            func.sum(qty_calc).label("onhand")
        )
        .outerjoin(InventoryTxn, Material.id == InventoryTxn.material_id)
        .group_by(Material.id, Material.name, Material.spec)
    )

    # 3. 执行异步查询
    result = await db.execute(stmt)
    rows = result.all()

    # 4. 格式化返回
    return [
        InventoryStatusDTO(
            material_id=row.id,
            name=row.name,
            spec=row.spec,
            # 如果没有交易记录，sum 结果可能是 None，转为 0.0
            onhand=float(row.onhand) if row.onhand is not None else 0.0
        )
        for row in rows
    ]