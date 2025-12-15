from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Any
from pydantic import BaseModel

from app.database import get_db

router = APIRouter(prefix="/templates", tags=["工序模板"])

# --- Schema ---
class TemplateCreate(BaseModel):
    name: str
    steps: List[Any] # 直接存前端发来的 JSON 数组

class TemplateResponse(TemplateCreate):
    id: int

# --- API ---

# 1. 获取所有模板
@router.get("/", response_model=List[TemplateResponse])
async def get_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT id, name, steps FROM process_templates ORDER BY id DESC"))
    return result.mappings().all()

# 2. 保存新模板
@router.post("/", response_model=TemplateResponse)
async def create_template(tpl: TemplateCreate, db: AsyncSession = Depends(get_db)):
    # 存入 JSONB 字段
    import json
    steps_json = json.dumps(tpl.steps)
    
    query = text("INSERT INTO process_templates (name, steps) VALUES (:name, :steps) RETURNING id")
    result = await db.execute(query, {"name": tpl.name, "steps": steps_json})
    await db.commit()
    
    new_id = result.scalar()
    return {**tpl.dict(), "id": new_id}

# 3. 删除模板
@router.delete("/{tpl_id}")
async def delete_template(tpl_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM process_templates WHERE id = :id"), {"id": tpl_id})
    await db.commit()
    return {"msg": "deleted"}