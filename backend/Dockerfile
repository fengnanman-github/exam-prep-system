# 后端Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 创建健康检查文件
RUN echo '{"status":"ok","timestamp":"'$(date -Iseconds)'"}' > health.json

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]