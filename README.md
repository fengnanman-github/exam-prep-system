# 🔐 密评备考系统

商用密码应用安全性评估从业人员考核备考平台

## 📋 项目概述

密评备考系统是一个专业的商用密码应用安全性评估从业人员考核备考平台，包含完整的题库管理、智能练习、错题管理和进度跟踪功能。

### 系统特点

- 📚 **完整题库** - 包含5,075道精选题目
- 🎯 **智能练习** - 随机练习、分类练习多种模式
- 📊 **错题管理** - 自动记录错题，智能复习提醒
- 📱 **响应式设计** - 支持PC、平板、手机多端访问
- 🚀 **一键部署** - Docker容器化部署，开箱即用

## 🏗️ 系统架构

### 技术栈

| 组件 | 技术栈 | 版本 |
|------|--------|------|
| 前端 | Vue.js 3 + Vite | 3.3.0 |
| 后端 | Node.js + Express | 18 |
| 数据库 | PostgreSQL | 13 |
| 缓存 | Redis | 6 |
| Web服务器 | Nginx | Alpine |

### 服务端口映射

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|----------|------------|------|
| 前端 | 80 | 18080 | Web界面 |
| 后端API | 3000 | 13000 | REST API |
| PostgreSQL | 5432 | 15432 | 数据库 |
| Redis | 6379 | 16379 | 缓存 |

### 题库数据统计

- **总题目数**: 5,075题
- **判断题**: 1,590题
- **单选题**: 1,747题
- **多选题**: 1,738题

## 🚀 快速部署

### 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 1GB 可用磁盘空间

### 一键部署

```bash
# 克隆或下载项目文件后，执行部署脚本
./deploy.sh
```

部署完成后，访问 http://localhost:18080 即可使用系统。

### 手动部署

```bash
# 1. 构建并启动服务
docker-compose up -d

# 2. 初始化数据库表
./init-data.sh

# 3. 查看服务状态
docker-compose ps
```

## ⚙️ 环境变量配置

系统支持通过环境变量进行配置，可以在 `.env` 文件中设置：

```bash
# 数据库配置
DB_HOST=db
DB_PORT=5432
DB_NAME=exam_db
DB_USER=exam_user
DB_PASSWORD=exam_pass123

# Redis配置
REDIS_HOST=redis

# 后端配置
PORT=3000
NODE_ENV=production

# 前端配置（nginx配置文件）
API_BACKEND=http://backend:3000
```

## 📊 功能特性

### 核心功能

- ✅ **题目随机练习** - 系统随机抽取题目进行练习
- ✅ **题型分类练习** - 按判断题、单选题、多选题专项练习
- ✅ **实时统计信息** - 显示题目总数、各题型数量
- ✅ **响应式界面设计** - 自适应各种屏幕尺寸
- ✅ **错题管理系统** - 自动记录错题，支持错题复习
- ✅ **智能复习提醒** - 基于遗忘曲线的复习时间提醒

### 功能模块

#### 1. 首页概览
- 显示系统统计信息
- 快速入口导航
- 错题统计预览

#### 2. 练习模式
- 🎲 随机练习：从全部题库随机出题
- ✅ 判断题练习：专门练习判断题
- 🔘 单选题练习：专门练习单选题
- 🔘 多选题练习：专门练习多选题

#### 3. 错题本
- 查看所有错题记录
- 显示错误次数和复习时间
- 标记已掌握的错题

#### 4. 复习提醒
- 显示待复习题目列表
- 智能复习时间推荐
- 一键开始复习

## 🔌 API 接口文档

### 基础信息

- **Base URL**: `http://localhost:13000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

### 健康检查

```
GET /health
```

**响应示例**:
```json
{
  "status": "ok",
  "service": "exam-prep-backend",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "version": "1.0.0"
}
```

### 统计信息

```
GET /api/stats
```

**响应示例**:
```json
{
  "totalQuestions": 5075,
  "judgeQuestions": 1590,
  "singleChoice": 1747,
  "multiChoice": 1738
}
```

### 题目接口

#### 获取随机题目

```
GET /api/questions/random
```

#### 按类型获取题目

```
GET /api/questions/by-type/:type
```

**参数**:
- `type`: 题型，可选值: `judge`, `single`, `multi`

### 错题管理接口

#### 获取错题统计

```
GET /api/wrong-answers/:userId/stats
```

**响应示例**:
```json
{
  "total_wrong": 25,
  "total_errors": 38,
  "need_review": 12
}
```

#### 获取错题列表

```
GET /api/wrong-answers/:userId
```

#### 记录错题

```
POST /api/wrong-answers
Content-Type: application/json

