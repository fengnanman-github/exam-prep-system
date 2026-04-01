# 密评备考系统

Vue3前端 + Express后端 + PostgreSQL数据库的密评考试备考系统。

## 项目概述

帮助考生备考商用密码应用安全性评估从业人员考核，提供5000+题库、智能练习、错题管理等功能。

## 快速开始

```bash
# 启动所有服务
docker-compose up -d

# 前端开发
cd frontend && npm run dev

# 后端开发
cd backend && npm run dev
```

## 技术栈

- **前端**: Vue3 + Vite + Pinia
- **后端**: Express + JWT认证
- **数据库**: PostgreSQL (Docker)
- **容器**: Docker Compose

## 服务端口

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:18080 |
| 后端API | http://localhost:3000 |
| 数据库 | localhost:15432 |

## 核心功能

- 按文档复习
- 按考试类别练习（密评5大类别）
- 智能复习（间隔重复算法）
- 错题本管理
- 模拟考试
- 进度统计

## 考试信息

- **题量**: 140道（单选60+多选60+判断20）
- **时间**: 90分钟
- **类别占比**:
  - 密码应用与安全性评估实务综合: 30%
  - 密码技术基础及相关标准: 20%
  - 密码产品原理、应用及相关标准: 20%
  - 密评理论、技术及相关标准: 20%
  - 密码政策法规: 10%

## 常用命令

| 命令 | 功能 |
|------|------|
| `commit` | 智能Git提交 |
| `docker` | Docker容器操作 |
| `database` | 数据库查询 |
| `analyze-error` | 错误分析 |

## 测试账号

- **admin** / **admin123** - 管理员
- **liujialiang** / **liujialiang123** - 普通用户

## 开发规范

- 使用Grep/Glob而非find/grep
- 优先使用Edit而非Write
- 并行处理多个任务
- 先定位问题，再读取文件
