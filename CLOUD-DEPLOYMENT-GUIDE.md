# 密评备考系统 - 云平台部署安全指南

## 🚨 部署前安全检查清单

### 1. 环境变量配置
创建 `.env.production` 文件，配置以下关键环境变量：

```bash
# ========== 数据库配置 ==========
DB_HOST=your-cloud-db-host
DB_PORT=5432
DB_NAME=exam_db
DB_USER=exam_user
DB_PASSWORD=<强密码，建议32位随机字符>

# ========== Redis配置 ==========
REDIS_HOST=your-cloud-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<强密码>

# ========== JWT密钥配置 ==========
# 生成强密钥: openssl rand -base64 32
JWT_SECRET=<生产环境必须使用强密钥>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ========== 应用配置 ==========
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ========== HTTPS配置 ==========
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem

# ========== 邮件配置（用于邮箱验证） ==========
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=<邮件密码>
SMTP_FROM=noreply@your-domain.com

# ========== 监控和日志 ==========
LOG_LEVEL=warn
SENTRY_DSN=<your-sentry-dsn-for-error-tracking>
```

### 2. 密码安全策略

**强密码要求：**
- 最小长度：8位
- 必须包含：大写字母、小写字母、数字、特殊字符
- 不能包含用户信息
- 防止常见弱密码
- 记住最近5次密码，不能重复使用

**账户保护：**
- 登录失败5次后锁定30分钟
- 失败10次后永久锁定
- 密码90天过期
- 会话30分钟空闲超时

### 3. 网络安全配置

**防火墙规则：**
```bash
# 只允许必要的端口
- 80/tcp (HTTP) -> 重定向到443
- 443/tcp (HTTPS) -> 应用访问
- 22/tcp (SSH) -> 限制访问IP
- 数据库端口禁止公网访问
```

**DDoS防护：**
- 启用Cloudflare或类似CDN服务
- 配置速率限制：每IP每15分钟最多100请求
- 认证API更严格：每15分钟最多10请求

### 4. HTTPS配置

**SSL/TLS配置：**
```nginx
# /etc/nginx/sites-available/exam-prep-system
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # Let's Encrypt证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 安全SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # 其他安全headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 5. 数据库安全

**PostgreSQL安全配置：**
```sql
-- postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/ca.crt'

-- 强制SSL连接
ALTER DATABASE exam_db SET allow_connections = false;
ALTER DATABASE exam_db SET allow_connections = true;

-- 只允许特定IP连接（pg_hba.conf）
hostssl exam_db exam_user 10.0.0.0/8 scram-sha-256
```

**备份策略：**
- 每日自动备份（凌晨2点）
- 备份保留30天
- 异地备份存储
- 定期测试恢复流程

### 6. 应用安全监控

**实时监控指标：**
```javascript
// 监控关键安全事件
- 登录失败率异常（>10%）
- 账户锁定事件
- 异常IP访问
- SQL注入尝试
- XSS攻击检测
- API滥用检测
```

**告警配置：**
- 严重安全事件：立即邮件+短信告警
- 一般安全事件：邮件告警
- 性能异常：邮件告警

### 7. 审计日志管理

**日志内容：**
- 用户登录/登出
- 密码修改
- 账户锁定/解锁
- 权限变更
- 敏感数据访问
- API调用记录

**日志保留：**
- 在线保留：90天
- 归档保留：1年
- 敏感操作：永久保留

### 8. 灾难恢复计划

**备份策略：**
- 数据库：每日全量+每小时增量
- 应用配置：每次变更后备份
- 静态资源：CDN备份

**恢复测试：**
- 每月进行恢复演练
- 记录恢复时间（RTO）和恢复点（RPO）

### 9. 安全更新维护

**定期更新：**
- 操作系统补丁：每周检查
- Node.js依赖：每月更新
- PostgreSQL版本：按官方LTS计划
- SSL证书：自动续期（Let's Encrypt）

**漏洞扫描：**
- 每周自动扫描依赖漏洞
- 使用npm audit + Snyk
- 及时修复高危漏洞

### 10. 合规性要求

**数据保护：**
- 用户密码加密存储（bcrypt）
- 敏感数据脱敏显示
- 遵循数据最小化原则
- 用户数据删除权

**访问控制：**
- 最小权限原则
- 管理员操作审计
- 定期权限审查

## 🚀 部署步骤

### 1. 准备工作
```bash
# 1. 克隆代码
git clone <your-repo-url>
cd exam-prep-system

# 2. 配置环境变量
cp .env.example .env.production
# 编辑.env.production，设置所有必需的环境变量

# 3. 生成JWT密钥
openssl rand -base64 32
# 将生成的密钥设置为JWT_SECRET

# 4. 构建Docker镜像
docker compose -f docker-compose.prod.yml build
```

### 2. 数据库初始化
```bash
# 运行数据库迁移
docker compose -f docker-compose.prod.yml run --rm backend npm run migrate

# 执行安全增强迁移
docker compose -f docker-compose.prod.yml exec db psql -U exam_user -d exam_db < backend/migrations/security-enhancement-fixed.sql
```

### 3. 启动服务
```bash
# 启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 检查服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

### 4. 配置SSL证书
```bash
# 使用Let's Encrypt免费证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期（已由certbot自动配置）
sudo certbot renew --dry-run
```

### 5. 监控配置
```bash
# 配置日志监控
# 配置性能监控
# 配置错误追踪（Sentry）
# 配置告警通知
```

## 🔍 部署后安全检查

### 1. 安全扫描
```bash
# 依赖漏洞扫描
npm audit --audit-level=high

# Docker镜像扫描
docker scan exam-prep-system-backend:latest
docker scan exam-prep-system-frontend:latest

# 网络端口扫描
nmap -sV your-domain.com
```

### 2. 渗透测试
- 使用OWASP ZAP进行自动扫描
- 手动测试常见漏洞（SQL注入、XSS、CSRF等）
- 第三方安全审计

### 3. 性能测试
- 负载测试（模拟1000并发用户）
- 压力测试（找出系统瓶颈）
- 数据库性能优化

## 📋 运维手册

### 日常维护任务
- [ ] 检查系统日志
- [ ] 监控性能指标
- [ ] 验证备份完整性
- [ ] 检查安全告警
- [ ] 更新依赖版本

### 应急响应流程
1. **检测安全事件**
2. **评估影响范围**
3. **启动应急预案**
4. **通知相关人员**
5. **执行修复措施**
6. **事后分析改进**

### 联系方式
- 技术支持：support@your-domain.com
- 安全报告：security@your-domain.com
- 紧急联系：+86-XXX-XXXX-XXXX

---

**⚠️ 重要提醒：**
1. 生产环境必须使用强JWT密钥
2. 数据库密码必须足够复杂
3. 启用HTTPS并配置正确的SSL证书
4. 定期备份数据并测试恢复
5. 监控系统日志和安全事件
6. 及时更新系统和依赖版本

**📞 如需帮助，请参考：**
- OWASP Top 10：https://owasp.org/www-project-top-ten/
- Web安全指南：https://owasp.org/www-project-web-security-testing-guide/
- 云安全最佳实践：https://cloud.google.com/security