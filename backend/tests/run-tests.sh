#!/bin/bash

# 测试运行脚本
# 用于运行密评备考系统的自动化测试

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# 切换到后端目录
cd "$BACKEND_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}密评备考系统 - 自动化测试${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查测试环境是否运行
echo -e "${YELLOW}检查测试环境...${NC}"
if ! docker compose -f docker-compose.test.yml ps db-test | grep -q "Up"; then
    echo -e "${RED}测试环境未运行，正在启动...${NC}"
    docker compose -f docker-compose.test.yml up -d db-test redis-test
    sleep 10
fi

echo -e "${GREEN}✓ 测试环境已就绪${NC}"
echo ""

# 运行单元测试
echo -e "${YELLOW}运行单元测试...${NC}"
if [ -d "tests/unit" ]; then
    for test in tests/unit/*.test.js; do
        if [ -f "$test" ]; then
            echo -e "${YELLOW}运行: $test${NC}"
            npx jest "$test" || echo -e "${RED}✗ 单元测试失败: $test${NC}"
        fi
    done
    echo -e "${GREEN}✓ 单元测试完成${NC}"
else
    echo -e "${YELLOW}未找到单元测试${NC}"
fi
echo ""

# 运行集成测试
echo -e "${YELLOW}运行集成测试...${NC}"
if [ -d "tests/integration" ]; then
    for test in tests/integration/*.test.js; do
        if [ -f "$test" ]; then
            echo -e "${YELLOW}运行: $test${NC}"
            npx jest "$test" || echo -e "${RED}✗ 集成测试失败: $test${NC}"
        fi
    done
    echo -e "${GREEN}✓ 集成测试完成${NC}"
else
    echo -e "${YELLOW}未找到集成测试${NC}"
fi
echo ""

# 运行所有测试（如果使用Jest）
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo -e "${YELLOW}运行所有测试...${NC}"
    npm test || echo -e "${RED}✗ 测试失败${NC}"
    echo ""
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}测试完成${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示测试报告（如果存在）
if [ -f "coverage/lcov-report/index.html" ]; then
    echo -e "${YELLOW}测试报告: coverage/lcov-report/index.html${NC}"
fi
