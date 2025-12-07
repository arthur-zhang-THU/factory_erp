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