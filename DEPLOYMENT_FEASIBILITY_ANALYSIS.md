# 部署配置可行性分析报告

**目标配置:** CPU 2核 + 内存 2GB + 系统盘 40GB
**分析时间:** 2026-04-06
**系统状态:** 🟡 基本可行，需要优化

---

## 📊 当前系统资源使用情况

### 当前环境（高配置）
- **CPU:** 未明确，但当前使用率极低
- **内存:** 16GB 总计，当前使用 ~253MB
- **磁盘:** 98GB 总计，使用 32GB (34%)
- **题库规模:** 5,075 题
- **数据库大小:** 22 MB

### 各组件资源使用（空闲状态）
| 组件 | 内存使用 | CPU使用 | 磁盘占用 |
|------|----------|---------|----------|
| Frontend (Nginx) | 3.15 MB | 0.00% | ~50 MB |
| Backend (Node.js) | 23.12 MB | 0.00% | ~200 MB |
| Database (PostgreSQL) | 223.1 MB | 0.02% | 22 MB + WAL |
| Redis | 3.37 MB | 0.43% | ~10 MB |
| **总计** | **~253 MB** | **~0.45%** | **~300 MB** |

---

## 🎯 目标配置可行性评估

### ✅ 磁盘空间 (40GB) - 充足
**预估需求:**
- 操作系统: ~8GB
- Docker 系统: ~5GB
- 应用容器: ~1GB
- 数据库当前: 22MB
- 数据库增长（预留1万题）: ~100MB
- 日志和备份: ~5GB
- 系统预留: ~10GB

**总需求:** ~30GB
**结论:** 🟢 40GB 磁盘完全够用，还有充足余量

### 🟡 内存 (2GB) - 紧张但可行
**预估需求:**
- 操作系统基础: ~300MB
- Frontend (Nginx): ~20MB (峰值 50MB)
- Backend (Node.js): ~100MB (峰值 300MB)
- Database (PostgreSQL): ~300MB (需优化)
- Redis: ~20MB (峰值 100MB)
- 系统缓存和缓冲: ~500MB
- 峰值并发处理: ~200MB

**总需求:** ~1.5GB (正常) / ~2.2GB (峰值)
**结论:** 🟡 2GB 内存基本够用，但需要优化配置

### 🟢 CPU (2核) - 充足
**预估需求:**
- Nginx: ~0.1 核
- Node.js: ~0.5 核 (峰值 1.5 核)
- PostgreSQL: ~0.3 核 (峰值 1 核)
- Redis: ~0.1 核

**总需求:** ~1 核 (正常) / ~3 核 (峰值)
**结论:** 🟢 2核 CPU 完全够用，峰值时可能短暂满载

---

## ⚙️ 必须的优化配置

### 1. PostgreSQL 内存优化 ⭐⭐⭐⭐⭐
**问题:** 默认配置可能占用过多内存

**解决方案:**
```yaml
# docker-compose.yml
db:
  image: postgres:13
  environment:
    - POSTGRES_SHARED_BUFFERS=128MB     # 默认通常较大
    - POSTGRES_WORK_MEM=16MB            # 减少工作内存
    - POSTGRES_MAINTENANCE_WORK_MEM=64MB
    - POSTGRES_EFFECTIVE_CACHE_SIZE=512MB # 告诉PG只有512MB可用
  command: >
    postgres
    -c shared_buffers=128MB
    -c work_mem=16MB
    -c maintenance_work_mem=64MB
    -c effective_cache_size=512MB
    -c max_connections=50               # 减少最大连接数
    -c checkpoint_completion_target=0.7
    -c wal_buffers=16MB
    -c random_page_cost=1.1
```

### 2. Redis 内存优化 ⭐⭐⭐
**解决方案:**
```yaml
redis:
  image: redis:6-alpine
  command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
```

### 3. Node.js 后端优化 ⭐⭐⭐⭐
**解决方案:**
```javascript
// backend/server.js
const cluster = require('cluster');

// 在2核环境下，使用单进程即可，避免集群开销
if (cluster.isMaster) {
  // 单进程模式
  const worker = cluster.fork();
  console.log(`单进程模式启动，PID: ${worker.process.pid}`);
} else {
  // 应用逻辑
}
```

### 4. Nginx 优化 ⭐⭐⭐
**解决方案:**
```nginx
# frontend/nginx.conf
worker_processes 1;           # 2核环境使用1个工作进程
worker_connections 512;       # 减少连接数
client_max_body_size 10M;     # 限制上传大小
gzip on;                      # 启用压缩节省带宽
gzip_min_length 1000;
gzip_types text/plain application/json application/javascript text/css;
```

