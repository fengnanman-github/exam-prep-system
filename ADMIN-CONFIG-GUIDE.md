# 管理员配置管理功能使用指南

## 功能概述

管理员配置管理功能允许管理员动态调整系统的题目范围、文档范围和自动更新规则，无需重启系统即可生效。

## 数据库表结构

### admin_config
存储系统配置的主表，支持多种配置类型：
- **题目范围配置**: 控制各种练习模式的可用题目
- **文档范围配置**: 控制文档模式的可用文档
- **自动更新规则**: 控制SuperMemo算法和状态同步

### admin_config_history
记录所有配置变更历史，支持审计和回滚。

## API端点

### 公开端点（无需认证）

#### `GET /api/v2/public/admin-config/health`
配置健康检查，返回配置数量和状态。

```bash
curl http://localhost:13000/api/v2/public/admin-config/health
```

**响应示例**:
```json
{
  "success": true,
  "status": "healthy",
  "config_count": 12,
  "timestamp": 1775122768894
}
```

### 管理员端点（需要管理员权限）

#### `GET /api/v2/admin/system-config`
获取所有系统配置。

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:13000/api/v2/admin/system-config
```

#### `PUT /api/v2/admin/system-config/:key`
更新指定配置。

**请求体**:
```json
{
  "value": <配置值>,
  "reason": "更新原因（可选）"
}
```

**示例 - 更新随机练习题目范围**:
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "mode": "category",
      "filters": {
        "categories": ["密码政策法规", "密码技术基础及相关标准"],
        "exclude_ids": [1, 2, 3]
      }
    },
    "reason": "限制随机练习到特定类别"
  }' \
  http://localhost:13000/api/v2/admin/system-config/random_question_scope
```

#### `POST /api/v2/admin/system-config/batch`
批量更新多个配置。

**请求体**:
```json
{
  "configs": {
    "random_question_scope": {...},
    "practice_question_scope": {...}
  },
  "reason": "批量更新原因"
}
```

#### `GET /api/v2/admin/question-scopes`
获取所有题目范围配置。

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:13000/api/v2/admin/question-scopes
```

**响应示例**:
```json
{
  "success": true,
  "scopes": {
    "practice": {"mode": "all", "filters": {}},
    "category": {"mode": "all", "filters": {}},
    "exam_category": {"mode": "all", "filters": {}},
    "document": {"mode": "all", "filters": {}},
    "random": {"mode": "all", "filters": {}}
  },
  "timestamp": 1775122768894
}
```

#### `PUT /api/v2/admin/question-scope/:type`
更新指定类型的题目范围。

**支持的类型**: `practice`, `category`, `exam_category`, `document`, `random`

**示例 - 设置分类练习只使用特定分类**:
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "category",
    "filters": {
      "categories": ["密码政策法规", "密码技术基础及相关标准"]
    }
  }' \
  http://localhost:13000/api/v2/admin/question-scope/category
```

#### `GET /api/v2/admin/document-scopes`
获取所有文档范围配置。

#### `PUT /api/v2/admin/document-scope/:type`
更新指定类型的文档范围。

**支持的类型**: `practice`, `review`

## 配置格式

### 题目范围配置

```json
{
  "mode": "all" | "category" | "exam_category" | "custom" | "document",
  "filters": {
    // mode为category时使用
    "categories": ["分类1", "分类2"],

    // mode为exam_category时使用
    "exam_categories": ["考试类别1", "考试类别2"],

    // mode为custom时使用
    "question_ids": [1, 2, 3],

    // mode为document时使用
    "document_ids": [1, 2, 3],

    // 任何模式下都可以使用
    "exclude_ids": [4, 5, 6]
  }
}
```

### 文档范围配置

```json
{
  "mode": "all" | "category" | "custom",
  "filters": {
    "categories": ["分类1", "分类2"],
    "document_ids": [1, 2, 3],
    "exclude_ids": [4, 5, 6]
  }
}
```

## 使用场景

### 场景1: 限制随机练习到特定知识点

```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "category",
    "filters": {
      "categories": ["密码政策法规", "商用密码管理条例"]
    }
  }' \
  http://localhost:13000/api/v2/admin/question-scope/random
```

### 场景2: 设置考试类别练习只使用特定考试类别

```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "exam_category",
    "filters": {
      "exam_categories": ["三级", "四级"],
      "exclude_ids": [100, 101]
    }
  }' \
  http://localhost:13000/api/v2/admin/question-scope/exam_category
```

### 场景3: 自定义题目集合

```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "custom",
    "filters": {
      "question_ids": [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
    }
  }' \
  http://localhost:13000/api/v2/admin/question-scope/practice
```

### 场景4: 排除特定题目

```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "all",
    "filters": {
      "exclude_ids": [1, 2, 3, 4, 5]
    }
  }' \
  http://localhost:13000/api/v2/admin/question-scope/practice
```

## 配置热重载

所有配置更新后立即生效，无需重启系统。配置变更会触发以下操作：

1. **缓存清除**: 相关配置缓存自动清除
2. **事件通知**: 发送 `config:changed` 事件，系统其他部分可以监听此事件
3. **下次查询生效**: 下次API调用时自动使用新配置

## 配置历史查询

查看配置变更历史：

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:13000/api/v2/admin/system-config/random_question_scope/history
```

## 注意事项

1. **权限要求**: 所有管理员API需要有效的管理员JWT token
2. **格式验证**: 配置值必须符合指定的JSON格式
3. **影响范围**: 配置变更会影响所有用户的对应功能
4. **备份建议**: 重大配置变更前建议先记录当前配置

## 故障排查

### 配置更新后没有生效

1. 检查配置格式是否正确
2. 查看配置历史确认更新是否成功
3. 清除浏览器缓存（前端可能有缓存）

### API返回403错误

确认JWT token有效且用户具有管理员权限。

### 配置格式错误

检查JSON格式，特别注意：
- mode必须是有效的枚举值
- filters必须与mode匹配
- 数组使用正确的JSON数组格式
