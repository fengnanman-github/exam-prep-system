#!/bin/bash
# 重建并部署前端
# 使用方法：/rebuild-frontend

cd /home/hduser/exam-prep-system-package-20260330/frontend

echo "🔨 开始构建前端..."
npm run build

echo ""
echo "🐳 停止旧容器..."
docker rm -f exam-prep-system-package-20260330-frontend-1 2>/dev/null || true

echo ""
echo "🐳 重建Docker镜像..."
docker build -t exam-prep-system-package-20260330-frontend -f Dockerfile .

echo ""
echo "🐳 启动新容器..."
docker run -d --name exam-prep-system-package-20260330-frontend-1 \
  --network exam-prep-system-package-20260330_exam-network \
  -p 18080:80 \
  exam-prep-system-package-20260330-frontend

echo ""
echo "✅ 前端已部署完成！"
echo "🌐 访问地址: http://localhost:18080"
echo ""
sleep 2
curl -s http://localhost:18080/ | head -5
