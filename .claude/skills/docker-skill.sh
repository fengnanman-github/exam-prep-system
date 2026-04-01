#!/bin/bash
# Docker管理Skill
# 使用方法：docker ps, docker logs, docker exec等

case "$1" in
  ps)
    echo "=== 运行中的容器 ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
  all)
    echo "=== 所有容器 ==="
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
  logs)
    if [ -z "$2" ]; then
      echo "用法: docker logs <容器名>"
      echo ""
      echo "可用的容器:"
      docker ps --format "{{.Names}}" | grep -E "frontend|backend|db"
      exit 1
    fi
    echo "=== $2 容器日志 ==="
    docker logs --tail 50 "$2"
    ;;
  exec)
    if [ -z "$2" ]; then
      echo "用法: docker exec <容器名> [命令]"
      exit 1
    fi
    echo "=== 执行命令: $2 onwards ==="
    docker exec -it "$2" "${@:2}"
    ;;
  rebuild)
    echo "=== 重建前端 ==="
    cd /home/hduser/exam-prep-system-package-20260330/frontend
    npm run build
    docker rm -f exam-prep-system-package-20260330-frontend-1
    docker build -t exam-prep-system-package-20260330-frontend -f Dockerfile .
    docker run -d --name exam-prep-system-package-20260330-frontend-1 --network exam-prep-system-package-20260330_exam-network -p 18080:80 exam-prep-system-package-20260330-frontend
    echo "✅ 前端已重建"
    ;;
  *)
    echo "=== Docker管理 ==="
    echo ""
    echo "命令:"
    echo "  docker ps           # 查看运行中的容器"
    echo "  docker all          # 查看所有容器"
    echo "  docker logs <name>  # 查看容器日志"
    echo "  docker exec <name>  # 进入容器shell"
    echo "  docker rebuild      # 重建前端容器"
    ;;
esac
