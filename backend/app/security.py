from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os  # ✅ 新增：引入操作系统接口

# ⚠️ 生产环境应该把这个放在环境变量里
# ✅ 修改：优先从环境变量读取，读不到才用默认值
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