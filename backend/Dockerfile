# 使用官方轻量级 Python 镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 防止 Python 生成 .pyc 文件
ENV PYTHONDONTWRITEBYTECODE 1
# 也就是让控制台实时输出日志
ENV PYTHONUNBUFFERED 1

# 安装系统依赖 (编译 asyncpg 需要)
RUN apt-get update \
    && apt-get install -y gcc python3-dev \
    && apt-get clean

# 先复制依赖文件（利用 Docker 缓存加速构建）
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制其余代码
COPY . .