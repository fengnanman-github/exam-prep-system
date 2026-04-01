# 文档标注方法说明

**更新日期**: 2026-04-01

---

## 📋 标注原理

文档标注使用**关键词匹配算法**，通过在题目文本中搜索预定义的关键词，自动将题目关联到对应的法律法规或技术标准。

---

## 🎯 核心机制

### 1. 关键词配置

每个文档都配置了一组特征关键词，存储在 `document-categories.js` 中：

```javascript
'密码法': {
  category: '法律法规',
  priority: 5,
  icon: '📜',
  color: '#ef4444',
  description: '商用密码领域根本大法',
  keywords: ['密码', '商用密码', '密码管理', '密码安全', '密码产品']
}
```

### 2. 匹配算法

使用 PostgreSQL 的 `ILIKE` 进行模糊匹配（不区分大小写）：

```sql
UPDATE questions
SET
  original_document = '密码法',
  document_category = '法律法规',
  document_priority = 5
WHERE original_document IS NULL
  AND (question_text ILIKE '%密码%'
    OR question_text ILIKE '%商用密码%'
    OR question_text ILIKE '%密码管理%'
    OR question_text ILIKE '%密码安全%'
    OR question_text ILIKE '%密码产品%')
```

### 3. 批量更新流程

```
1. 遍历所有文档（按优先级从高到低）
2. 对每个文档生成关键词匹配条件
3. 只更新尚未标注的题目（original_document IS NULL）
4. 累计更新数量
5. 返回更新结果
```

---

## 🔧 技术实现

### API 端点

**POST** `/api/v2/documents/update-metadata`

### 代码逻辑

```javascript
// 从 DOCUMENT_CATEGORIES 生成更新语句
for (const [docName, docInfo] of Object.entries(DOCUMENT_CATEGORIES)) {
  const keywords = docInfo.keywords || [docName];
  const conditions = keywords.map(k =>
    `question_text ILIKE '%${k}%'`
  ).join(' OR ');

  // 生成 SQL 更新语句
  const sql = `
    UPDATE questions
    SET
      original_document = '${docName}',
      document_category = '${docInfo.category}',
      document_priority = ${docInfo.priority}
    WHERE original_document IS NULL
      AND (${conditions})
  `;

  // 执行更新
  await pool.query(sql);
}
```

---

## 📊 标注示例

### 示例 1：密码法

**题目文本**：
```
根据《密码法》规定，商用密码技术属于以下哪一类？
```

**匹配过程**：
- 关键词：`['密码', '商用密码', '密码管理', '密码安全', '密码产品']`
- 匹配结果：包含"密码"、"商用密码" ✅
- 标注结果：
  ```json
  {
    "original_document": "密码法",
    "document_category": "法律法规",
    "document_priority": 5
  }
  ```

### 示例 2：SM2算法

**题目文本**：
```
SM2椭圆曲线公钥密码算法的密钥长度是多少位？
```

**匹配过程**：
- 关键词：`['SM2', '椭圆曲线', '公钥密码', '数字签名', '密钥交换']`
- 匹配结果：包含"SM2"、"椭圆曲线"、"公钥密码" ✅
- 标注结果：
  ```json
  {
    "original_document": "SM2椭圆曲线公钥密码算法",
    "document_category": "技术标准",
    "document_priority": 5
  }
  ```

### 示例 3：数据安全法

**题目文本**：
```
根据《数据安全法》，核心数据是指什么？
```

**匹配过程**：
- 关键词：`['数据安全', '数据处理', '个人信息', '重要数据', '核心数据']`
- 匹配结果：包含"数据安全"、"核心数据" ✅
- 标注结果：
  ```json
  {
    "original_document": "数据安全法",
    "document_category": "法律法规",
    "document_priority": 5
  }
  ```

---

## 🎨 优先级处理

### 标注顺序

文档按**优先级从高到低**依次处理：

```
优先级 5 → 优先级 4 → 优先级 3 → 优先级 2 → 优先级 1
```

### 冲突解决

如果一个题目匹配多个文档的关键词：

1. **只标注第一次匹配**（`WHERE original_document IS NULL`）
2. **高优先级优先**（按优先级顺序处理）
3. **已标注的题目不会被覆盖**

**示例**：
```
题目：商用密码产品检测认证要求
关键词匹配：
- 密码法（优先级5）✅ 匹配"商用密码"、"密码产品"
- 商用密码管理条例（优先级5）✅ 匹配"商用密码"、"密码产品"

结果：标注为"密码法"（先处理的文档）
```

---

## 📝 使用方式

### 方式 1：API 调用（推荐）

```bash
curl -X POST http://localhost:13000/api/v2/documents/update-metadata
```

**返回结果**：
```json
{
  "message": "文档元数据更新完成",
  "updated_count": 4550,
  "total_documents": 37
}
```

### 方式 2：直接 SQL

```sql
-- 单个文档标注
UPDATE questions
SET
  original_document = '密码法',
  document_category = '法律法规',
  document_priority = 5
WHERE original_document IS NULL
  AND (
    question_text ILIKE '%密码%'
    OR question_text ILIKE '%商用密码%'
    OR question_text ILIKE '%密码管理%'
    OR question_text ILIKE '%密码安全%'
    OR question_text ILIKE '%密码产品%'
  );

-- 查看标注结果
SELECT
  original_document,
  document_category,
  document_priority,
  COUNT(*) as question_count
FROM questions
WHERE original_document IS NOT NULL
GROUP BY original_document, document_category, document_priority
ORDER BY document_priority DESC, question_count DESC;
```

