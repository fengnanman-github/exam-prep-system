/**
 * 认证控制器
 * 处理用户注册、登录、登出、修改密码等操作
 */

const bcrypt = require('bcryptjs');
const { generateToken } = require('./auth-middleware');

/**
 * 用户注册
 */
async function register(pool, req, res) {
    const client = await pool.connect();

    try {
        const { username, password, email, display_name, migrate_data } = req.body;

        // 参数验证
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: '用户名长度应为3-20个字符' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度至少6个字符' });
        }

        // 加密密码
        const password_hash = await bcrypt.hash(password, 10);

        // 创建用户
        const result = await client.query(
            `INSERT INTO users (username, password_hash, email, display_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, display_name, role, created_at`,
            [username, password_hash, email || null, display_name || username]
        );

        const user = result.rows[0];

        // 数据迁移
        let migrated = false;
        if (migrate_data) {
            const migrateResult = await client.query(
                `SELECT migrate_default_user_data($1, $2) as migrated`,
                [username, username]
            );
            migrated = migrateResult.rows[0].migrated;
        }

        // 生成 Token
        const token = generateToken(user);

        res.status(201).json({
            message: '注册成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                role: user.role
            },
            migrated
        });

    } catch (error) {
        if (error.code === '23505') {
            // 唯一约束冲突
            if (error.constraint.includes('username')) {
                return res.status(400).json({ error: '用户名已存在' });
            }
            if (error.constraint.includes('email')) {
                return res.status(400).json({ error: '邮箱已被注册' });
            }
        }
        console.error('注册失败:', error);
        res.status(500).json({ error: '注册失败' });
    } finally {
        client.release();
    }
}

/**
 * 用户登录
 */
async function login(pool, req, res) {
    const client = await pool.connect();

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 查询用户
        const result = await client.query(
            `SELECT id, username, password_hash, display_name, role, is_active
             FROM users WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({ error: '账户已被禁用' });
        }

        // 验证密码
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 更新最后登录时间
        await client.query(
            `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [user.id]
        );

        // 生成 Token
        const token = generateToken(user);

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败' });
    } finally {
        client.release();
    }
}

/**
 * 获取当前用户信息
 */
async function getCurrentUser(req, res) {
    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            isDefault: req.isDefaultUser || false
        }
    });
}

/**
 * 用户登出
 * JWT 是无状态的，客户端删除 Token 即可
 */
async function logout(req, res) {
    res.json({ message: '登出成功' });
}

/**
 * 修改密码
 */
async function changePassword(pool, req, res) {
    const client = await pool.connect();

    try {
        const { old_password, new_password } = req.body;
        const username = req.user.username;

        if (!old_password || !new_password) {
            return res.status(400).json({ error: '旧密码和新密码不能为空' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ error: '新密码长度至少6个字符' });
        }

        // 获取用户当前密码
        const result = await client.query(
            `SELECT password_hash FROM users WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 验证旧密码
        const isValid = await bcrypt.compare(old_password, result.rows[0].password_hash);
        if (!isValid) {
            return res.status(401).json({ error: '旧密码错误' });
        }

        // 加密新密码
        const new_hash = await bcrypt.hash(new_password, 10);

        // 更新密码
        await client.query(
            `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2`,
            [new_hash, username]
        );

        res.json({ message: '密码修改成功' });

    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ error: '修改密码失败' });
    } finally {
        client.release();
    }
}

module.exports = {
    register,
    login,
    getCurrentUser,
    logout,
    changePassword
};
