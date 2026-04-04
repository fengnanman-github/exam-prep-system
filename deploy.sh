#!/bin/bash
# 完整重新构建和部署脚本（前后端）

set -e

echo "========================================="
echo "🚀 完整系统重新部署"
echo "========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 询问用户要重建哪些服务
echo "请选择要重建的服务："
echo "1) 仅前端"
echo "2) 仅后端"
echo "3) 前端+后端"
echo ""
read -p "请输入选项 [1-3]: " choice

case $choice in
  1)
    echo ""
    echo "🎯 重建前端..."
    ./rebuild-frontend.sh
    ;;
  2)
    echo ""
    echo "🎯 重建后端..."
    ./rebuild-backend.sh
    ;;
  3)
    echo ""
    echo "🎯 重建前端和后端..."
    ./rebuild-frontend.sh
    echo ""
    ./rebuild-backend.sh
    ;;
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

echo ""
echo "========================================="
echo "✅ 部署完成！"
echo "========================================="
echo ""
echo "📍 访问地址："
echo "   - 前端: http://localhost:18080"
echo "   - 后端: http://localhost:13000"
echo ""
echo "💡 重要提示："
echo "   - 请清除浏览器缓存（Ctrl+Shift+Delete）"
echo "   - 硬刷新页面（Ctrl+F5 或 Cmd+Shift+R）"
echo ""