### 方式 3：手动标注

```sql
-- 单个题目标注
UPDATE questions
SET
  original_document = '密码法',
  document_category = '法律法规',
  document_priority = 5
WHERE id = 12345;

-- 批量手动标注（指定题目ID范围）
UPDATE questions
SET
  original_document = 'SM2椭圆曲线公钥密码算法',
  document_category = '技术标准',
  document_priority = 5
WHERE id IN (100, 200, 300, 400, 500);
```

---

## 🔍 质量控制

### 验证标注结果

```sql
-- 1. 查看标注统计
SELECT
  document_priority,
  COUNT(DISTINCT original_document) as doc_count,
  COUNT(*) as question_count
FROM questions
WHERE original_document IS NOT NULL
GROUP BY document_priority
ORDER BY document_priority DESC;

-- 2. 查看未标注题目
SELECT COUNT(*)
FROM questions
WHERE original_document IS NULL;

-- 3. 查看特定文档的题目
SELECT id, question_no, question_text
FROM questions
WHERE original_document = '密码法'
LIMIT 10;

-- 4. 查看可能有误标的题目
-- 例如：包含"密码"但不是密码法的题目
SELECT id, question_text, original_document
FROM questions
WHERE question_text ILIKE '%密码%'
  AND (original_document IS NULL
       OR original_document != '密码法')
LIMIT 20;
```

### 重新标注

```sql
-- 清空所有标注
UPDATE questions
SET
  original_document = NULL,
  document_category = NULL,
  document_priority = NULL;

-- 重新运行批量标注
curl -X POST http://localhost:13000/api/v2/documents/update-metadata
```

---

## ⚠️ 注意事项

### 1. 关键词设计原则

- **特征性强**：选择能代表文档的特有词汇
- **避免歧义**：不使用多个文档共有的通用词
- **适度匹配**：关键词不要太短或太通用

**好的关键词**：
```javascript
keywords: ['SM2', '椭圆曲线', '公钥密码', '数字签名算法']
```

**不好的关键词**：
```javascript
keywords: ['技术', '标准', '要求']  // 太通用，会误匹配
```

### 2. 标注顺序

- 先处理高优先级文档
- 已标注的题目不会再次标注
- 建议定期重新标注以更新

### 3. 准确性问题

**可能的问题**：
- 关键词过于宽泛导致误匹配
- 一个题目属于多个文档
- 题目文本不完整或不规范

**解决方案**：
- 优化关键词配置
- 手动审核和修正
- 添加更多的排除条件

---

## 📈 优化建议

### 1. 关键词优化

当前配置示例：
```javascript
'密码法': {
  keywords: ['密码', '商用密码', '密码管理', '密码安全', '密码产品']
}
```

优化建议：
```javascript
'密码法': {
  keywords: [
    '密码法',
    '《密码法》',
    '商用密码技术',
    '商用密码产品',
    '商用密码检测'
  ]
}
```

### 2. 添加排除规则

```javascript
'密码法': {
  keywords: ['密码', '商用密码'],
  excludes: [
    '网络安全法',  // 排除同时提到网络安全法的题目
    '数据安全法'   // 排除同时提到数据安全法的题目
  ]
}
```

### 3. 多字段匹配

```sql
-- 不仅匹配题目文本，还匹配选项
UPDATE questions
SET original_document = '密码法'
WHERE original_document IS NULL
  AND (
    question_text ILIKE '%密码法%'
    OR option_a ILIKE '%密码法%'
    OR option_b ILIKE '%密码法%'
    OR option_c ILIKE '%密码法%'
    OR option_d ILIKE '%密码法%'
  );
```

---

## 📊 当前标注结果

### 标注统计

| 优先级 | 文档数 | 题目数 | 占比 |
|--------|--------|--------|------|
| 5 (核心必考) | 9 | 3,912 | 86.0% |
| 4 (重要考点) | 9 | 342 | 7.5% |
| 3 (一般考点) | 5 | 201 | 4.4% |
| 2 (补充考点) | 3 | 82 | 1.8% |
| 1 (其他) | 2 | 13 | 0.3% |
| **总计** | **28** | **4,550** | **100%** |

### 主要文档

| 文档名称 | 题目数 | 分类 | 优先级 |
|---------|--------|------|--------|
| 密码法 | 3,550 | 法律法规 | ⭐⭐⭐⭐⭐ |
| SM2椭圆曲线公钥密码算法 | 140 | 技术标准 | ⭐⭐⭐⭐⭐ |
| 传输层密码协议（TLCP） | 107 | 技术标准 | ⭐⭐⭐⭐⭐ |
| 数据安全法 | 73 | 法律法规 | ⭐⭐⭐⭐⭐ |
| 电子签名法 | 17 | 法律法规 | ⭐⭐⭐⭐⭐ |

---

## 🎯 总结

### 标注方法优势

✅ **自动化**：一键批量标注数千道题目
✅ **可配置**：通过修改 keywords 调整匹配规则
✅ **可扩展**：轻松添加新的文档和关键词
✅ **可追溯**：保留原始标注依据

### 标注方法局限

⚠️ **依赖关键词质量**：需要精心设计关键词
⚠️ **可能误匹配**：通用词会导致错误标注
⚠️ **需要人工审核**：重要题目应人工验证

### 最佳实践

1. **定期重新标注**：添加新题目后运行批量更新
2. **人工抽样审核**：检查各文档标注的准确性
3. **持续优化关键词**：根据错误案例调整配置
4. **保留原始数据**：不清除 original_document 字段
