---
name: docker
description: Docker容器管理和部署操作
author: Claude Code
---

# Docker操作Skill

管理Docker容器的构建、运行和调试。

## 常用命令

### 容器管理
```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看容器日志
docker logs <container-name>

# 进入容器shell
docker exec -it <container-name> sh

# 停止容器
docker stop <container-name>

# 启动容器
docker start <container-name>

# 重启容器
docker restart <container-name>

# 删除容器
docker rm <container-name>
```

### 镜像管理
```bash
# 构建镜像
docker build -t <image-name> .

# 查看镜像
docker images

# 删除镜像
docker rmi <image-id>
```

### 网络管理
```bash
# 查看网络
docker network ls

# 创建网络
docker network create <network-name>

# 连接容器到网络
docker network connect <network-name> <container-name>
```

## 本项目快捷命令

- `/rebuild-frontend` - 重建并部署前端容器
- `/check-backend` - 检查所有服务状态

## 服务端口

| 服务 | 容器名 | 端口 |
|------|---------|------|
| 前端 | exam-prep-system-package-20260330-frontend-1 | 18080 |
| 后端 | (本地运行) | 3000 |
| 数据库 | exam-prep-system-package-20260330-db-1 | 15432 |
