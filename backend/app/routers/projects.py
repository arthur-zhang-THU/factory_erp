from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.database import get_db
from app.models import Project
from app.schemas import ProjectCreate, ProjectResponse

router = APIRouter(
    prefix="/projects",
    tags=["项目管理 (Projects)"]
)

# 1. 获取所有项目列表 (GET /projects)
@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    # 异步查询：按创建时间倒序排列（最新的在最上面）
    stmt = select(Project).order_by(desc(Project.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    projects = result.scalars().all()
    return projects

# 2. 创建新项目 (POST /projects)
@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate, 
    db: AsyncSession = Depends(get_db)
):
    # 创建数据库模型实例
    new_project = Project(
        name=project.name,
        customer_name=project.customer_name,
        sign_type=project.sign_type,
        due_date=project.due_date
    )
    
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project

# 3. 删除项目 (DELETE /projects/{id}) - 方便调试用
@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully"}