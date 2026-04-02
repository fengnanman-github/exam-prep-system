# 密评备考系统 - 灰度发布计划

## 概述

本文档描述密评备考系统统一核心逻辑的灰度发布计划，确保平滑过渡到新版本。

---

## 发布阶段

### 阶段0：准备阶段（已完成）

| 任务 | 状态 | 说明 |
|------|------|------|
| 功能开发 | ✅ | 所有核心功能已开发完成 |
| 测试环境验证 | ✅ | 测试环境完整验证通过 |
| 自动化测试 | ✅ | 单元测试和集成测试通过 |
| 性能测试 | ✅ | 所有性能指标达标 |
| 回滚方案 | ✅ | 回滚脚本已准备 |

---

### 阶段1：白名单测试（Day 1-3）

**目标**：小范围验证新功能

**用户群体**：内部测试用户
```
test_user_1, test_user_2, admin_test
```

**执行命令**：
```sql
-- 为测试用户启用统一题目状态
UPDATE feature_flags
SET enabled_for_users = ARRAY['test_user_1', 'test_user_2', 'admin_test']
WHERE feature_name = 'unified_question_state';

-- 查看配置
SELECT feature_name, is_enabled, enabled_for_users
FROM feature_flags;
```

**监控指标**：
- 错误率 < 0.1%
- API响应时间 P95 < 100ms
- 无用户反馈的重大问题

**成功标准**：
- 测试用户正常使用3天无重大问题
- 所有核心功能正常工作

**退出条件**：
- 发现重大Bug立即回滚
- 连续3天无重大问题进入下一阶段

---

### 阶段2：10%灰度（Day 4-6）

**目标**：扩大测试范围，收集真实用户反馈

**用户群体**：10%随机用户

**执行命令**：
```sql
-- 设置10%灰度
UPDATE feature_flags
SET enabled_percentage = 10,
    enabled_for_users = NULL  -- 清除白名单
WHERE feature_name = 'unified_question_state';

-- 验证配置
SELECT feature_name, is_enabled, enabled_percentage
FROM feature_flags;
```

**监控指标**：
- 错误率与旧版本对比
- API响应时间对比
- 用户行为变化
- 用户反馈收集

**数据收集**：
```sql
-- 查看功能使用情况
SELECT
    COUNT(DISTINCT user_id) as total_users,
    COUNT(DISTINCT CASE WHEN feature_enabled THEN user_id END) as enabled_users
FROM user_feature_usage
WHERE feature_name = 'unified_question_state'
AND date >= CURRENT_DATE - INTERVAL '3 days';
```

**成功标准**：
- 错误率不超过旧版本120%
- 用户正面反馈 > 80%
- 无重大性能问题

---

### 阶段3：25%灰度（Day 7-10）

**目标**：进一步扩大用户范围

**执行命令**：
```sql
UPDATE feature_flags
SET enabled_percentage = 25
WHERE feature_name = 'unified_question_state';
```

**新增功能**：
- 启用统一遗忘算法（25%灰度）
```sql
UPDATE feature_flags
SET enabled_percentage = 25
WHERE feature_name = 'unified_supermemo';
```

**监控重点**：
- SuperMemo算法效果
- 复习提醒准确性
- 用户学习进度变化

---

### 阶段4：50%灰度（Day 11-14）

**目标**：半数用户使用新版本

**执行命令**：
```sql
UPDATE feature_flags
SET enabled_percentage = 50
WHERE feature_name IN ('unified_question_state', 'unified_supermemo');
```

**启用统一统计**：
```sql
UPDATE feature_flags
SET enabled_percentage = 50
WHERE feature_name = 'unified_stats';
```

**监控重点**：
- 统计数据准确性
- 跨模式同步效果
- 整体系统稳定性

---

### 阶段5：100%全量（Day 15+）

**目标**：所有用户使用新版本

**执行命令**：
```sql
-- 全量启用
UPDATE feature_flags
SET is_enabled = true,
    enabled_percentage = 100;
```

**观察期**：7天持续监控

---

## 监控指标

### 技术指标

| 指标 | 目标值 | 告警阈值 | 检测方式 |
|------|--------|----------|----------|
| API错误率 | < 0.1% | > 0.5% | 日志监控 |
| API响应时间P95 | < 100ms | > 200ms | APM监控 |
| API响应时间P99 | < 200ms | > 500ms | APM监控 |
| 数据库查询时间 | < 50ms | > 100ms | 慢查询日志 |
| 内存使用率 | < 80% | > 90% | 容器监控 |
| CPU使用率 | < 70% | > 90% | 容器监控 |

### 业务指标

| 指标 | 目标 | 检测方式 |
|------|------|----------|
| 日活跃用户 | 无明显下降 | 统计分析 |
| 练习完成率 | 无明显下降 | 统计分析 |
| 用户反馈 | >80%正面 | 问卷/客服 |
| 客服投诉 | 无明显增加 | 工单系统 |

---

## 回滚决策树

```
发现问题时
    |
    v
是否为关键问题？（数据丢失、安全漏洞、系统不可用）
    |
    +-- YES --> 立即回滚
    |           执行: scripts/rollback-production.sh
    |
    +-- NO --> 问题类型？
                 |
    +-- 功能Bug --> 评估修复时间
    |              |
    |              +-- < 2小时 --> 修复并热更新
    |              |
    |              +-- > 2小时 --> 回滚
    |
    +-- 性能问题 --> 影响范围？
                   |
                   +-- < 10%用户 --> 继续观察
                   |
                   +-- > 10%用户 --> 回滚
```

---

## 回滚操作

### 立即回滚（推荐使用脚本）
```bash
scripts/rollback-production.sh
```

### 手动回滚步骤

1. **关闭功能开关**
```sql
UPDATE feature_flags
SET is_enabled = false,
    enabled_for_users = NULL,
    enabled_percentage = 0;
```

2. **重启服务**
```bash
docker compose restart backend
```

3. **验证回滚**
```bash
curl http://localhost:13000/api/v2/version/config
```

### 数据库回滚（仅必要时）
```bash
# 使用备份恢复
psql -h localhost -U exam_user -d exam_db < backups/production/db_backup_YYYYMMDD_HHMMSS.sql
```

---

## 发布检查清单

### 发布前

- [ ] 代码审查完成
- [ ] 所有测试通过
- [ ] 性能测试达标
- [ ] 备份完成
- [ ] 回滚脚本准备
- [ ] 监控告警配置
- [ ] 用户通知准备

### 发布中

- [ ] 数据库迁移成功
- [ ] 服务重启成功
- [ ] 健康检查通过
- [ ] 功能开关配置正确

### 发布后

- [ ] 错误率正常
- [ ] 响应时间正常
- [ ] 用户反馈收集
- [ ] 监控指标正常

---

## 紧急联系

**技术负责人**：[联系方式]
**产品负责人**：[联系方式]
**运维负责人**：[联系方式]

---

*文档版本：1.0*
*最后更新：2026-04-02*
*负责人：Claude Opus 4.6*
