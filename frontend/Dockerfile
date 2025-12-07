FROM node:18-alpine

WORKDIR /app

# 1. 复制依赖定义
COPY package.json .

# 2. 【关键修复】设置 npm 国内淘宝镜像源，解决安装超时/报错问题
RUN npm config set registry https://registry.npmmirror.com

# 3. 安装依赖 (此时会飞快)
RUN npm install

# 4. 复制源代码
COPY . .

# 5. 暴露端口
EXPOSE 3000

# 6. 启动开发服务器
CMD ["npm", "run", "dev", "--", "--host"]