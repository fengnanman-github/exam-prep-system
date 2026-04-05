#!/bin/bash

# 安全检查脚本 - 部署前安全配置验证
# 使用方法: ./scripts/security-check.sh

set -e

echo "🔒 开始安全检查..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数器
WARNINGS=0
ERRORS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# ========== 1. 环境变量检查 ==========
echo ""
echo "1. 检查环境变量配置..."

if [ -f .env.production ]; then
    check_pass ".env.production 文件存在"

    # 检查关键环境变量
    source .env.production

    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "exam-jwt-secret-2026" ]; then
        check_fail "JWT_SECRET 未设置或使用默认值"
    else
        JWT_SECRET_LENGTH=${#JWT_SECRET}
        if [ $JWT_SECRET_LENGTH -lt 32 ]; then
            check_fail "JWT_SECRET 长度不足（当前：$JWT_SECRET_LENGTH，要求：≥32）"
        else
            check_pass "JWT_SECRET 配置正确（长度：$JWT_SECRET_LENGTH）"
        fi
    fi

    if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "change_this_password" ]; then
        check_fail "DB_PASSWORD 未设置或使用默认值"
    else
        check_pass "DB_PASSWORD 已设置"
    fi

    if [ "$NODE_ENV" != "production" ]; then
        check_fail "NODE_ENV 未设置为 production"
    else
        check_pass "NODE_ENV 正确设置为 production"
    fi

else
    check_fail ".env.production 文件不存在"
fi

# ========== 2. 依赖安全检查 ==========
echo ""
echo "2. 检查依赖安全性..."

if command -v npm &> /dev/null; then
    echo "运行 npm audit..."
    AUDIT_RESULT=$(npm audit --json 2>/dev/null || echo "{}")

    # 检查高危漏洞
    VULNERABILITIES=$(echo "$AUDIT_RESULT" | jq -r '.metadata.vulnerabilities | select(. != null)' | jq 'values | add' 2>/dev/null || echo "0")

    if [ "$VULNERABILITIES" -gt 0 ]; then
        check_warn "发现 $VULNERABILITIES 个已知漏洞，请运行 'npm audit fix'"
    else
        check_pass "未发现已知漏洞"
    fi
else
    check_warn "npm 未安装，跳过依赖检查"
fi

# ========== 3. 文件权限检查 ==========
echo ""
echo "3. 检查文件权限..."

# 检查敏感文件权限
SENSITIVE_FILES=(".env.production" "backend/migrations/*.sql" "*.key" "*.pem")
for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        PERMISSIONS=$(stat -c %a "$file" 2>/dev/null || stat -f %A "$file" 2>/dev/null)
        if [ ! -z "$PERMISSIONS" ]; then
            # 检查是否过于开放
            if [ "$PERMISSIONS" = "777" ] || [ "$PERMISSIONS" = "666" ]; then
                check_fail "$file 权限过于开放 ($PERMISSIONS)"
            else
                check_pass "$file 权限正常 ($PERMISSIONS)"
            fi
        fi
    fi
done

# ========== 4. 密码策略检查 ==========
echo ""
echo "4. 检查密码策略..."

if [ -f backend/config/security-config.js ]; then
    # 检查密码最小长度
    MIN_LENGTH=$(grep -o "minLength.*[0-9]" backend/config/security-config.js | grep -o "[0-9]" | tail -1)
    if [ "$MIN_LENGTH" -ge 8 ]; then
        check_pass "密码最小长度要求：$MIN_LENGTH 位"
    else
        check_fail "密码最小长度要求过低：$MIN_LENGTH 位"
    fi

    # 检查是否启用复杂度要求
    if grep -q "requireUppercase.*true" backend/config/security-config.js; then
        check_pass "启用大写字母要求"
    else
        check_warn "未启用大写字母要求"
    fi

    if grep -q "requireNumbers.*true" backend/config/security-config.js; then
        check_pass "启用数字要求"
    else
        check_warn "未启用数字要求"
    fi

    if grep -q "requireSpecialChars.*true" backend/config/security-config.js; then
        check_pass "启用特殊字符要求"
    else
        check_warn "未启用特殊字符要求"
    fi
else
    check_warn "安全配置文件不存在"
fi

# ========== 5. SSL/TLS配置检查 ==========
echo ""
echo "5. 检查SSL/TLS配置..."

if [ -f .env.production ]; then
    source .env.production

    if [ ! -z "$SSL_CERT_PATH" ] && [ ! -z "$SSL_KEY_PATH" ]; then
        if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
            check_pass "SSL证书文件存在"

            # 检查证书有效期
            if command -v openssl &> /dev/null; then
                EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$SSL_CERT_PATH" | cut -d= -f2)
                EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null)
                CURRENT_EPOCH=$(date +%s)
                DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

                if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
                    check_warn "SSL证书将在 $DAYS_UNTIL_EXPIRY 天后过期"
                else
                    check_pass "SSL证书有效期正常（还有 $DAYS_UNTIL_EXPIRY 天）"
                fi
            fi
        else
            check_fail "SSL证书文件不存在"
        fi
    else
        check_warn "SSL证书路径未配置"
    fi
fi

# ========== 6. 数据库安全检查 ==========
echo ""
echo "6. 检查数据库安全配置..."

