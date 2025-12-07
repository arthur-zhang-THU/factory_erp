from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import BOMHeader, BOMItem, Material
from app.schemas import BOMItemCreate, BOMItemResponse

router = APIRouter(
    prefix="/bom",
    tags=["工程设计 (BOM)"]
)

# 1. 获取某项目的 BOM 清单 (GET /bom/{project_id})
@router.get("/{project_id}", response_model=List[BOMItemResponse])
async def get_project_bom(project_id: int, db: AsyncSession = Depends(get_db)):
    # A. 先找有没有 BOM Header
    stmt = select(BOMHeader).where(BOMHeader.project_id == project_id)
    result = await db.execute(stmt)
    header = result.scalar()

    # B. 如果没有，自动创建一个 (Auto-create)
    if not header:
        header = BOMHeader(project_id=project_id, version_no=1)
        db.add(header)
        await db.commit()
        await db.refresh(header)
        return [] # 新建的肯定是空的

    # C. 如果有，查询下面的 Items，并关联 Material 表拿名字
    # 使用 selectinload 预加载关联数据
    stmt_items = (
        select(BOMItem)
        .options(selectinload(BOMItem.material)) 
        .where(BOMItem.bom_id == header.id)
    )
    result_items = await db.execute(stmt_items)
    items = result_items.scalars().all()

    # D. 拼装返回数据
    return [
        BOMItemResponse(
            id=item.id,
            material_id=item.material_id,
            material_name=item.material.name if item.material else "未知物料",
            material_spec=item.material.spec if item.material else "",
            material_std_cost=float(item.material.std_cost) if item.material else 0.0,
            qty_per=float(item.qty_per),
            scrap_rate=float(item.scrap_rate)
        )
        for item in items
    ]

# 2. 往项目里添加物料 (POST /bom/{project_id}/items)
@router.post("/{project_id}/items", response_model=BOMItemResponse)
async def add_bom_item(
    project_id: int, 
    item_in: BOMItemCreate, 
    db: AsyncSession = Depends(get_db)
):
    # A. 确保 Header 存在
    stmt = select(BOMHeader).where(BOMHeader.project_id == project_id)
    result = await db.execute(stmt)
    header = result.scalar()
    if not header:
        # 理论上 GET 接口会创建，但为了保险再写一次
        header = BOMHeader(project_id=project_id)
        db.add(header)
        await db.commit()
        await db.refresh(header)

    # B. 创建 Item
    new_item = BOMItem(
        bom_id=header.id,
        material_id=item_in.material_id,
        qty_per=item_in.qty_per,
        scrap_rate=item_in.scrap_rate
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    # C. 为了返回 Material 名字，我们需要重新查一下这个 Item
    # 或者简单点，再查一次库
    stmt_reload = select(BOMItem).options(selectinload(BOMItem.material)).where(BOMItem.id == new_item.id)
    reloaded_item = (await db.execute(stmt_reload)).scalar()

    return BOMItemResponse(
        id=reloaded_item.id,
        material_id=reloaded_item.material_id,
        material_name=reloaded_item.material.name,
        material_spec=reloaded_item.material.spec,
        material_std_cost=float(reloaded_item.material.std_cost),
        qty_per=float(reloaded_item.qty_per),
        scrap_rate=float(reloaded_item.scrap_rate)
    )

# 3. 删除 BOM 行 (DELETE /bom/items/{item_id})
@router.delete("/items/{item_id}")
async def delete_bom_item(item_id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(BOMItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.delete(item)
    await db.commit()
    return {"message": "Deleted"}