---
name: analyze-error
description: 错误分析和调试助手
author: Claude Code
---

# 错误分析Skill

快速分析和定位代码错误。

## 使用方法

当遇到错误时，提供以下信息：
- 错误信息
- 错误发生的位置（文件名、行号）
- 操作步骤

## 自动分析流程

1. **定位错误源**
   - 前端：检查Vue组件、API调用、状态管理
   - 后端：检查API路由、数据库查询、业务逻辑
   - 数据库：检查连接、查询语法、数据完整性

2. **常见问题模式**
   - `Cannot find module` → 缺少依赖包
   - `ECONNREFUSED` → 服务未启动或端口错误
   - `404 Not Found` → API端点不存在
   - `500 Internal Error` → 后端代码错误

3. **提供解决方案**
   - 快速修复步骤
   - 验证方法
   - 预防措施

## 示例

```
错误: "Cannot find module 'bcryptjs'"
分析: backend/auth/auth-controller.js缺少依赖
解决: cd backend && npm install bcryptjs
```