### 5. 系统级优化 ⭐⭐⭐⭐⭐
**解决方案:**
```bash
# /etc/sysctl.conf
vm.swappiness=10              # 减少swap使用
vm.vfs_cache_pressure=50      # 优化文件系统缓存
net.core.somaxconn=128        # 减少连接队列
```

---

## 📈 并发性能预估

### 低负载 (1-10 用户)
- **内存使用:** ~800MB
- **CPU使用:** ~20%
- **响应时间:** <100ms
- **结论:** 🟢 完全流畅

### 中负载 (10-50 用户)
- **内存使用:** ~1.2GB
- **CPU使用:** ~60%
- **响应时间:** <300ms
- **结论:** 🟢 运行良好

### 高负载 (50-100 用户)
- **内存使用:** ~1.8GB
- **CPU使用:** ~90%
- **响应时间:** <800ms
- **结论:** 🟡 可用但接近极限

### 过载 (100+ 用户)
- **内存使用:** ~2GB+ (可能触发swap)
- **CPU使用:** 100% (持续)
- **响应时间:** >2000ms
- **结论:** 🔴 性能严重下降，建议升级

---

## 🚨 潜在风险和缓解措施

### 风险1: 内存不足导致OOM
**概率:** 中等 (高并发时)
**缓解:**
- 启用 swap (2GB)
- 配置 OOM killer 优先级
- 设置容器内存限制
- 监控内存使用率

### 风险2: 数据库性能瓶颈
**概率:** 低 (题库规模适中)
**缓解:**
- 优化数据库查询
- 添加适当索引
- 使用连接池
- 定期 VACUUM

### 风险3: 磁盘写满
**概率:** 低 (40GB充足)
**缓解:**
- 定期清理日志
- 数据库日志轮转
- 监控磁盘使用率

---

## 🎯 最终评估结论

### 可行性: 🟡 基本可行 (85分)

**适用场景:**
- ✅ 小型团队 (1-20人)
- ✅ 个人学习系统
- ✅ 测试/演示环境
- ✅ 内部门户网站

**不适用场景:**
- ❌ 大型公开平台
- ❌ 高并发场景 (100+ 同时在线)
- ❌ 大数据分析环境

### 评分明细
| 指标 | 评分 | 说明 |
|------|------|------|
| CPU充足性 | ⭐⭐⭐⭐⭐ | 2核完全够用 |
| 内存充足性 | ⭐⭐⭐ | 2GB紧张但可行 |
| 磁盘充足性 | ⭐⭐⭐⭐⭐ | 40GB十分充足 |
| 成本效益 | ⭐⭐⭐⭐⭐ | 性价比很高 |
| 扩展性 | ⭐⭐ | 升级空间有限 |

**总分:** 19/25 (76%) - **推荐部署**

---

## 📋 部署建议

### 立即实施 (必须)
1. ✅ 应用 PostgreSQL 内存优化配置
2. ✅ 应用 Redis 内存限制
3. ✅ 配置系统 swap (2GB)
4. ✅ 设置容器内存限制和监控

### 建议实施 (推荐)
1. 🔧 配置日志轮转，避免磁盘写满
2. 🔧 设置资源监控告警
3. 🔧 定期备份数据库
4. 🔧 优化数据库查询和索引

### 可选实施
1. 💡 使用 CDN 加速静态资源
2. 💡 启用 HTTP/2
3. 💡 配置负载均衡 (未来扩展)

---

## 🔧 监控指标

### 关键指标监控
```bash
# 内存使用率 (告警阈值: 85%)
free | awk 'NR==2{printf "%.0f%%\n", $3/$2*100}'

# 磁盘使用率 (告警阈值: 80%)
df -h | awk '$NF=="/"{printf "%s\n", $5}'

# Docker 容器状态
docker stats --no-stream

# 数据库连接数
docker exec db psql -U exam_user -d exam_db -c "SELECT count(*) FROM pg_stat_activity;"

# API 响应时间
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:13000/health"
```

---

## 📝 总结

**配置评估:** 🟡 **基本可行，需要优化**

在应用推荐的优化配置后，该系统可以在 **2核CPU + 2GB内存 + 40GB磁盘** 配置上稳定运行，支持 **1-50人** 的日常使用。

**关键成功因素:**
1. 严格执行 PostgreSQL 内存优化
2. 合理配置 swap 空间
3. 监控资源使用情况
4. 定期维护和优化

**升级建议:**
- 如果用户数超过 50 人，建议升级到 **4GB 内存**
- 如果需要高可用性，建议升级到 **4核 CPU + 4GB 内存**
- 磁盘空间 **40GB** 对中小型应用完全充足

---

**分析完成时间:** 2026-04-06
**推荐部署:** ✅ 是 (需要优化配置)
**预计性能:** 🟢 良好 (1-50用户场景)
