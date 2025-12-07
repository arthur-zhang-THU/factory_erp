from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from pydantic_settings import BaseSettings
from typing import AsyncGenerator

# 1. 配置读取
class Settings(BaseSettings):
    DATABASE_URL: str
    class Config:
        env_file = ".env"

settings = Settings()

# 2. 数据库引擎
engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# 3. 模型基类 (把 models.py 里的 Base 也可以统一归口到这里，但为了少改动，这里先只放依赖)
# 暂时不动 Base，只放 Session 相关

# 4. 获取数据库会话的依赖函数 (Dependency)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session