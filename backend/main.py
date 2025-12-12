from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from app.routers import inventory, projects , bom , work_orders, reports
from app.database import engine 
from app.models import Base

# 生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. 自动建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 数据库表结构已准备就绪！")
    
    # 2. 测试连接
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print("✅ 数据库连接成功！")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        
    yield
    await engine.dispose()

app = FastAPI(
    title="工厂管理系统 API",
    version="1.0.0",
    lifespan=lifespan
)

# --- CORS 配置 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源（比如 http://localhost:3000）
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法 (GET, POST, OPTIONS等)
    allow_headers=["*"],  # 允许所有 Header
)

# 注册路由
app.include_router(inventory.router)
app.include_router(projects.router)
app.include_router(bom.router)
app.include_router(work_orders.router)
app.include_router(reports.router)

@app.get("/")
async def root():
    return {"message": "系统运行正常", "status": "Running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}