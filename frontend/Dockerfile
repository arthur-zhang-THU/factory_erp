# ⚠️ 这里必须是 FROM 开头，不能是 version 开头
FROM node:18-alpine

WORKDIR /app

# 1. 复制依赖定义
COPY package.json .

# 2. 设置国内镜像源
RUN npm config set registry https://registry.npmmirror.com

# 3. 安装依赖
RUN npm install

# 4. 复制源代码
COPY . .

# 5. 暴露端口
EXPOSE 3000

# 6. 启动命令
CMD ["npm", "run", "dev", "--", "--host"]