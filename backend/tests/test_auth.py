import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User
from app.security import get_password_hash
import pytest_asyncio

# ----------------------------------------------------
# Fixture: 创建测试用户
# ----------------------------------------------------
TEST_PASSWORD = "shortpass"

@pytest_asyncio.fixture(scope="function")
async def create_test_admin(db_session_test: AsyncSession):
    """在每次测试前创建一个 Admin 用户"""

    test_admin = User(
        username="test_admin",
        hashed_password=get_password_hash(TEST_PASSWORD),
        role="ADMIN"
    )
    db_session_test.add(test_admin)
    await db_session_test.commit()
    await db_session_test.refresh(test_admin)
    return test_admin

# ----------------------------------------------------
# Fixture: 获取测试用户的 Token
# ----------------------------------------------------

@pytest_asyncio.fixture(scope="function")
async def admin_token(client: AsyncClient, create_test_admin: User):
    response = await client.post(
        "/auth/token",
        data={
            "grant_type": "password",
            "username": "test_admin",
            "password": TEST_PASSWORD,
            "scope": ""          # ⭐ 显式给 scope（保险）
        },
        headers={
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )

    print("ADMIN TOKEN RESPONSE:", response.status_code, response.text)

    assert response.status_code == 200
    return response.json()["access_token"]


# ----------------------------------------------------
# 认证路由测试
# ----------------------------------------------------

# 1. 测试登录失败 (错误的密码)
@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    response = await client.post(
    "/auth/token",
    data={
        "grant_type": "password",
        "username": "nonexistent_user",
        "password": "wrong_password",
        "scope": ""
    },
    headers={
        "Content-Type": "application/x-www-form-urlencoded"
    }
)


# 2. 测试获取用户列表 (未授权访问)
@pytest.mark.asyncio
async def test_get_users_unauthorized(client: AsyncClient):
    # 没带 Token 访问受保护的 /users 接口
    response = await client.get("/auth/users")
    
    # 期望收到 401 (未授权)
    # 你的 auth.py 已经修正，FastAPI 会在调用 get_current_active_user 时拦截
    assert response.status_code == 401


# 3. 测试获取用户列表 (授权访问)
@pytest.mark.asyncio
async def test_get_users_authorized(client: AsyncClient, admin_token: str):
    # 带上 Token 访问
    response = await client.get(
        "/auth/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # 期望成功，返回 200
    assert response.status_code == 200
    
    # 期望返回一个用户 (就是我们上面创建的 test_admin)
    users = response.json()
    assert len(users) == 1
    assert users[0]["username"] == "test_admin"