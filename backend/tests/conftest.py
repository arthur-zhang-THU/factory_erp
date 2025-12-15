import pytest
import pytest_asyncio
from httpx import AsyncClient
from httpx._transports.asgi import ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import get_db
from app.models import Base
from main import app  # FastAPI app

# ----------------------------------------------------
# 1️⃣ 测试用数据库配置（SQLite 内存数据库）
# ----------------------------------------------------
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(TEST_DATABASE_URL, future=True, echo=False)
TestingSessionLocal = sessionmaker(
    bind=engine_test,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ----------------------------------------------------
# 2️⃣ 创建独立的测试 DB session fixture
# ----------------------------------------------------
@pytest_asyncio.fixture(scope="function")
async def db_session_test():
    """每个测试函数独立的 DB session"""
    async with engine_test.begin() as conn:
        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session
        # 测试结束后 rollback，保证干净
        await session.rollback()

    async with engine_test.begin() as conn:
        # 清空表（可选）
        await conn.run_sync(Base.metadata.drop_all)

# ----------------------------------------------------
# 3️⃣ FastAPI dependency override
# ----------------------------------------------------
@pytest_asyncio.fixture(scope="function", autouse=True)
async def override_get_db(db_session_test):
    """覆盖生产环境 get_db 依赖"""
    async def _override():
        yield db_session_test

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()

# ----------------------------------------------------
# 4️⃣ Async HTTP 客户端 fixture
# ----------------------------------------------------
@pytest_asyncio.fixture(scope="function")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
