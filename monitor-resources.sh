#!/bin/bash

# ============================================
# 密评备考系统 - 资源监控脚本 (2GB环境)
# ============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 密评备考系统 - 实时资源监控"
echo "================================"

# 检查函数
check_memory() {
    local mem_percent=$(free | awk 'NR==2{printf "%.0f", $3/$2*100}')
    local mem_used=$(free -h | awk 'NR==2{print $3}')
    local mem_total=$(free -h | awk 'NR==2{print $2}')

    if [ "$mem_percent" -lt 70 ]; then
        echo -e "${GREEN}✅ 内存: $mem_used / $mem_total ($mem_percent%)${NC}"
    elif [ "$mem_percent" -lt 85 ]; then
        echo -e "${YELLOW}⚠️  内存: $mem_used / $mem_total ($mem_percent%)${NC}"
    else
        echo -e "${RED}🔴 内存: $mem_used / $mem_total ($mem_percent%) - 严重告警!${NC}"
    fi
}

check_disk() {
    local disk_percent=$(df -h . | awk 'NR==2{print $5}' | tr -d '%')
    local disk_used=$(df -h . | awk 'NR==2{print $3}')
    local disk_total=$(df -h . | awk 'NR==2{print $2}')

    if [ "$disk_percent" -lt 70 ]; then
        echo -e "${GREEN}✅ 磁盘: $disk_used / $disk_total ($disk_percent%)${NC}"
    elif [ "$disk_percent" -lt 85 ]; then
        echo -e "${YELLOW}⚠️  磁盘: $disk_used / $disk_total ($disk_percent%)${NC}"
    else
        echo -e "${RED}🔴 磁盘: $disk_used / $disk_total ($disk_percent%) - 严重告警!${NC}"
    fi
}

check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local cpu_int=${cpu_usage%.*}

    if [ "$cpu_int" -lt 70 ]; then
        echo -e "${GREEN}✅ CPU: ${cpu_usage}%${NC}"
    elif [ "$cpu_int" -lt 90 ]; then
        echo -e "${YELLOW}⚠️  CPU: ${cpu_usage}%${NC}"
    else
        echo -e "${RED}🔴 CPU: ${cpu_usage}% - 高负载!${NC}"
    fi
}

check_swap() {
    local swap_used=$(free -h | awk 'NR==3{print $3}')
    local swap_total=$(free -h | awk 'NR==3{print $2}')

    if [ "$swap_total" != "0B" ]; then
        echo -e "💾 Swap: $swap_used / $swap_total"
    else
        echo -e "💾 Swap: 未配置"
    fi
}

check_containers() {
    echo ""
    echo "🐳 Docker容器状态:"

    if ! docker ps &> /dev/null; then
        echo -e "${RED}❌ Docker未运行${NC}"
        return
    fi

    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | while read line; do
        if [[ $line == *"MEM%"* ]]; then
            echo "$line"
        else
            local mem_percent=$(echo $line | awk '{print $4}' | tr -d '%')
            local name=$(echo $line | awk '{print $1}')

            if [ ! -z "$mem_percent" ] && [ "$mem_percent" != "%]" ]; then
                local mem_int=${mem_percent%.*}
                if [ "$mem_int" -lt 70 ]; then
                    echo -e "${GREEN}$line${NC}"
                elif [ "$mem_int" -lt 85 ]; then
                    echo -e "${YELLOW}$line${NC}"
                else
                    echo -e "${RED}$line${NC}"
                fi
            else
                echo "$line"
            fi
        fi
    done
}

check_database() {
    echo ""
    echo "🗄️  数据库状态:"

    if docker exec exam-prep-system-package-20260330-db-1 psql -U exam_user -d exam_db -c "SELECT version();" &> /dev/null; then
        local db_size=$(docker exec exam-prep-system-package-20260330-db-1 psql -U exam_user -d exam_db -t -c "SELECT pg_size_pretty(pg_database_size('exam_db'));" 2>/dev/null | xargs)
        local questions=$(docker exec exam-prep-system-package-20260330-db-1 psql -U exam_user -d exam_db -t -c "SELECT COUNT(*) FROM questions;" 2>/dev/null | xargs)
        local connections=$(docker exec exam-prep-system-package-20260330-db-1 psql -U exam_user -d exam_db -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)

        echo -e "${GREEN}✅ 数据库运行正常${NC}"
        echo "   大小: $db_size"
        echo "   题目数: $questions"
        echo "   连接数: $connections/50"
    else
        echo -e "${RED}❌ 数据库连接失败${NC}"
    fi
}

check_services() {
    echo ""
    echo "🌐 服务健康检查:"

    # 前端检查
    if curl -s http://localhost:18080/health > /dev/null 2>&1; then
        local response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:18080/health)
        echo -e "${GREEN}✅ 前端服务 (响应时间: ${response_time}s)${NC}"
    else
        echo -e "${RED}❌ 前端服务无法访问${NC}"
    fi

    # 后端检查
    if curl -s http://localhost:13000/health > /dev/null 2>&1; then
        local response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:13000/health)
        echo -e "${GREEN}✅ 后端服务 (响应时间: ${response_time}s)${NC}"
    else
        echo -e "${RED}❌ 后端服务无法访问${NC}"
    fi
}

# 主监控循环
monitor_continuous() {
    while true; do
        clear
        echo "🔍 密评备考系统 - 实时资源监控 (按 Ctrl+C 退出)"
        echo "================================"
        date +"%Y-%m-%d %H:%M:%S"
        echo ""

        check_memory
        check_swap
        check_disk
        check_cpu
        check_containers
        check_database
        check_services

        echo ""
        echo "🔄 5秒后刷新..."
        sleep 5
    done
}

# 单次检查模式
monitor_once() {
    echo ""
    check_memory
    check_swap
    check_disk
    check_cpu
    check_containers
    check_database
    check_services
    echo ""
}

# 命令行参数处理
case "${1:-once}" in
    continuous|watch)
        monitor_continuous
        ;;
    once|*)
        monitor_once
        ;;
esac
