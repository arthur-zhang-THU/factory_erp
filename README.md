# 🏭 Factory ERP (轻量级工厂管理系统)

这是一个基于 **FastAPI (后端)** 和 **React (前端)** 开发的现代化工厂 ERP 系统。
专为中小型制造企业设计，涵盖了从**项目接单、BOM设计、生产排程、质量控制(QC)** 到 **财务核算** 的全流程闭环管理。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-blue)
![Docker](https://img.shields.io/badge/docker-compose-green)

## ✨ 核心功能 (Core Features)

### 1. 🛠 生产管理 (Manufacturing)
- **工单管理 (WO):** 支持标准工单创建、状态流转 (待开工 -> 进行中 -> 完工)。
- **质量控制 (QC):**
  - **返工 (Rework):** 支持对次品生成关联的子工单，自动追溯来源。
  - **报废 (Scrap):** 一键登记次品，自动扣减库存并计入损耗成本。
- **工艺路线:** 自动生成生产步骤 (CNC -> 打印 -> 组装 -> QC)。

### 2. 💰 财务资金 (Finance) [NEW]
- **资金看板:** 实时查看企业总资产、各账户余额。
- **收支流水:** 支持记录收入/支出，可关联具体项目。
- **项目核算:** 自动统计每个项目的资金流，计算项目真实利润。

### 3. 📦 库存与供应链 (Inventory)
- **物料管理:** 基础物料库、规格型号、标准成本。
- **扫码作业:** 极简的移动端界面，支持 入库 / 领料 / 盘点。
- **实时库存:** 每一笔流水自动更新库存数量。

### 4. 🚀 项目与工程 (Engineering)
- **项目管理:** 客户信息、交付日期、招牌类型管理。
- **BOM (物料清单):** 支持多级 BOM 结构，自动计算理论用量。
- **MRP (物料需求计划):** 根据订单自动计算缺料情况 (开发中)。

---

## 🏗 技术栈 (Tech Stack)

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **Backend** | Python 3.11, FastAPI | 高性能异步 API 框架 |
| **Database** | PostgreSQL, SQLAlchemy (Async) | 稳定可靠的关系型数据库 |
| **Frontend** | React 18, TailwindCSS | 现代化、响应式的用户界面 |
| **Icons** | Lucide React | 精美的 SVG 图标库 |
| **Deploy** | Docker, Docker Compose | 一键容器化部署 |

---

## 🚀 快速开始 (Quick Start)

### 前置要求
确保你的电脑已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)。

### 1. 启动服务
在项目根目录下运行：

```bash
docker-compose up -d --build