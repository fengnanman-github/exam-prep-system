# Claude Code 最佳实践指南 - 节省Token提升效率

## 一、配置优化

### 1.1 项目上下文配置

在 `.claude/settings.local.json` 中添加项目上下文：

```json
{
  "projectContext": {
    "frontendDirectory": "frontend",
    "backendDirectory": "backend",
    "packageJsonPath": "frontend/package.json",
    "description": "密评备考系统 - Vue3 + Node.js",
    "type": "fullstack-web-app",
    "frontendFramework": "vue3",
    "backendFramework": "express",
    "database": "postgresql"
  }
}
```

**好处**：减少重复解释项目结构的时间

### 1.2 搜索优化配置

```json
{
  "preferences": {
    "alwaysUseGlobForFileSearch": true,
    "alwaysUseGrepForContentSearch": true,
    "avoidFindCommand": true,
    "maxSearchResults": 30
  }
}
```

**好处**：
- 使用专门的搜索工具，而非通用bash命令
- 限制结果数量，减少返回数据量

### 1.3 权限预配置

预配置常用权限，减少确认：

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(git:*)",
      "Bash(docker:*)",
      "Bash(node:*)",
      "Read:frontend/**",
      "Read:backend/**",
      "Edit:frontend/**",
      "Edit:backend/**"
    ]
  }
}
```

---

## 二、工具使用最佳实践

### 2.1 优先使用专门工具（避免Bash）

| 任务 | ❌ 避免 | ✅ 推荐 | 节省约 |
|------|---------|---------|--------|
| 查找文件 | `find . -name "*.vue"` | `Glob("**/*.vue")` | 50% |
| 搜索内容 | `grep -r "login"` | `Grep("login")` | 60% |
| 读取文件 | `cat file.js` | `Read(file.js)` | 40% |
| 写文件 | `echo > file.js` | `Write/Write` | 30% |
| 编辑文件 | `sed`/`awk` | `Edit` | 70% |

### 2.2 并行执行（Task工具）

**单次顺序执行**（慢）：
```
1. 搜索代码
2. 读取文件
3. 分析问题
```

**并行执行**（快）：
```
启动3个Agent同时：
- Agent1: 搜索前端问题
- Agent2: 搜索后端API
- Agent3: 检查数据库
```

**示例**：
```javascript
// 在单个响应中并行执行多个Task
Task工具调用1: 搜索前端
Task工具调用2: 搜索后端
Task工具调用3: 检查配置
```

### 2.3 使用Explore Agent进行深度搜索

**适用场景**：
- 需要搜索超过3轮的复杂查询
- 不确定具体找什么，需要探索
- 需要理解代码库结构

**使用方式**：
```
启动Task工具 + subagent_type=Explore
```

---

## 三、Skills 快速调用

### 3.1 常用Skills

| Skill | 用途 | 示例 |
|-------|------|------|
| `commit` | Git提交 | `/commit "修复登录问题"` |
| `review-pr` | 审查PR | `/review-pr 123` |
| `pdf` | PDF操作 | 处理PDF文件 |

### 3.2 自定义Skills

在项目中创建 `.claude/skills/` 目录：

```javascript
// .claude/skills/test-backend.js
module.exports = {
  name: 'test-backend',
  description: '运行后端测试',
  parameters: {
    testFile: {
      type: 'string',
      description: '测试文件路径'
    }
  },
  execute: async ({ testFile }) => {
    return `npm test -- ${testFile}`;
  }
};
```

---

## 四、Prompt 优化技巧

### 4.1 简洁明确的指令

**❌ 冗长**：
```
"请你帮我仔细检查一下前端的登录组件，看看有没有什么问题，我最近发现登录好像不太好用，具体是什么我也不太清楚，就是感觉不太对劲..."
```

**✅ 简洁**：
```
"检查LoginModal.vue的登录逻辑问题"
```

### 4.2 提供上下文一次到位

**❌ 多轮问答**：
```
你: 检查登录
我: 哪个文件?
你: LoginModal.vue
我: 什么问题?
你: 登录失败
```

**✅ 一次性说明**：
```
"检查 LoginModal.vue 的登录失败问题，用户报告点击登录后没反应"
```

### 4.3 使用结构化格式

**问题列表**：
```
检查以下问题：
1. 登录按钮是否绑定点击事件
2. API调用是否正确
3. 错误处理是否完善
```

**任务列表**：
```
完成以下任务：
- [ ] 修复登录bug
- [ ] 添加错误提示
- [ ] 更新测试
```

---

## 五、多Agent 协作模式

### 5.1 并行探索模式

```
启动3个Explore Agent同时工作：
- Agent1 (thoroughness: medium): 搜索前端组件
- Agent2 (thoroughness: medium): 搜索后端API
- Agent3 (thoroughness: medium): 搜索数据库
```

### 5.2 专家分工模式

```
- Frontend Agent: 处理Vue组件问题
- Backend Agent: 处理Node.js API问题
- DB Agent: 处理数据库查询问题
```

### 5.3 检查-修复-测试 循环

```
- Agent1: 发现问题
- Agent2: 修复问题
- Agent3: 测试验证
```

---

## 六、节省Token 的具体技巧

### 6.1 减少文件读取

**❌ 不好的做法**：
```
"检查所有组件文件"
→ 读取10个文件 × 每个几百行 = 大量token
```

**✅ 好的做法**：
```
"用Grep搜索 'login' 关键词，只读取相关文件"
→ 先搜索定位，再读取需要的部分
```

### 6.2 使用定向搜索

```javascript
// 搜索特定模式
Grep("TODO|FIXME|BUG", { output_mode: "content" })