{
  "question_id": 123,
  "user_id": "exam_user_001"
}
```

#### 删除错题

```
DELETE /api/wrong-answers/:userId/:questionId
```

#### 获取待复习题目

```
GET /api/wrong-answers/:userId/review
```

## 🔧 运维管理

### 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f [service_name]

# 重启服务
docker-compose restart [service_name]

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec backend sh
docker-compose exec db psql -U exam_user -d exam_db
```

### 数据备份

```bash
# 执行数据备份
./backup.sh

# 备份文件保存在 backups/ 目录下
# 格式: backups/YYYYMMDD_HHMMSS/
```

### 数据恢复

```bash
# 从备份恢复数据
./restore.sh backups/20260330_120000

# 恢复前会自动停止服务，恢复后自动启动
```

### 数据库初始化

```bash
# 初始化错题管理表
docker-compose exec -T db psql -U exam_user -d exam_db < backend/init-db.sql
```

## 🛠️ 故障排查

### 常见问题

#### 1. 端口被占用

**问题**: 启动时报错 "port is already allocated"

**解决方案**:
```bash
# 检查端口占用
netstat -tunlp | grep 18080
netstat -tunlp | grep 13000

# 修改 docker-compose.yml 中的端口映射
# 或停止占用端口的服务
```

#### 2. 数据库连接失败

**问题**: 后端无法连接数据库

**解决方案**:
```bash
# 检查数据库容器状态
docker-compose ps db

# 查看数据库日志
docker-compose logs db

# 确认数据库已启动
docker-compose exec db pg_isready -U exam_user
```

#### 3. 前端无法访问后端

**问题**: 前端报错 "Network Error"

**解决方案**:
```bash
# 检查后端服务状态
curl http://localhost:13000/health

# 检查nginx配置
docker-compose logs frontend

# 确认后端容器名称
docker-compose ps
```

#### 4. 容器启动失败

**问题**: 容器反复重启

**解决方案**:
```bash
# 查看容器日志
docker-compose logs [service_name]

# 检查资源使用情况
docker stats

# 重新构建镜像
docker-compose build [service_name]
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# 实时查看日志
docker-compose logs -f --tail=100 backend
```

## 🔒 安全说明

### 安全特性

- ✅ 系统默认绑定localhost，无外部访问风险
- ✅ 数据库密码通过环境变量管理
- ✅ 所有服务运行在隔离的Docker容器中
- ✅ 使用自定义Docker网络隔离服务

### 生产环境建议

1. **修改默认密码**: 修改数据库密码和Redis密码
2. **配置HTTPS**: 使用Nginx配置SSL证书
3. **限制访问**: 配置防火墙规则，限制IP访问
4. **定期备份**: 设置定时任务自动备份数据
5. **监控告警**: 配置服务监控和告警系统
6. **日志审计**: 定期检查系统日志，发现异常行为

### 配置文件检查清单

- [ ] 修改 docker-compose.yml 中的数据库密码
- [ ] 修改 docker-compose.yml 中的端口映射（如需要）
- [ ] 配置环境变量文件 .env
- [ ] 检查 nginx.conf 配置
- [ ] 设置防火墙规则

## 🌐 访问地址

| 服务 | 本地访问 | 说明 |
|------|----------|------|
| 前端界面 | http://localhost:18080 | Web用户界面 |
| 后端API | http://localhost:13000 | REST API服务 |
| 健康检查 | http://localhost:13000/health | 服务健康状态 |
| 数据库 | localhost:15432 | PostgreSQL数据库 |
| Redis | localhost:16379 | Redis缓存服务 |

## 📦 项目结构

