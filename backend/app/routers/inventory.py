from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
# ✅ 1. 务必引入 cast 和 String
from sqlalchemy import select, update, delete, func, case, and_, cast, String

# 引入 User, BOMItem 模型和安全依赖
from app.database import get_db
from app.models import InventoryTxn, Material, User, BOMItem 
from app.schemas import (
    MaterialScanRequest, 
    InventoryTxnResponse, 
    MaterialCreate,
    MaterialUpdate,      
    MaterialDetailsDTO   
)
from app.security import get_current_active_user 

router = APIRouter(
    prefix="/inventory", 
    tags=["库存管理"]
)

# ----------------------------------------------------------------------
# 辅助函数：计算实时库存
# ----------------------------------------------------------------------

async def calculate_current_stock(db: AsyncSession, material_id: int) -> float:
    """根据交易记录计算某个物料的实时库存量。"""
    
    # ✅ 2. 核心修复：使用 cast(..., String) 强制转为字符串对比，防止 500 错误
    qty_calc = case(
        (cast(InventoryTxn.txn_type, String).in_(['IN', 'ADJ', 'REWORK']), InventoryTxn.qty),
        (cast(InventoryTxn.txn_type, String).in_(['OUT', 'SCRAP']), -InventoryTxn.qty),
        else_=0
    )
    
    stmt_stock = select(func.sum(qty_calc)).where(InventoryTxn.material_id == material_id)
    result_stock = await db.execute(stmt_stock)
    
    total = result_stock.scalar()
    return total if total is not None else 0.0

# ----------------------------------------------------------------------
# 物料主数据 (Material Master Data) CRUD
# ----------------------------------------------------------------------

# 1. 创建物料 (Create)
@router.post(
    "/material", 
    response_model=MaterialDetailsDTO, 
    status_code=status.HTTP_201_CREATED, 
    summary="[认证] 创建新物料"
)
async def create_material(
    item: MaterialCreate, 
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)] 
):
    new_material = Material(**item.model_dump())
    db.add(new_material)
    await db.commit()
    await db.refresh(new_material)
    
    return MaterialDetailsDTO(
        id=new_material.id,
        name=new_material.name,
        spec=new_material.spec,
        std_cost=new_material.std_cost,
        current_stock=0.0
    )

# 2. 获取单个物料详情 (Read One)
@router.get(
    "/material/{material_id}", 
    response_model=MaterialDetailsDTO, 
    summary="[认证] 获取单个物料详情（含实时库存）"
)
async def get_material_by_id(
    material_id: int, 
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)] 
):
    material = await db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="找不到该物料")

    current_stock = await calculate_current_stock(db, material_id)
    
    return MaterialDetailsDTO(
        id=material.id,
        name=material.name,
        spec=material.spec,
        std_cost=material.std_cost,
        current_stock=current_stock
    )

# 3. 修改物料信息 (Update)
@router.put(
    "/material/{material_id}", 
    response_model=MaterialDetailsDTO, 
    summary="[认证] 修改物料信息"
)
async def update_material(
    material_id: int, 
    item: MaterialUpdate, 
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)] 
):
    material = await db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="找不到该物料")

    update_data = item.model_dump(exclude_unset=True) 
    
    if not update_data:
        raise HTTPException(status_code=400, detail="未提供任何更新数据")

    stmt = update(Material).where(Material.id == material_id).values(**update_data)
    await db.execute(stmt)
    await db.commit()
    await db.refresh(material) 

    current_stock = await calculate_current_stock(db, material_id)
    
    return MaterialDetailsDTO(
        id=material.id,
        name=material.name,
        spec=material.spec,
        std_cost=material.std_cost,
        current_stock=current_stock
    )

# 4. 删除物料 (Delete)
@router.delete(
    "/material/{material_id}", 
    status_code=status.HTTP_204_NO_CONTENT, 
    summary="[认证] 删除物料"
)
async def delete_material(
    material_id: int, 
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)] 
):
    # 1. 检查是否有库存交易记录关联
    txn_count = await db.scalar(
        select(func.count()).select_from(InventoryTxn).where(InventoryTxn.material_id == material_id)
    )
    if txn_count and txn_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"物料ID {material_id} 存在 {txn_count} 条库存交易记录，禁止删除。"
        )

    # 2. 检查是否有 BOM 关联
    bom_count = await db.scalar(
        select(func.count()).select_from(BOMItem).where(BOMItem.material_id == material_id)
    )
    if bom_count and bom_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"物料ID {material_id} 被 {bom_count} 个 BOM 所引用，禁止删除。"
        )
        
    # 3. 执行删除
    stmt = delete(Material).where(Material.id == material_id)
    result = await db.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="找不到该物料")
        
    await db.commit()

# 5. 获取所有物料 (Read All)
@router.get(
    "/material", 
    response_model=List[MaterialDetailsDTO], 
    summary="[认证] 获取所有物料列表（含实时库存）"
)
async def get_all_materials(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)] 
):
    stmt = select(Material)
    result = await db.execute(stmt)
    materials = result.scalars().all()

    response_list = []
    for material in materials:
        current_stock = await calculate_current_stock(db, material.id)
        response_list.append(MaterialDetailsDTO(
            id=material.id,
            name=material.name,
            spec=material.spec,
            std_cost=material.std_cost,
            current_stock=current_stock
        ))
        
    return response_list


# ----------------------------------------------------------------------
# 库存交易 (Inventory Transactions)
# ----------------------------------------------------------------------

# 6. 物料扫码交易 (Scan)
@router.post(
    "/scan", 
    response_model=InventoryTxnResponse, 
    summary="[认证] 执行物料 IN/OUT/ADJ/SCRAP/REWORK 扫码交易"
)
async def scan_material(
    request: MaterialScanRequest, 
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)] 
):
    
    # 1. 检查物料是否存在
    material = await db.get(Material, request.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="找不到该物料 (ID错误)")

    # 2. 检查：如果是扣减操作，先算算够不够
    if request.txn_type in ['OUT', 'SCRAP']:
        # 先查询历史库存总和
        stmt_check = select(func.sum(
            case(
                # ✅ 3. 这里的检查逻辑也要加上 cast 防止报错
                (cast(InventoryTxn.txn_type, String).in_(['OUT', 'SCRAP']), -InventoryTxn.qty), 
                (cast(InventoryTxn.txn_type, String).in_(['IN', 'ADJ', 'REWORK']), InventoryTxn.qty),
                else_=0
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
        wo_id=request.wo_id,
        user_id=current_user.id 
    )
    db.add(new_txn)
    
    # 4. 提交事务
    await db.commit()
    await db.refresh(new_txn)

    # 5. 计算当前总库存
    current_stock = await calculate_current_stock(db, request.material_id)

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

# 7. 实时库存查询 (Status)
@router.get(
    "/status", 
    response_model=List[MaterialDetailsDTO], 
    summary="[认证] 查询所有物料的实时库存状态"
)
async def get_inventory_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)] 
):
    return await get_all_materials(db, current_user)