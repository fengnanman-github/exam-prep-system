---
name: commit
description: 智能Git提交 - 自动分析变更并生成规范的提交信息
author: Claude Code
---

# Git Commit Skill

自动分析暂存的变更，生成符合项目规范的提交信息，并执行提交。

## 使用方法

```bash
git add <files>
git status | commit
```

## 提交信息格式

根据变更类型自动生成：

- **前端变更** (frontend/) → "前端优化 - 变更说明"
- **后端变更** (backend/) → "后端优化 - 变更说明"
- **配置变更** (*.json, *.config) → "配置优化 - 变更说明"
- **文档变更** (*.md) → "文档更新 - 变更说明"

## 自动执行

1. 分析暂存文件
2. 确定变更类型
3. 生成提交信息
4. 执行git commit
5. 显示提交结果

## 示例

```bash
$ git add frontend/src/components/NewComponent.vue
$ git status | commit

✅ 检测到前端变更
📝 生成提交信息: "前端优化 - 添加NewComponent组件"
[main 8a2b3c] 前端优化 - 添加NewComponent组件
```
