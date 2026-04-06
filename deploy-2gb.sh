#!/bin/bash

# ============================================
# 密评备考系统 - 2GB内存环境部署脚本
# ============================================

set -e

echo "🚀 开始部署密评备考系统 (2GB内存优化版)..."

# 检查系统资源
echo "📊 检查系统资源..."
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
TOTAL_DISK=$(df -BG . | awk 'NR==2{print $2}' | tr -d 'G')

echo "系统内存: ${TOTAL_MEM}MB"
echo "系统磁盘: ${TOTAL_DISK}GB"

if [ "$TOTAL_MEM" -lt 1800 ]; then
    echo "⚠️  警告: 系统内存少于2GB，建议至少2GB内存"
fi

if [ "$TOTAL_DISK" -lt 35 ]; then
    echo "⚠️  警告: 磁盘空间少于40GB，建议至少40GB"
fi

# 创建swap文件（如果不存在）
if ! swapon --show | grep -q '/swapfile'; then
    echo "🔧 配置2GB swap文件..."
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        echo "✅ Swap文件已创建并启用"
    else
        swapon /swapfile
        echo "✅ Swap文件已启用"
    fi
else
    echo "✅ Swap已配置"
fi

# 优化系统参数
echo "🔧 优化系统内核参数..."
cat >> /etc/sysctl.conf <<EOF
# 密评备考系统优化参数
vm.swappiness=10
vm.vfs_cache_pressure=50
net.core.somaxconn=128
net.ipv4.tcp_max_syn_backlog=128
net.core.netdev_max_backlog=128
EOF

sysctl -p > /dev/null 2>&1 || echo "部分内核参数应用失败，可忽略"

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down 2>/dev/null || true

# 清理Docker缓存（可选）
echo "🧹 清理Docker缓存..."
docker system prune -f 2>/dev/null || true

# 构建和启动服务
echo "🏗️  构建和启动服务..."
docker-compose up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 健康检查
echo "🏥 执行健康检查..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:18080/health > /dev/null 2>&1; then
        echo "✅ 前端服务健康检查通过"
        break
    fi
    attempt=$((attempt + 1))
    echo "等待前端服务启动... ($attempt/$max_attempts)"
    sleep 2
done

if curl -s http://localhost:13000/health > /dev/null 2>&1; then
    echo "✅ 后端服务健康检查通过"
else
    echo "⚠️  后端服务健康检查失败，请检查日志"
fi

# 显示资源使用情况
echo ""
echo "📊 当前资源使用情况:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 显示访问信息
echo ""
echo "🎉 部署完成！"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:18080"
echo "   后端API: http://localhost:13000"
echo "   数据库: localhost:15432"
echo "   Redis: localhost:16379"
echo ""
echo "📝 管理命令:"
echo "   查看日志: docker-compose logs -f"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo "   查看状态: docker-compose ps"
echo ""
echo "📊 监控资源: ./monitor-resources.sh"
echo ""
echo "⚠️  重要提示:"
echo "   - 已针对2GB内存进行优化"
echo "   - 建议用户数: 1-50人"
echo "   - 定期检查磁盘空间和内存使用率"
echo "   - 遇到性能问题请参考 DEPLOYMENT_FEASIBILITY_ANALYSIS.md"
