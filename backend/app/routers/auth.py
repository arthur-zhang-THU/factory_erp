from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserResponse, Token
from app.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(tags=["认证 (Auth)"])

# 1. 注册 (创建新用户) - 实际系统中这个接口应该只有管理员能调
@router.post("/auth/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # 查重
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalar():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 创建用户
    new_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password), # 🔐 加密存储
        role=user_in.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

# 2. 登录 (换取 Token)
@router.post("/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
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
        data={"sub": user.username, "role": user.role}, # 把角色也塞进 Token
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}