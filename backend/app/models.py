# backend/app/models.py

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, DateTime, Enum, Text
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import enum

# 1. 定义基类 (Base Model)
class Base(DeclarativeBase):
    pass

# --- 枚举类型 (对应你文档里的 ENUM) ---
class TxnType(str, enum.Enum):
    IN = "IN"   # 入库
    OUT = "OUT" # 出库 (领料)
    ADJ = "ADJ" # 盘点调整

class WOStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

# --- 2. 核心实体表 ---

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False, comment="项目名称")
    customer_name = Column(String(100), comment="客户名称 (简化版，暂不关联客户表)")
    sign_type = Column(String(40), comment="招牌类型，如：灯箱")
    due_date = Column(Date, comment="交付日期")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关联关系
    work_orders = relationship("WorkOrder", back_populates="project")
    bom_header = relationship("BOMHeader", back_populates="project", uselist=False)

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(Enum(WOStatus), default=WOStatus.PLANNED)
    planned_start = Column(Date)
    planned_end = Column(Date)
    
    # 关联关系
    project = relationship("Project", back_populates="work_orders")
    routing_steps = relationship("RoutingStep", back_populates="work_order")
    inventory_txns = relationship("InventoryTxn", back_populates="work_order")

class RoutingStep(Base):
    """工艺路线：比如 CNC -> 吸塑 -> 喷漆"""
    __tablename__ = "routing_steps"

    id = Column(Integer, primary_key=True, index=True)
    wo_id = Column(Integer, ForeignKey("work_orders.id"))
    seq_no = Column(Integer, nullable=False, comment="工序顺序: 1, 2, 3")
    process_name = Column(String(50), nullable=False, comment="工序名称: CNC, PAINT")
    workcenter = Column(String(50), comment="工作中心")
    std_minutes = Column(Integer, comment="标准工时")

    work_order = relationship("WorkOrder", back_populates="routing_steps")

class Material(Base):
    """物料主数据"""
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    spec = Column(String(100), comment="规格: 1220x2440")
    uom = Column(String(20), default="PCS", comment="单位")
    std_cost = Column(Numeric(10, 2), default=0.00, comment="标准成本")

    # 关联
    inventory_txns = relationship("InventoryTxn", back_populates="material")
    bom_items = relationship("BOMItem", back_populates="material")

class InventoryTxn(Base):
    """库存流水账 (核心表：用来生成报表)"""
    __tablename__ = "inventory_txns"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    wo_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True, comment="关联工单(如果是领料)")
    
    txn_type = Column(Enum(TxnType), nullable=False, comment="IN/OUT/ADJ")
    qty = Column(Numeric(10, 3), nullable=False, comment="变动数量")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关联
    material = relationship("Material", back_populates="inventory_txns")
    work_order = relationship("WorkOrder", back_populates="inventory_txns")

# --- BOM (物料清单) ---
class BOMHeader(Base):
    __tablename__ = "bom_headers"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    version_no = Column(Integer, default=1, comment="BOM版本控制")
    
    project = relationship("Project", back_populates="bom_header")
    items = relationship("BOMItem", back_populates="header")

class BOMItem(Base):
    __tablename__ = "bom_items"
    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("bom_headers.id"))
    material_id = Column(Integer, ForeignKey("materials.id"))
    qty_per = Column(Numeric(10, 3), comment="单件用量")
    scrap_rate = Column(Numeric(5, 2), default=0.00, comment="损耗率%")

    header = relationship("BOMHeader", back_populates="items")
    material = relationship("Material", back_populates="bom_items")