```
exam-prep-system/
├── docker-compose.yml      # Docker编排配置
├── deploy.sh               # 一键部署脚本
├── backup.sh               # 数据备份脚本
├── restore.sh              # 数据恢复脚本
├── init-data.sh            # 数据初始化脚本
├── .env.example            # 环境变量模板
├── README.md               # 项目文档
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── components/     # Vue组件
│   │   ├── App.vue         # 主应用组件
│   │   └── main.js         # 应用入口
│   ├── Dockerfile          # 前端Docker配置
│   └── nginx.conf          # Nginx配置
├── backend/                # 后端项目
│   ├── server.js           # Express服务器
│   ├── init-db.sql         # 数据库初始化脚本
│   └── Dockerfile          # 后端Docker配置
└── data/                   # 数据持久化目录
    ├── db/                 # PostgreSQL数据
    └── redis/              # Redis数据
```

## 📈 性能优化建议

1. **数据库优化**
   - 已使用OFFSET替代ORDER BY RANDOM()提高查询效率
   - 建议定期执行VACUUM清理数据库

2. **缓存策略**
   - 可添加Redis缓存热点题目数据
   - 考虑实现题目预加载机制

3. **资源限制**
   - 在docker-compose.yml中配置资源限制
   - 监控容器资源使用情况

## 🔄 更新日志

### v1.2.0 (2026-04-03)

#### 🐛 重大Bug修复

**1. 数据更新响应式问题**
- **问题**: 文档练习完成后，"已练"和"准确率"统计数据不更新
- **根因**: Vue响应式系统在`<keep-alive>`组件中未正确触发更新
- **修复**:
  - `frontend/src/components/DocumentReview.vue`: 使用 `this.$set()` 和 `this.$forceUpdate()` 确保响应式更新
  - 添加智能刷新机制，统计数据更新时保持筛选状态
- **影响**: 修复了文档练习后返回时数据不刷新的问题

**2. 准确率计算错误**
- **问题**: 准确率错误地显示为 `正确数/总题数` 而非 `正确数/已练数`
- **示例**: 已练3题，答对2题，应显示66.7%，但错误显示1.1% (2/185)
- **修复文件**:
  - `backend/unified-stats-api.js`: 修复所有统计API的准确率计算
    - by_document, by_type, by_law_category, by_tech_category, by_exam_category
  - `backend/document-review-api.js`: 修复文档列表和统计API
- **正确公式**: `accuracy = correct_questions / practiced_questions`

**3. PostgreSQL类型错误**
- **问题**: `function round(double precision, integer) does not exist`
- **修复**: `backend/unified-core/unified-state.js` - 使用 `CAST(...AS numeric)` 替代 `::float`
- **影响**: 修复了统一统计API的类型兼容性问题

**4. 文档名称匹配增强**
- **修复**: `backend/document-review-api.js` - 添加URL解码和模糊匹配支持
- **改进**: 处理中文文档名称的URL编码问题

#### ✅ 测试验证
- ✅ 数据库数据正确保存
- ✅ API返回正确的统计数据
- ✅ 前端正确显示更新后的数据
- ✅ 准确率计算正确 (例: 已练3题，正确2题 = 66.7%)

### v1.1.0 (2026-03-30)

- ✨ 新增错题管理功能
- ✨ 新增智能复习提醒
- 🐛 修复环境变量配置不一致问题
- ⚡ 优化随机题目查询性能
- 🎨 重构前端组件，提高代码可维护性
- 📝 完善API文档和部署文档

### v1.0.0 (2026-03-28)

- 🎉 初始版本发布
- ✅ 基础练习功能
- ✅ 题库数据导入
- ✅ Docker容器化部署

## 📞 技术支持

### 问题排查步骤

1. 检查Docker和Docker Compose版本
2. 检查端口是否被占用
3. 查看服务日志定位问题
4. 确认系统资源是否充足
5. 参考本文档故障排查章节

### 常用检查命令

```bash
# 检查Docker版本
docker --version
docker-compose --version

# 检查端口占用
netstat -tunlp | grep -E '18080|13000|15432|16379'

# 检查磁盘空间
df -h

# 检查内存使用
free -h

# 检查Docker资源
docker stats --no-stream
```

## 📄 许可证

本项目仅供内部使用，未经许可不得外部分发。

---

**版本**: 1.2.0
**最后更新**: 2026-04-03
**维护团队**: 密评备考系统开发组
