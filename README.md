# 🏭 Factory ERP - 智能工厂生产管理系统

> 一个专为中小型离散制造（如广告加工、组装工厂）设计的全栈 ERP/MES 系统。
> 实现了从 **BOM设计** -> **缺料分析(MRP)** -> **生产执行(MES)** -> **成本核算(BI)** 的全流程闭环。

![Python](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

## 📺 系统演示 (Screenshots)

| **车间执行终端 (MES)** | **MRP 缺料分析** |
|:---:|:---:|
| <img src="docs/worker_terminal.png" alt="车间终端" width="400"/> | <img src="docs/mrp_analysis.png" alt="MRP计算" width="400"/> |
| *工人扫码领料、报工、登记次品* | *自动计算物料缺口，生成采购建议* |

| **BI 成本报表** | **生产工单管理** |
|:---:|:---:|
| <img src="docs/bi_report.png" alt="成本报表" width="400"/> | <img src="docs/work_orders.png" alt="工单管理" width="400"/> |
| *预估成本 vs 实际成本实时对比* | *拖拽排程、状态流转控制* |

---

## ✨ 核心功能 (Key Features)

### 1. 🏭 生产执行系统 (MES)
- **车间触屏终端**：专为平板/工控机设计的大按钮界面。
- **扫码作业**：支持扫码枪录入，实现极速领料 (OUT)、入库 (IN)。
- **工单流转**：状态机控制 (Planned -> In Progress -> Completed)。

### 2. 🛡️ 质量控制 (QC)
- **次品报废流程**：独立红色的次品登记入口 (SCRAP)。
- **逆向物流**：自动扣减库存并记录损耗原因，确保账实相符。

### 3. 🧠 智能大脑 (MRP & BI)
- **物料需求计划 (MRP)**：根据未完工单自动计算原料缺口，防止停工待料。
- **成本闭环分析**：自动对比 `BOM标准成本` 与 `实际领料成本`，精准定位生产浪费。

### 4. 📦 基础数据管理
- **BOM 管理**：多级物料清单设计，支持损耗率设置。
- **库存管理**：实时库存查询，支持多类型出入库记录。

---

## 🛠️ 技术栈 (Tech Stack)

- **前端 (Frontend)**: React 18, TypeScript, Vite, Ant Design (PC端), Tailwind CSS (移动端/车间端), Recharts (可视化).
- **后端 (Backend)**: Python 3.11, FastAPI, SQLAlchemy (Async), Pydantic.
- **数据库 (Database)**: PostgreSQL 15.
- **部署 (DevOps)**: Docker, Docker Compose, Windows Batch Scripts (一键启动).

---

## 🚀 快速开始 (Quick Start)

本项目采用 **Docker 全栈容器化** 部署，无需配置 Python/Node 环境，**开箱即用**。

### 1. 环境准备
- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) 并启动。
- 安装 Git。

### 2. 获取代码
```bash
git clone [https://github.com/YOUR_GITHUB_NAME/factory_erp.git](https://github.com/YOUR_GITHUB_NAME/factory_erp.git)
cd factory_erp