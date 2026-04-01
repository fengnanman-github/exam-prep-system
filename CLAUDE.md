# 密评备考系统 - 快速参考

## 🏗️ 项目结构
```
exam-prep-system-package-20260330/
├── frontend/           # Vue3前端 (Vite)
├── backend/            # Express后端
├── .claude/             # Claude配置
└── docker-compose.yml   # Docker配置
```

## 🚀 快速命令

| 命令 | 功能 |
|------|------|
| `/restart-backend` | 重启后端服务 |
| `/rebuild-frontend` | 重建并部署前端 |
| `/check-backend` | 检查后端和数据库状态 |
| `/list-users` | 查看所有用户 |

## 🔧 技术栈
- **前端**: Vue3 + Vite + Pinia
- **后端**: Node.js + Express
- **数据库**: PostgreSQL (Docker)
- **认证**: JWT

## 🌐 服务端口
| 服务 | 端口 |
|------|------|
| 前端 | 18080 |
| 后端 | 3000 |
| 数据库 | 15432 |

## 👥 测试账号
测试账号请查看本地配置文件，避免密码泄露到代码仓库。
