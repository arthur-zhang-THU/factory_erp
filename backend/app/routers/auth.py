from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from typing import List
from datetime import timedelta

from app.database import get_db
from app.models import User, WorkOrderStep
from app.schemas import UserCreate, UserLogin, UserResponse, Token
from app.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

# ✅ 使用 prefix="/auth"，这样下面的路径都不用重复写 /auth 了
router = APIRouter(prefix="/auth", tags=["认证管理 (Auth)"])

# 1. 注册 (创建新用户)
@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # 查重
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalar():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 创建用户
    new_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role # ✅ 写入角色
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

# 2. 登录 (换取 Token)
# 用 UserCreate 接收 JSON，适配前端 axios 请求
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: UserLogin, db: AsyncSession = Depends(get_db)):
    # 查用户
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar()
    
    # 验证密码
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 生成 Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

# 3. 🆕 获取用户列表 (前端 UserManager 需要)
@router.get("/users", response_model=List[UserResponse])
async def read_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    # 按 ID 排序
    result = await db.execute(select(User).order_by(User.id).offset(skip).limit(limit))
    return result.scalars().all()

# 4. 🆕 删除用户 (前端 UserManager 需要)
@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 防止删除唯一的 ADMIN
    if user.role == "ADMIN":
        # 简单判断：如果是 ADMIN，先看看还有没有别的 ADMIN
        result = await db.execute(select(User).where(User.role == "ADMIN"))
        admins = result.scalars().all()
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="不能删除最后一个管理员")

    # 先把该用户指派的任务全部变成“未指派 (NULL)”
    # 这样就不会触发外键报错了
    await db.execute(
        update(WorkOrderStep)
        .where(WorkOrderStep.assigned_to == user_id)
        .values(assigned_to=None)
    )

    await db.delete(user)
    await db.commit()
    return {"msg": "用户已删除"}