if [ -f .env.production ]; then
    source .env.production

    if [ ! -z "$DB_HOST" ]; then
        # 检查是否使用localhost（生产环境不应使用localhost）
        if [[ "$DB_HOST" =~ "localhost" ]] || [[ "$DB_HOST" =~ "127.0.0.1" ]]; then
            check_fail "数据库主机配置为本地地址，生产环境应使用远程数据库"
        else
            check_pass "数据库主机配置正确"
        fi

        # 检查密码强度
        if [ ${#DB_PASSWORD} -lt 16 ]; then
            check_warn "数据库密码长度建议至少16位"
        else
            check_pass "数据库密码长度符合要求"
        fi
    fi
fi

# ========== 7. CORS配置检查 ==========
echo ""
echo "7. 检查CORS配置..."

if [ -f .env.production ]; then
    source .env.production

    if [ -z "$ALLOWED_ORIGINS" ]; then
        check_fail "ALLOWED_ORIGINS 未配置"
    elif [[ "$ALLOWED_ORIGINS" =~ "*" ]]; then
        check_fail "CORS配置允许所有来源（*），存在安全风险"
    else
        check_pass "CORS配置正确"
    fi
fi

# ========== 8. 敏感信息检查 ==========
echo ""
echo "8. 检查敏感信息泄露..."

# 检查代码中是否包含硬编码的密钥
if grep -r "password.*=.*['\"]" --include="*.js" --include="*.json" backend/ | grep -v "node_modules" | grep -v ".env" | grep -v "example" | grep -v "test" | grep -qi "password.*=.*['\"]123456\|password.*=.*['\"]password\|password.*=.*['\"]secret"; then
    check_warn "发现可能的硬编码弱密码"
else
    check_pass "未发现硬编码的弱密码"
fi

# 检查是否有调试代码
if grep -r "console\.log\|console\.debug" --include="*.js" backend/src/ | grep -v "node_modules" | grep -q .; then
    check_warn "生产代码中发现console.log语句"
else
    check_pass "未发现调试代码"
fi

# ========== 9. 文件上传检查 ==========
echo ""
echo "9. 检查文件上传安全..."

if [ -f .env.production ]; then
    source .env.production

    if [ ! -z "$MAX_FILE_SIZE" ]; then
        MAX_SIZE_MB=$((MAX_FILE_SIZE / 1024 / 1024))
        if [ $MAX_SIZE_MB -gt 10 ]; then
            check_warn "文件上传大小限制过大：${MAX_SIZE_MB}MB"
        else
            check_pass "文件上传大小限制合理：${MAX_SIZE_MB}MB"
        fi
    else
        check_warn "未配置文件上传大小限制"
    fi
fi

# ========== 10. 备份配置检查 ==========
echo ""
echo "10. 检查备份配置..."

if [ -f .env.production ]; then
    source .env.production

    if [ "$BACKUP_ENABLED" = "true" ]; then
        check_pass "数据库备份已启用"

        if [ ! -z "$BACKUP_RETENTION_DAYS" ]; then
            if [ "$BACKUP_RETENTION_DAYS" -ge 7 ]; then
                check_pass "备份保留期合理：$BACKUP_RETENTION_DAYS 天"
            else
                check_warn "备份保留期过短：$BACKUP_RETENTION_DAYS 天"
            fi
        fi
    else
        check_warn "数据库备份未启用"
    fi
fi

# ========== 11. API速率限制检查 ==========
echo ""
echo "11. 检查API速率限制配置..."

if [ -f .env.production ]; then
    source .env.production

    if [ ! -z "$RATE_LIMIT_MAX_REQUESTS" ]; then
        if [ "$RATE_LIMIT_MAX_REQUESTS" -le 100 ]; then
            check_pass "API速率限制配置合理：$RATE_LIMIT_MAX_REQUESTS 请求/15分钟"
        else
            check_warn "API速率限制过宽松：$RATE_LIMIT_MAX_REQUESTS 请求/15分钟"
        fi
    else
        check_warn "未配置API速率限制"
    fi
fi

# ========== 12. Docker安全检查 ==========
echo ""
echo "12. 检查Docker安全配置..."

if [ -f docker-compose.yml ] || [ -f Dockerfile ]; then
    # 检查是否使用非root用户
    if grep -q "USER\|user" Dockerfile 2>/dev/null; then
        check_pass "Dockerfile配置了非root用户"
    else
        check_warn "Dockerfile未配置非root用户"
    fi

    # 检查是否使用特定版本标签（避免使用latest）
    if grep -q ":latest" docker-compose.yml 2>/dev/null || grep -q "FROM.*latest" Dockerfile 2>/dev/null; then
        check_warn "Docker配置使用了latest标签，建议使用具体版本号"
    else
        check_pass "Docker配置使用了具体版本标签"
    fi
fi

# ========== 总结 ==========
echo ""
echo "==================================="
echo "🔍 安全检查完成"
echo "==================================="
echo -e "${RED}错误: $ERRORS${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ 发现严重安全问题，请修复后重新部署！${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现安全问题，建议修复后再部署${NC}"
    exit 0
else
    echo -e "${GREEN}✅ 安全检查通过，可以部署！${NC}"
    exit 0
fi