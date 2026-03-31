# GitHub 仓库创建指南

本文档指导如何将密评备考系统推送到 GitHub，实现代码云端备份。

---

## 📋 前置准备

### 1. 检查 Git 仓库状态

```bash
cd ~/exam-prep-system-package-20260330
git status
```

**预期输出**:
```
位于分支 main
无文件待提交，干净的工作区
```

### 2. 查看提交历史

```bash
git log --oneline
```

---

## 🚀 方法一: 使用 GitHub CLI (推荐)

### 安装 GitHub CLI

```bash
# Ubuntu/Debian
sudo apt install gh

# 验证安装
gh --version
```

### 登录 GitHub

```bash
gh auth login
```

按提示选择:
- GitHub.com
- HTTPS
- Login with a web browser

### 创建仓库并推送

```bash
cd ~/exam-prep-system-package-20260330

# 创建仓库 (私有)
gh repo create exam-prep-system --private --source=. --remote=origin --push

# 或创建公开仓库
gh repo create exam-prep-system --public --source=. --remote=origin --push
```

---

## 🔧 方法二: 手动创建 (网页操作)

### 步骤 1: 在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 填写仓库信息:
   - **Repository name**: `exam-prep-system`
   - **Description**: `密评备考系统 - 商用密码应用安全性评估从业人员考核备考平台`
   - **Visibility**: 选择 `Private` (私有) 或 `Public` (公开)
   - **Initialize**: ❌ 不要勾选任何选项
3. 点击 "Create repository"

### 步骤 2: 推送到 GitHub

```bash
cd ~/exam-prep-system-package-20260330

# 添加远程仓库 (替换 YOUR_USERNAME 为你的 GitHub 用户名)
git remote add origin https://github.com/YOUR_USERNAME/exam-prep-system.git

# 推送到 GitHub
git push -u origin main
```

---

## 🔑 使用 SSH 密钥 (推荐，无需每次输入密码)

### 1. 生成 SSH 密钥

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# 按回车使用默认路径
# 可以设置密码或直接回车跳过
```

### 2. 启动 SSH 代理并添加密钥

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### 3. 复制公钥到 GitHub

```bash
cat ~/.ssh/id_ed25519.pub
```

复制输出内容，然后:
1. 访问 https://github.com/settings/keys
2. 点击 "New SSH key"
3. 标题填写: `Exam System Server`
4. 粘贴公钥内容
5. 点击 "Add SSH key"

### 4. 使用 SSH 远程地址

```bash
# 修改远程地址为 SSH
git remote set-url origin git@github.com:YOUR_USERNAME/exam-prep-system.git

# 推送
git push -u origin main
```

---

## 📦 推送后验证

### 检查远程仓库

```bash
git remote -v
```

### 查看远程分支

```bash
git branch -vv
```

### 访问仓库

在浏览器打开:
```
https://github.com/YOUR_USERNAME/exam-prep-system
```

---

## 🔄 日常使用

### 提交更改

```bash
# 查看修改
git status
git diff

# 添加修改
git add .
git add frontend/src/App.vue

# 提交
git commit -m "描述你的修改"

# 推送到 GitHub
git push
```

### 拉取更新

```bash
git pull origin main
```

### 查看提交历史

```bash
git log --oneline --graph --all
```

---

## 🛡️ 备份策略

### 自动推送脚本

创建 `~/auto-backup.sh`:

```bash
#!/bin/bash
cd ~/exam-prep-system-package-20260330

# 添加所有更改
git add .

# 自动提交 (带时间戳)
git commit -m "自动备份 $(date '+%Y-%m-%d %H:%M:%S')" \
  || echo "没有新的更改"

# 推送到 GitHub
git push
```

设置定时任务 (每天自动推送):

```bash
# 编辑 crontab
crontab -e

# 添加每天晚上 10 点自动备份
0 22 * * * ~/auto-backup.sh >> ~/git-backup.log 2>&1
```

---

## 📝 GitHub 仓库 README.md

仓库主页会显示以下内容:

```markdown
# 🔐 密评备考系统

商用密码应用安全性评估从业人员考核备考平台

## ✨ 功能特性

- 🔐 **多用户认证** - 注册/登录/密码修改
- 🎯 **多种练习模式** - 随机/新题/错题/分类
- 🧠 **智能复习** - 基于 SM-2 算法
- 📚 **错题本管理**
- 📊 **学习进度统计**
- 📝 **模拟考试**
- 🔧 **题目管理** (管理员)

## 🚀 快速开始

\`\`\`bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/exam-prep-system.git
cd exam-prep-system

# 启动系统
docker compose up -d

# 访问系统
# 前端: http://localhost:18080
# 后端: http://localhost:13000
\`\`\`

## 📖 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Node.js + Express
- **数据库**: PostgreSQL 13
- **缓存**: Redis 6
- **部署**: Docker + Docker Compose

## 📄 许可证

MIT License
```

---

## ❓ 常见问题

### Q: 推送时提示 "Permission denied"

**A**: 检查远程地址和权限:
```bash
git remote -v
# 如果是 HTTPS，确保你有写入权限
# 建议切换到 SSH 方式
```

### Q: 提示 "failed to push some refs"

**A**: 先拉取远程更新:
```bash
git pull --rebase origin main
git push origin main
```

### Q: 忘记提交某个文件

**A**: 可以追加提交:
```bash
git add forgotten-file.txt
git commit --amend
git push -f origin main  # 强制推送 (谨慎使用)
```

---

## 📞 获取帮助

- GitHub 文档: https://docs.github.com
- Git 文档: https://git-scm.com/doc

---

**创建时间**: 2026-03-31
**文档版本**: 1.0
