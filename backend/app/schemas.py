from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional
from datetime import datetime

# --- 基础配置 ---
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True) # 让 Pydantic 支持读取 ORM 模型

# --- 1. 物料扫描请求 (前端传来的数据) ---
class MaterialScanRequest(BaseSchema):
    material_id: int = Field(..., description="物料ID (扫码获取)")
    txn_type: Literal['IN', 'OUT', 'ADJ'] = Field(..., description="操作类型: IN=入库, OUT=领料, ADJ=盘点")
    qty: float = Field(..., gt=0, description="数量 (必须大于0)")
    wo_id: Optional[int] = Field(None, description="关联工单ID (如果是领料，最好带上)")

# --- 2. 响应数据 (返回给前端的数据) ---
class InventoryTxnResponse(BaseSchema):
    id: int
    material_name: str  # 我们会在接口里自动填入名字，方便前端显示
    txn_type: str
    qty: float
    current_stock: float # 计算后的当前库存
    created_at: datetime
    
# --- Project Schemas (项目相关) ---
from datetime import date
from typing import Optional, List

# 1. 创建项目时，前端需要传什么？
class ProjectCreate(BaseSchema):
    name: str
    customer_name: str
    sign_type: str = "灯箱"  # 默认值
    due_date: Optional[date] = None

# 2. 返回给前端时，数据长什么样？
class ProjectResponse(BaseSchema):
    id: int
    name: str
    customer_name: str | None
    sign_type: str | None
    due_date: date | None
    # 状态字段后面再加，先跑通基础的
    
# --- BOM Schemas (物料清单) ---

# 1. 往 BOM 里加料时，前端传什么？
class BOMItemCreate(BaseSchema):
    material_id: int
    qty_per: float  # 单个产品需要的数量
    scrap_rate: float = 0.0  # 损耗率 (例如 0.1 代表 10%)

# 2. 返回 BOM 列表时，数据长什么样？
# 我们需要把 material 的 name 也带出来，不然前端只显示 ID 没人看得懂
class BOMItemResponse(BaseSchema):
    id: int
    material_id: int
    material_name: str | None  # 方便前端显示
    material_spec: str | None
    material_std_cost: float | None # 方便前端算预估成本
    qty_per: float
    scrap_rate: float
    
# --- Work Order Schemas (生产工单) ---
from datetime import date
from enum import Enum

class WOStatus(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class WorkOrderCreate(BaseSchema):
    project_id: int
    qty: int = 1  # 计划生产数量
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None

class WorkOrderResponse(BaseSchema):
    id: int
    project_id: int
    project_name: str | None # 方便前端显示
    status: WOStatus
    qty: int | None          # 对应数据库里可能没有这个字段，如果模型没改，暂时忽略
    planned_start: date | None
    planned_end: date | None
