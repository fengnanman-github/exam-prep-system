# 安全配置指南

## 🔐 环境变量配置

### 1. 创建 .env 文件

复制 `.env.template` 为 `.env`：

```bash
cp .env.template .env
```

### 2. 修改数据库密码

编辑 `.env` 文件，设置强密码：

```bash
DB_PASSWORD=your_secure_password_here
```

**密码要求**：
- 至少 12 个字符
- 包含大小写字母、数字和特殊字符
- 不要使用常见密码或字典词汇

### 3. 重启服务

```bash
docker compose down
docker compose up -d
```

---

## 🚫 敏感信息保护

### 已保护的文件

以下文件已在 `.gitignore` 中，不会被提交到 Git：

- `.env` - 环境变量（包含密码）
- `*.log` - 日志文件
- `*.sql` - 数据库备份
- `node_modules/` - 依赖包
- `frontend/dist/` - 构建产物

### 代码中的密码

所有硬编码密码已替换为占位符：

- `exam_pass123` → `change_this_password`

**部署前必须修改**：
1. `.env` 文件中的数据库密码
2. `docker-compose.yml` 中的环境变量
3. 所有使用 `change_this_password` 的地方

---

## 👥 用户管理

### 默认用户

系统**没有**预设的默认用户。

### 创建管理员账号

首次部署后，需要手动创建管理员账号：

```bash
# 连接到数据库
docker exec -it exam-prep-system-package-20260330-db-1 psql -U exam_user exam_db

# 插入管理员记录（密码需要 bcrypt 哈希）
INSERT INTO users (username, password_hash, email, display_name, role, is_active)
VALUES (
  'admin',
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'admin@example.com',
  '系统管理员',
  'admin',
  true
);
```

**注意**：密码哈希需要使用 bcrypt 生成（10 rounds）。

### 创建普通用户

通过系统注册页面创建，或直接插入数据库：

```bash
INSERT INTO users (username, password_hash, email, display_name, role, is_active)
VALUES (
  'username',
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'user@example.com',
  '用户名',
  'user',
  true
);
```

---

## 🔒 安全建议

### 1. 定期更新密码

- 数据库密码：每 3-6 个月更新一次
- 用户密码：建议用户定期更改

### 2. 使用 HTTPS

生产环境必须使用 HTTPS：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

### 3. 限制端口访问

修改 `docker-compose.yml`，移除不必要的端口映射：

```yaml
db:
  ports:
    # - "15432:5432"  # 移除外部访问
```

### 4. 启用防火墙

```bash
# 只允许必要端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 5. 定期备份数据库

```bash
# 创建备份
docker exec exam-prep-system-package-20260330-db-1 \
  pg_dump -U exam_user exam_db > backup_$(date +%Y%m%d).sql

# 加密备份
gpg --symmetric backup_$(date +%Y%m%d).sql
```

---

## 🚨 安全事件响应

### 发现漏洞

1. 立即停止服务：`docker compose down`
2. 修复漏洞
3. 更新所有密码
4. 检查日志文件
5. 恢复服务

### 数据泄露

1. 立即修改所有密码
2. 通知所有用户重置密码
3. 检查数据库异常访问
4. 启用审计日志
5. 报告安全事件

---

## 📋 安全检查清单

部署前检查：

- [ ] 修改 .env 中的数据库密码
- [ ] 修改 docker-compose.yml 中的密码
- [ ] 移除测试用户数据
- [ ] 启用 HTTPS
- [ ] 配置防火墙
- [ ] 设置日志监控
- [ ] 配置数据库备份
- [ ] 限制端口访问
- [ ] 启用审计日志
- [ ] 更新系统补丁

---

## 📞 安全问题报告

发现安全问题？请：

1. 不要公开 issue
2. 私密报告给维护者
3. 提供详细复现步骤
4. 等待确认后再公开

---

**最后更新**: 2026-03-31
**版本**: 1.0
