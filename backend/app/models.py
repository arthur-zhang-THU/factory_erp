# backend/app/models.py

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, DateTime, Enum as SAEnum, Text
from sqlalchemy.orm import relationship, DeclarativeBase, backref
from sqlalchemy.sql import func
import enum

# 1. Base Model
class Base(DeclarativeBase):
    pass

# --- Enums (Python Standard Library) ---
# FIX: All these must inherit from "enum.Enum", NOT SQLAlchemy's Enum
class TxnType(str, enum.Enum):
    IN = "IN"   # 入库
    OUT = "OUT" # 出库 (领料)
    ADJ = "ADJ" # 盘点调整
    SCRAP = "SCRAP" # 报废

class WOStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    
class WOType(str, enum.Enum):
    STANDARD = "STANDARD" # 普通工单
    REWORK = "REWORK"     # 返工工单

# --- 2. Core Tables ---

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False, comment="项目名称")
    customer_name = Column(String(100), comment="客户名称")
    sign_type = Column(String(40), comment="招牌类型")
    due_date = Column(Date, comment="交付日期")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    work_orders = relationship("WorkOrder", back_populates="project")
    bom_header = relationship("BOMHeader", back_populates="project", uselist=False)

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # FIX: Use SAEnum (SQLAlchemy Enum) for the column type
    status = Column(SAEnum(WOStatus), default=WOStatus.PLANNED)
    
    # FIX: Use SAEnum and provide a name to avoid conflicts
    wo_type = Column(SAEnum(WOType, name='wo_type_enum'), default=WOType.STANDARD)
    
    parent_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    
    qty = Column(Integer, default=1) 

    planned_start = Column(Date)
    planned_end = Column(Date)
    
    # Relationships
    project = relationship("Project", back_populates="work_orders")
    routing_steps = relationship("RoutingStep", back_populates="work_order")
    inventory_txns = relationship("InventoryTxn", back_populates="work_order")
    
    # Self-referential relationship for Rework (Parent -> Children)
    children = relationship("WorkOrder", backref=backref('parent', remote_side=[id]))

class RoutingStep(Base):
    __tablename__ = "routing_steps"

    id = Column(Integer, primary_key=True, index=True)
    wo_id = Column(Integer, ForeignKey("work_orders.id"))
    seq_no = Column(Integer, nullable=False, comment="工序顺序")
    process_name = Column(String(50), nullable=False, comment="工序名称")
    workcenter = Column(String(50), comment="工作中心")
    std_minutes = Column(Integer, comment="标准工时")

    work_order = relationship("WorkOrder", back_populates="routing_steps")

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    spec = Column(String(100), comment="规格")
    uom = Column(String(20), default="PCS", comment="单位")
    std_cost = Column(Numeric(10, 2), default=0.00, comment="标准成本")

    # Relationships
    inventory_txns = relationship("InventoryTxn", back_populates="material")
    bom_items = relationship("BOMItem", back_populates="material")

class InventoryTxn(Base):
    __tablename__ = "inventory_txns"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    wo_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    
    # FIX: Use SAEnum
    txn_type = Column(SAEnum(TxnType), nullable=False)
    qty = Column(Numeric(10, 3), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    material = relationship("Material", back_populates="inventory_txns")
    work_order = relationship("WorkOrder", back_populates="inventory_txns")

# --- BOM ---
class BOMHeader(Base):
    __tablename__ = "bom_headers"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    version_no = Column(Integer, default=1)
    
    project = relationship("Project", back_populates="bom_header")
    items = relationship("BOMItem", back_populates="header")

class BOMItem(Base):
    __tablename__ = "bom_items"
    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("bom_headers.id"))
    material_id = Column(Integer, ForeignKey("materials.id"))
    qty_per = Column(Numeric(10, 3))
    scrap_rate = Column(Numeric(5, 2), default=0.00)

    header = relationship("BOMHeader", back_populates="items")
    material = relationship("Material", back_populates="bom_items")
    
# --- 财务模块 ---

class FinanceAccount(Base):
    """资金账户：比如 '对公账户', '老板微信', '现金'"""
    __tablename__ = "finance_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True, comment="账户名称")
    balance = Column(Numeric(12, 2), default=0.00, comment="当前余额")
    
    # Relationships
    transactions = relationship("FinanceTransaction", back_populates="account")

# Define Enums using Python's standard library
class TransactionType(str, enum.Enum):
    INCOME = "INCOME"   # 收入 (收款)
    EXPENSE = "EXPENSE" # 支出 (付款)
    TRANSFER = "TRANSFER" # 转账

class FinanceCategory(str, enum.Enum):
    # Income
    SALES = "SALES"           # 销售回款
    OTHER_IN = "OTHER_IN"     # 其他收入
    # Expense
    PROCUREMENT = "PROCUREMENT" # 采购原材料
    SALARY = "SALARY"         # 工资
    RENT = "RENT"             # 房租水电
    LOGISTICS = "LOGISTICS"   # 物流运费
    MEALS = "MEALS"           # 伙食费/招待
    OTHER_OUT = "OTHER_OUT"   # 其他支出

class FinanceTransaction(Base):
    """财务流水表"""
    __tablename__ = "finance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("finance_accounts.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, comment="关联项目(可选)")
    
    # ✅ FIX: Use SAEnum here instead of Enum
    txn_type = Column(SAEnum(TransactionType), nullable=False)
    category = Column(SAEnum(FinanceCategory), nullable=False)
    
    amount = Column(Numeric(12, 2), nullable=False, comment="金额")
    description = Column(String(200), comment="备注说明")
    txn_date = Column(Date, nullable=False, comment="发生日期")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account = relationship("FinanceAccount", back_populates="transactions")
    project = relationship("Project") # Unidirectional is fine