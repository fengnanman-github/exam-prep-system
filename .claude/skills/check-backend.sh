#!/bin/bash
# 检查后端服务状态
# 使用方法：/check-backend

echo "=== 后端服务状态检查 ==="
echo ""

# 检查后端进程
echo "📌 后端进程:"
ps aux | grep -E "nodemon|node.*server.js" | grep -v grep || echo "  ⚠️  后端未运行"
echo ""

# 检查端口
echo "📌 端口状态:"
netstat -tlnp 2>/dev/null | grep :3000 || echo "  ⚠️  端口3000未监听"
echo ""

# 检查API健康
echo "📌 API健康检查:"
health=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "  ✅ API正常响应"
  echo "$health" | head -3
else
  echo "  ❌ API无响应"
fi
echo ""

# 检查数据库
echo "📌 数据库状态:"
docker ps | grep -E "db|postgres" || echo "  ⚠️ 数据库未运行"
echo ""

# 显示最近的后端日志
echo "📝 最近后端日志 (最后10行):"
tail -10 /tmp/backend.log 2>/dev/null || echo "  无日志文件"
