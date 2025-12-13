from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.models import InventoryTxn, Material
from app.schemas import MaterialScanRequest, InventoryTxnResponse, BaseSchema
from app.database import get_db
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/inventory", tags=["库存管理(Inventory)"])

# 引入 or_ 用于逻辑判断，或者直接用 in_
from sqlalchemy import or_

@router.post("/scan", response_model=InventoryTxnResponse, summary="工人扫码录入接口")
async def scan_material(
    request: MaterialScanRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    处理工人扫码：
    1. 校验物料是否存在
    2. 🛡️ [新增] 检查库存是否充足 (针对 OUT/SCRAP)
    3. 记录流水
    4. 实时计算当前库存
    """
    # 1. 检查物料是否存在
    material = await db.get(Material, request.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="找不到该物料 (ID错误)")

    # 2. 检查：如果是扣减操作，先算算够不够
    if request.txn_type in ['OUT', 'SCRAP']:
        # 先查询历史库存总和
        stmt_check = select(func.sum(
            case(
                # IN 和 ADJ(假设是盘盈) 为正，OUT 和 SCRAP 为负
                (InventoryTxn.txn_type.in_(['OUT', 'SCRAP']), -InventoryTxn.qty), 
                else_=InventoryTxn.qty
            )
        )).where(InventoryTxn.material_id == request.material_id)
        
        result_check = await db.execute(stmt_check)
        current_stock_before = result_check.scalar() or 0.0

        if current_stock_before < request.qty:
            op_name = "领料" if request.txn_type == 'OUT' else "报废"
            raise HTTPException(status_code=400, detail=f"库存不足！当前只有 {current_stock_before}，无法{op_name} {request.qty}")

    # 3. 创建流水记录
    new_txn = InventoryTxn(
        material_id=request.material_id,
        txn_type=request.txn_type,
        qty=request.qty,
        wo_id=request.wo_id
    )
    db.add(new_txn)
    
    # 4. 提交事务
    await db.commit()
    await db.refresh(new_txn)

    # 5. 计算当前总库存 (核心修正部分)
    # 逻辑更新：OUT 和 SCRAP 都是负数
    stmt = select(func.sum(
        case(
            # ✅ 修复点：只要是 OUT 或者 SCRAP，都要乘 -1
            (InventoryTxn.txn_type.in_(['OUT', 'SCRAP']), -InventoryTxn.qty), 
            else_=InventoryTxn.qty                                
        )
    )).where(InventoryTxn.material_id == request.material_id)
    
    result = await db.execute(stmt)
    current_stock = result.scalar() or 0.0

    # 6. 返回结果
    return InventoryTxnResponse(
        id=new_txn.id,
        material_id=new_txn.material_id, 
        material_name=material.name,
        txn_type=new_txn.txn_type,
        qty=new_txn.qty,
        wo_id=new_txn.wo_id,
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

# 引入需要的库
from sqlalchemy import case, func, select

@router.get("/status", response_model=List[InventoryStatusDTO], summary="[BI] 实时库存查询")
async def get_inventory_status(db: AsyncSession = Depends(get_db)):
    """
    对应前端红色按钮“查库存”：
    使用 SQL 聚合计算：Sum(IN) + Sum(ADJ) - Sum(OUT) - Sum(SCRAP)
    """
    # 1. 构造计算逻辑 (Case When)
    # ✅ 修复点：增加了 SCRAP 的判断，并且它是负数（扣减）
    qty_calc = case(
        (InventoryTxn.txn_type == 'IN', InventoryTxn.qty),
        (InventoryTxn.txn_type == 'ADJ', InventoryTxn.qty), 
        (InventoryTxn.txn_type == 'OUT', -InventoryTxn.qty),
        (InventoryTxn.txn_type == 'SCRAP', -InventoryTxn.qty), # <--- 这一行必须加！
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