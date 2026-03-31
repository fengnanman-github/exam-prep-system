#!/bin/bash

echo "🔍 验证打包完整性..."

REQUIRED_FILES=(
    "docker-compose.yml"
    "deploy.sh"
    "README.md"
    "frontend/"
    "backend/"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -e "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 缺失"
        exit 1
    fi
done

echo ""
echo "🎯 打包完整性验证通过！"
echo "可以执行 ./deploy.sh 进行部署"
