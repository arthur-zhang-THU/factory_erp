from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os  # ✅ 新增：引入操作系统接口
from fastapi import Depends, HTTPException, status 
from fastapi.security import OAuth2PasswordBearer

# 生产环境应该把这个放在环境变量里
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
SECRET_KEY = os.getenv("SECRET_KEY", "FACTORY_ERP_SECRET_KEY_CHANGE_ME")
ALGORITHM = "HS256"

# Token 有效期 (默认 1440 分钟 = 24 小时)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """验证密码是否正确"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """加密密码"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """生成 JWT Token (发手环)"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception):
    """验证 JWT Token 并返回 payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


# 假设你的 User 模型定义在 app/models.py
from app.models import User # ✅ 确保你从 models 中导入了 User
from app.database import get_db # ✅ 确保你从 database 中导入了 get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """依赖：验证 Token 并从数据库中获取用户对象"""
    
    # 凭证无效时的异常定义
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. 验证 Token 并获取 Payload (包含 username)
    payload = verify_token(token, credentials_exception)
    username = payload.get("sub")
    
    # 2. 从数据库中获取用户
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """获取当前已登录且活跃的用户 (你所有受保护接口都应该用这个)"""
    # 如果有 is_active 字段，可以在这里检查 user.is_active == False
    # 但目前我们直接返回 user
    return current_user