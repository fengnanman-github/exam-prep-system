# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件（利用Docker层缓存）
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production=false

# 复制源代码（.dockerignore会排除dist和node_modules）
COPY . .

# 构建参数 - 用于破坏缓存
ARG BUILD_TIMESTAMP
ARG BUILD_VERSION=unknown

# 将构建信息写入文件，确保每次构建都有变化
RUN echo "{ \"timestamp\": \"${BUILD_TIMESTAMP}\", \"version\": \"${BUILD_VERSION}\" }" > /app/build-info.json

# 构建静态文件（强制重新执行）
RUN npm run build && \
    # 验证构建产物存在
    ls -la /app/dist/index.html && \
    # 显示构建文件列表
    find /app/dist -type f | wc -l

# 生产阶段 - 复制构建结果
FROM nginx:alpine

# 添加nginx调试工具（可选）
RUN apk add --no-cache curl

# 从构建阶段复制构建好的静态文件
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# 复制构建信息（用于调试）
COPY --from=builder /app/build-info.json /usr/share/nginx/html/build-info.json

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]