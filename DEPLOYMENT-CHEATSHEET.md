# 🚀 部署快速参考

## ⚡ 快速命令

```bash
# 前端修改后
./rebuild-frontend.sh

# 后端修改后
./rebuild-backend.sh

# 交互式部署
./deploy.sh
```

## ❌ 禁止

```bash
# ❌ 永远不要这样做！
docker build -t xxx:latest ./frontend
docker compose restart frontend
```

## ✅ 正确流程

```bash
# 1. 修改代码
vim frontend/src/components/XXX.vue

# 2. 重建并部署
./rebuild-frontend.sh

# 3. 清除浏览器缓存
# Ctrl+Shift+Delete

# 4. 硬刷新
# Ctrl+F5
```

## 🔍 验证部署

```bash
# 检查容器时间
docker ps | grep frontend

# 检查镜像时间
docker images | grep frontend

# 查看日志
docker logs exam-prep-system-package-20260330-frontend-1
```

## 📝 详细文档

查看完整部署指南：[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

---

**记住：始终使用 `docker compose build`，永远不要用 `docker build`！**
