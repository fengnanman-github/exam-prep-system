# 🛡️ 安全功能使用指南

## 🔐 新的安全功能

### 1. 增强的密码策略

**密码要求：**
- 最少8个字符
- 必须包含大写字母 (A-Z)
- 必须包含小写字母 (a-z)  
- 必须包含数字 (0-9)
- 必须包含特殊字符 (!@#$%^&*等)
- 不能包含用户名、邮箱或显示名称
- 不能使用常见弱密码

**示例：**
- ✅ `MyP@ssw0rd2024!` - 符合要求
- ❌ `password123` - 过于简单
- ❌ `12345678` - 纯数字
- ❌ `abcdefgh` - 纯字母

### 2. 账户锁定保护

**保护机制：**
- 登录失败5次 → 锁定30分钟
- 登录失败10次 → 永久锁定（需管理员解锁）
- 成功登录后自动重置失败计数

**解锁方法：**
1. 等待临时锁定时间结束（30分钟）
2. 联系管理员解锁（永久锁定）
3. 通过"忘记密码"功能重置密码

### 3. 会话管理

**会话超时：**
- 空闲超时：30分钟无操作自动登出
- 绝对超时：24小时后强制登出
- 最大并发会话：3个设备同时在线

**记住我功能：**
- 勾选后7天内免登录
- 使用更安全的设备指纹验证

### 4. 审计日志

**记录的安全事件：**
- 登录/登出（成功和失败）
- 密码修改
- 账户锁定/解锁
- 敏感数据访问
- 权限变更

**查看审计日志：**
```javascript
// 管理员可以查看所有用户的审计日志
GET /api/v2/admin/audit-logs?user_id=123&event_type=login
```

## 🚀 登录流程说明

### 标准登录
```bash
POST /api/auth/login
{
  "username": "yourname",
  "password": "YourP@ssw0rd!",
  "remember_me": false
}
```

**成功响应：**
```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "yourname",
    "display_name": "Your Name",
    "role": "user",
    "email_verified": true
  }
}
```

**失败响应（账户锁定）：**
```json
{
  "error": "账户已被锁定",
  "message": "账户已被临时锁定30分钟，请在30分钟后重试",
  "remainingTime": 25
}
```

### 注册流程
```bash
POST /api/auth/register
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "NewP@ssw0rd!",
  "display_name": "New User"
}
```

**密码验证：**
系统会自动验证密码强度，不符合要求时会返回详细错误信息：
```json
{
  "error": "密码不符合安全要求",
  "details": [
    "密码必须包含至少一个大写字母",
    "密码必须包含至少一个特殊字符 (!@#$%^&*)"
  ],
  "strength": "medium"
}
```

### 密码修改
```bash
POST /api/auth/change-password
Headers: Authorization: Bearer <token>
{
  "old_password": "OldP@ssw0rd!",
  "new_password": "NewP@ssw0rd!2024",
  "confirm_password": "NewP@ssw0rd!2024"
}
```

**安全检查：**
- 验证旧密码
- 新密码符合复杂度要求
- 新密码不能与最近5次使用的密码相同
- 自动更新密码历史记录
- 设置90天过期时间

## ⚠️ 安全提示

### 用户安全建议
1. **使用强密码**：按照系统要求创建复杂密码
2. **定期修改密码**：建议每90天更换一次
3. **不要共享账户**：每人独立账户，便于审计追踪
4. **注意登录异常**：发现异常登录立即修改密码
5. **安全退出**：使用完毕后正常退出，不要直接关闭浏览器

### 管理员安全建议
1. **定期审计日志**：每周查看安全事件日志
2. **监控异常行为**：关注多次失败登录、异常IP访问
3. **及时处理安全事件**：发现安全问题立即响应
4. **定期备份数据**：每日自动备份，定期测试恢复
5. **保持系统更新**：及时安装安全补丁

### 常见安全问题

**Q: 忘记密码怎么办？**
A: 使用"忘记密码"功能，系统会发送重置链接到注册邮箱。

**Q: 账户被锁定怎么办？**
A: 等待30分钟自动解锁，或联系管理员手动解锁。

**Q: 密码过期怎么办？**
A: 登录时系统会提示修改密码，按照要求设置新密码即可。

**Q: 如何查看我的登录历史？**
A: 用户可以查看自己的最近登录记录，管理员可以查看所有用户记录。

**Q: 发现异常登录怎么办？**
A: 立即修改密码，并联系管理员检查账户安全。

## 🔧 技术实现细节

### 密码哈希
- 算法：bcrypt
- 轮数：12（生产环境）
- 盐值：自动生成，每次不同

### JWT Token
- 算法：HS256
- 有效期：1小时（可配置）
- 刷新token：7天
- 密钥：从环境变量读取，至少32位

### CSRF保护
- Token长度：32字节随机数
- 存储方式：HTTP-only Cookie
- 验证：每个POST/PUT/DELETE请求验证

### 速率限制
- 全局限制：100请求/15分钟
- 认证API：10请求/15分钟
- 登录尝试：5次/15分钟
- 密码重置：3次/15分钟

### 安全Headers
```
Content-Security-Policy: 严格CSP策略
Strict-Transport-Security: HSTS 1年
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

## 📱 前端安全建议

### Token存储
```javascript
// 推荐：使用内存存储
let authToken = null;

// 不推荐：localStorage（易受XSS攻击）
// localStorage.setItem('token', token);

// 不推荐：Cookie（除非HTTP-only）
// document.cookie = `token=${token}`;
```

### Token使用
```javascript
// 每次请求都带上Token
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Token过期处理
axios.interceptors.response.use(null, error => {
  if (error.response?.status === 401) {
    // Token过期，重新登录
    window.location.href = '/login';
  }
  return Promise.reject(error);
});
```

### 密码输入
```javascript
// 密码强度实时验证
function validatePassword(password) {
  const result = {
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
    hasMinLength: password.length >= 8
  };
  
  const strength = Object.values(result).filter(Boolean).length;
  return { result, strength };
}
```

## 🌐 云部署安全要点

### 1. 环境隔离
- 开发、测试、生产环境完全隔离
- 不同环境使用不同的数据库和密钥
- 生产环境数据库不对外开放

### 2. 网络安全
- 使用VPC隔离应用和数据
- 配置安全组规则
- 启用DDoS防护
- 使用WAF（Web应用防火墙）

### 3. 数据加密
- 传输加密：强制HTTPS
- 存储加密：敏感数据加密存储
- 备份加密：备份文件加密
- 日志脱敏：敏感信息脱敏记录

### 4. 监控告警
- 实时监控安全事件
- 异常行为自动告警
- 定期安全扫描
- 渗透测试

### 5. 合规要求
- 数据保护：符合GDPR要求
- 审计要求：完整操作日志
- 隐私政策：用户隐私保护
- 安全披露：安全漏洞披露流程

---

**📞 如有安全问题，请联系：**
- 技术支持：support@your-domain.com  
- 安全报告：security@your-domain.com
- 紧急联系：+86-XXX-XXXX-XXXX

**🔗 相关资源：**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web安全指南](https://owasp.org/www-project-web-security-testing-guide/)
- [密码安全指南](https://pages.nist.gov/800-63-3/)