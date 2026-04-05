# 智能复习+功能测试指南

## 问题排查

### 已完成的修复
1. ✅ 添加数据库字段（quality, confidence, reviewed_at）
2. ✅ 后端API测试通过
3. ✅ 前端组件已创建并构建
4. ✅ 调试信息已添加

### 测试步骤

#### 1. 验证后端API

```bash
# 测试仪表板API
curl "http://localhost:13000/api/v2/intelligent-review/dashboard/exam_user_001"

# 测试待复习题目API
curl "http://localhost:13000/api/v2/intelligent-review/due-questions/exam_user_001?limit=5"

# 测试知识图谱API
curl "http://localhost:13000/api/v2/intelligent-review/knowledge-map/exam_user_001"

# 测试推荐API
curl "http://localhost:13000/api/v2/intelligent-review/recommendations/exam_user_001"
```

**预期结果**：所有API都返回`success: true`

#### 2. 验证前端页面

1. 打开浏览器访问：http://localhost:18080
2. 登录系统
3. 点击导航栏的"⚡ 智能复习+"按钮（红色高亮）
4. 打开浏览器开发者工具（F12）
5. 查看Console标签页

**预期行为**：
- 应该看到"IntelligentReview mounted, userId: exam_user_001"
- 应该看到"正在加载仪表板数据..."
- 应该看到"仪表板数据响应: {...}"
- 应该看到"仪表板数据已设置: {...}"

#### 3. 常见问题排查

**如果页面空白**：
1. 检查Console是否有JavaScript错误
2. 检查Network标签页，看API调用是否成功
3. 检查API返回的数据格式是否正确

**如果API调用失败**：
- 检查后端是否运行：`docker compose ps backend`
- 检查后端日志：`docker compose logs backend`

**如果数据不显示**：
- 检查`dashboard`对象是否有数据
- 检查`v-if`条件是否正确
- 检查CSS是否隐藏了元素

### 调试技巧

#### 在浏览器Console中测试

```javascript
// 检查组件是否挂载
document.querySelector('.intelligent-review')

// 检查数据
this.$root.$children.find(c => c.$options.name === 'IntelligentReview').dashboard

// 手动调用API
axios.get('/api/v2/intelligent-review/dashboard/exam_user_001').then(r => console.log(r.data))
```

#### 检查Vue DevTools

如果安装了Vue DevTools：
1. 切换到Vue标签
2. 选择IntelligentReview组件
3. 查看data中的dashboard、loading等状态
4. 查看computed属性

### 可能的问题和解决方案

#### 问题1：组件没有挂载

**症状**：页面空白，Console无任何输出

**解决**：
- 检查App.vue中是否正确注册了组件
- 检查currentView是否等于'intelligent-review'
- 检查v-if条件是否正确

#### 问题2：API调用失败

**症状**：Console显示网络错误

**解决**：
```javascript
// 在IntelligentReview.vue的loadDashboard方法中
const API_BASE = '/api/v2' // 确保路径正确
```

#### 问题3：数据格式不匹配

**症状**：API返回数据但页面不显示

**解决**：
- 检查API返回的数据结构
- 检查组件中使用的数据路径是否正确
- 添加console.log调试数据流

### 临时回退方案

如果智能复习+功能有问题，可以暂时使用原版复习功能：

1. 点击"🧠 复习"按钮（原版）
2. 原版复习功能正常工作
3. 等待智能复习+修复后再使用

### 联系开发者

如果以上步骤都无法解决问题，请提供：
1. 浏览器Console的错误信息
2. Network标签中API调用的响应
3. Vue DevTools中组件的状态截图
