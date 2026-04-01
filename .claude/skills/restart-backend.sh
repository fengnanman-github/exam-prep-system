#!/bin/bash
# 快速重启后端服务
# 使用方法：/restart-backend

cd /home/hduser/exam-prep-system-package-20260330/backend

# 停止现有的nodemon进程
pkill -f "nodemon.*server.js" 2>/dev/null || true

# 等待进程完全停止
sleep 1

# 启动新的后端服务（后台运行）
nohup npm run dev > /tmp/backend.log 2>&1 &

echo "✅ 后端服务已重启，正在后台运行"
echo "📝 查看日志: tail -f /tmp/backend.log"
echo "🔍 检查状态: curl -s http://localhost:3000/health"
