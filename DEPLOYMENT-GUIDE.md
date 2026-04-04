# 🚀 密评备考系统 - 部署指南

## ⚠️ 重要：正确的构建部署流程

### ❌ 错误做法（会导致修改不生效）
```bash
# ❌ 不要这样做！
docker build -t my-frontend:latest ./frontend
docker compose restart frontend
```

**原因：** Docker Compose使用自己的镜像命名规则，不会使用您手动构建的镜像。

### ✅ 正确做法

#### 方法1：使用自动化脚本（推荐）

```bash
# 重新构建并部署前端
./rebuild-frontend.sh

# 重新构建并部署后端
./rebuild-backend.sh

# 交互式选择要部署的服务
./deploy.sh
```

#### 方法2：手动执行Docker Compose命令

```bash
# 前端
docker compose build --no-cache frontend
docker compose up -d frontend

# 后端
docker compose build --no-cache backend
docker compose up -d backend
```

## 📋 详细说明

### 为什么必须使用 `docker compose build`？

Docker Compose配置文件（`docker-compose.yml`）中定义：
```yaml
services:
  frontend:
    build: ./frontend  # ← 这里定义了构建上下文
```

当您运行 `docker compose build` 时：
- 镜像名称：`exam-prep-system-package-20260330-frontend`（自动生成）
- 基于项目名和服务名

当您运行 `docker build` 时：
- 镜像名称：`exam-prep-frontend:latest`（您指定的名称）
- **Docker Compose不会使用这个镜像！**

### `--no-cache` 参数的作用

强制重新构建，不使用任何缓存层：
```bash
docker compose build --no-cache frontend
```

**何时使用：**
- 修改了代码但构建时没有反映变化
- 怀疑缓存导致问题
- 确保使用最新的代码和依赖

**何时不需要：**
- 只是配置文件修改
- 没有代码变化

### `docker compose up -d` 的作用

- `-d`: 后台运行（detached mode）
- 自动检测镜像变化并重新创建容器
- 相当于：`docker compose down && docker compose up -d`

## 🔍 故障排查

### 修改了代码但没有生效

**症状：** 浏览器刷新后看不到修改

**检查步骤：**

1. **确认镜像已重建**
   ```bash
   docker images | grep frontend
   # 查看镜像创建时间，应该是最新的
   ```

2. **确认容器已重启**
   ```bash
   docker ps | grep frontend
   # 查看容器启动时间，应该是最新的
   ```

3. **清除浏览器缓存**
   - Chrome/Edge: Ctrl+Shift+Delete
   - Mac: Cmd+Shift+Delete
   - 然后硬刷新: Ctrl+F5 或 Cmd+Shift+R

4. **检查容器日志**
   ```bash
   docker logs exam-prep-system-package-20260330-frontend-1
   ```

### 容器启动失败

**检查步骤：**

1. 查看容器状态
   ```bash
   docker ps -a | grep frontend
   ```

2. 查看错误日志
   ```bash
   docker logs exam-prep-system-package-20260330-frontend-1
   ```

3. 检查构建过程
   ```bash
   docker compose build frontend  # 不加--no-cache，查看完整输出
   ```

## 📝 快速参考

### 日常开发流程

```bash
# 1. 修改前端代码
vim frontend/src/components/SomeComponent.vue

# 2. 重新构建并部署
./rebuild-frontend.sh

# 3. 等待部署完成（约30-60秒）

# 4. 清除浏览器缓存并刷新
# Ctrl+Shift+Delete → Ctrl+F5
```

### 快速重启（不重建）

```bash
# 如果只是配置修改，不需要重建
docker compose restart frontend
docker compose restart backend
```

### 查看服务状态

```bash
# 所有服务状态
docker compose ps

# 前端日志
docker logs -f exam-prep-system-package-20260330-frontend-1

# 后端日志
docker logs -f exam-prep-system-package-20260330-backend-1

# 数据库日志
docker logs -f exam-prep-system-package-20260330-db-1
```

## 🎯 最佳实践

1. **始终使用项目提供的脚本**
   - `./rebuild-frontend.sh`
   - `./rebuild-backend.sh`
   - `./deploy.sh`

2. **修改代码后立即测试**
   - 不要累积多个修改后再部署
   - 每次修改后立即重建和测试

3. **使用版本控制**
   - 提交代码前先测试
   - 重要修改前创建分支

4. **定期清理**
   ```bash
   # 清理未使用的镜像
   docker image prune -a

   # 清理未使用的容器
   docker container prune

   # 清理未使用的卷
   docker volume prune
   ```

## 📞 获取帮助

如果遇到问题：
1. 检查本文档的故障排查部分
2. 查看容器日志
3. 确认使用的是正确的构建命令

---

**最后更新：** 2026-04-04
**维护者：** Claude Code