// 只搜索特定文件类型
Grep("export default", { glob: "**/*.vue" })

// 限制搜索范围
Grep("login", { path: "frontend/src/components" })
```

### 6.3 分阶段处理

**❌ 一次性处理**：
```
"分析整个系统的所有问题"
→ 需要读取大量代码，token消耗大
```

**✅ 分阶段**：
```
阶段1: "只检查登录模块的问题"
阶段2: "只检查数据库连接问题"
阶段3: "只检查前端样式问题"
```

---

## 七、工作流优化

### 7.1 Plan模式用于复杂任务

```javascript
// 对于需要多步骤的复杂任务
EnterPlanMode()

// Plan模式会：
// 1. 探索代码库
// 2. 设计方案
// 3. 列出步骤
// 4. 等待用户批准
//
// 比直接编码节省token
```

### 7.2 快速反馈循环

```
小步快跑：
1. 做小改动
2. 快速测试
3. 立即反馈
4. 继续迭代

而不是：
一次性做大改动
→ 问题多
→ 调试困难
→ 消耗更多token
```

### 7.3 复用已知模式

```
重复性任务：
- 创建新组件 → 使用模板
- 添加新API → 复制现有模式
- 数据库操作 → 使用统一函数
```

---

## 八、具体场景最佳实践

### 8.1 修复Bug

```
步骤：
1. 用Grep搜索错误信息关键词
2. 只读取相关文件
3. 用Edit做精确修改
4. 用Bash测试验证

避免：
- 不必要地读取整个项目
- 反复询问相同问题
- 没有测试就做更多修改
```

### 8.2 添加新功能

```
步骤：
1. 用Glob查找类似功能作为参考
2. 只读取参考文件的关键部分
3. 基于现有模式快速实现
4. 测试验证

避免：
- 从零开始设计
- 重新实现已有模式
- 过度设计
```

### 8.3 代码重构

```
步骤：
1. 先用Explore Agent分析影响范围
2. 制定重构计划
3. 逐步重构，每步测试
4. 最后统一更新

避免：
- 一次性大规模修改
- 没有测试的重构
- 过度抽象
```

---

## 九、Token使用监控

### 9.1 定期检查

```
定期检查：
/settings
→ 查看当前token使用情况
→ 调整策略
```

### 9.2 设置警告

```json
{
  "preferences": {
    "maxSearchResults": 20,  // 减少默认返回结果
    "preferEditOverWrite": true  // 避免重写整个文件
  }
}
```

---

## 十、推荐的快捷工作流

### 场景1: 快速修复Bug

```
1. Grep搜索错误关键词 (定位问题)
2. Read读取相关文件 (只读需要的部分)
3. Edit精确修改 (只改问题代码)
4. Bash快速测试 (验证修复)
```

### 场景2: 添加新功能

```
1. Glob查找类似功能 (参考实现)
2. Read关键部分 (学习模式)
3. Edit创建新文件 (基于模板)
4. Bash测试验证
```

### 场景3: 代码审查

```
1. 启动Explore Agent (全面分析)
2. 使用Grep搜索特定模式 (针对性检查)
3. 生成报告 (只输出问题列表)
```

---

## 十一、避免的常见错误

### ❌ 浪费Token的做法

1. **重复读取文件**
   ```
   // 不好：多次读取同一个文件
   Read file.js
   Read file.js

   // 好：缓存文件内容
   Read file.js 一次，记住内容
   ```

2. **不必要的日志**
   ```
   // 不好：要求详细的console.log
   "在每个函数开头加console.log"

   // 好：只在必要时加日志
   "在关键错误处理加日志"
   ```

3. **过度解释**
   ```
   // 不好：详细解释每一步
   "首先创建一个变量x，然后将y赋值给x..."

   // 好：直接说明意图
   "初始化状态变量"
   ```

4. **批量操作分拆**
   ```
   // 不好：逐个文件处理
   "修改文件A"
   "修改文件B"
   "修改文件C"

   // 好：批量处理
   "批量修改所有组件的prop定义"
   ```

---

## 十二、总结：Token使用黄金法则

### 核心原则

1. **先定位，后读取** - 用搜索找到问题，再读取文件
2. **精确编辑** - 只修改必要的部分
3. **并行工作** - 多Agent同时处理不同任务
4. **复用模式** - 基于现有代码而非重新发明
5. **快速迭代** - 小步快跑，及时验证

### 记忆公式

```
节省Token = 定位准确 + 工具恰当 + 并行协作 + 简洁沟通
```

---

## 附录：快速参考

### 常用命令对比

| 目标 | Bash命令 | Claude工具 | Token节省 |
|------|----------|-----------|----------|
| 查找文件 | `find` | `Glob` | ~50% |
| 搜索内容 | `grep` | `Grep` | ~60% |
| 读文件 | `cat` | `Read` | ~40% |
| 编辑文件 | `sed/vi` | `Edit` | ~70% |
| 执行脚本 | `sh` | `Bash` | - |

### 推荐的Agent使用

```
简单任务：直接处理
中等复杂：1个Explore Agent
复杂任务：2-3个Agent并行
超复杂任务：EnterPlanMode
```

---

记住：目标是**高效完成任务**，而不是**展示能力**。
