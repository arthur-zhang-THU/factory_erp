from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional, List
from datetime import datetime, date
from enum import Enum

# --- 基础配置 ---
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True) 

# --- 1. 物料扫描请求 (关键修复) ---
class MaterialScanRequest(BaseSchema):
    material_id: int = Field(..., description="物料ID")
    # ✅ 修复点：这里补上了 'SCRAP'
    txn_type: Literal['IN', 'OUT', 'ADJ', 'SCRAP', 'REWORK'] = Field(..., description="操作类型")
    qty: float = Field(..., gt=0, description="数量")
    wo_id: Optional[int] = Field(None, description="关联工单ID")

# --- 2. 响应数据 ---
class InventoryTxnResponse(BaseSchema):
    id: int
    material_id: int | None = None
    material_name: str | None = None   
    txn_type: str
    qty: float
    wo_id: int | None = None
    current_stock: float | None = None 
    created_at: datetime

# --- Project Schemas ---
class ProjectCreate(BaseSchema):
    name: str
    customer_name: str
    sign_type: str = "灯箱"
    due_date: Optional[date] = None

class ProjectResponse(BaseSchema):
    id: int
    name: str
    customer_name: str | None
    sign_type: str | None
    due_date: date | None

# --- BOM Schemas ---
class BOMItemCreate(BaseSchema):
    material_id: int
    qty_per: float
    scrap_rate: float = 0.0

class BOMItemResponse(BaseSchema):
    id: int
    material_id: int
    material_name: str | None
    material_spec: str | None
    material_std_cost: float | None
    qty_per: float
    scrap_rate: float

# --- Work Order Schemas ---
class WOStatus(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class WorkOrderCreate(BaseSchema):
    project_id: int
    qty: int = 1
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None

class WorkOrderResponse(BaseSchema):
    id: int
    project_id: int
    project_name: str | None
    status: WOStatus   
    wo_type: str = "STANDARD"  # 告诉前端这是普通单还是返工单
    parent_id: int | None = None # 如果是返工单，显示它的父级ID
    qty: int = 1 
    planned_start: date | None
    planned_end: date | None
    
# --- Finance Schemas ---

class FinanceAccountCreate(BaseSchema):
    name: str
    initial_balance: float = 0.0

class FinanceAccountResponse(BaseSchema):
    id: int
    name: str
    balance: float

class TransactionCreate(BaseSchema):
    account_id: int
    project_id: int | None = None
    txn_type: Literal['INCOME', 'EXPENSE']
    category: str 
    amount: float
    description: str | None = None
    txn_date: date

class TransactionResponse(BaseSchema):
    id: int
    account_name: str # 返回账户名，方便显示
    project_name: str | None
    txn_type: str
    category: str
    amount: float
    description: str | None
    txn_date: date