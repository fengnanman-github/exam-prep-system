-- ============================================================================
-- 用户管理相关表
-- 功能：创建用户活动日志、系统配置、学习统计汇总表
-- 创建时间：2026-04-05
-- ============================================================================

-- ============================================================================
-- 1. 用户活动日志表
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_metadata ON user_activity_logs USING GIN(metadata);

-- 添加注释
COMMENT ON TABLE user_activity_logs IS '用户活动日志表';
COMMENT ON COLUMN user_activity_logs.activity_type IS '活动类型：login, logout, register, password_change, etc.';
COMMENT ON COLUMN user_activity_logs.metadata IS '额外元数据（JSON格式）';

-- ============================================================================
-- 2. 系统配置表
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_configurations (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_type VARCHAR(20) NOT NULL CHECK (config_type IN ('string', 'boolean', 'number', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- 是否可被前端访问
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_system_configurations_key ON system_configurations(config_key);
CREATE INDEX IF NOT EXISTS idx_system_configurations_public ON system_configurations(is_public) WHERE is_public = true;

-- 插入默认配置
INSERT INTO system_configurations (config_key, config_value, config_type, description, is_public) VALUES
-- 注册相关配置
('registration.enabled', 'true', 'boolean', '是否开放用户注册', true),
('registration.require_email_verification', 'true', 'boolean', '注册是否需要邮箱验证', true),
('registration.require_admin_approval', 'true', 'boolean', '注册是否需要管理员审批', true),
('registration.allow_default_username', 'true', 'boolean', '是否允许使用默认用户名', false),

-- 系统状态
('system.maintenance_mode', 'false', 'boolean', '系统维护模式', false),
('system.max_users', '1000', 'number', '最大用户数量限制', false),
('system.version', '2.0.0', 'string', '系统版本号', true),

-- 邮件服务配置
('email.service_provider', 'smtp', 'string', '邮件服务提供商（smtp/sendgrid/alicloud）', false),
('email.from_address', 'noreply@example.com', 'string', '发件人邮箱地址', false),
('email.from_name', '密评备考系统', 'string', '发件人名称', false),

-- 学习配置
('learning.default_daily_target', '50', 'number', '默认每日练习目标题目数', true),
('learning.show_hints', 'true', 'boolean', '是否显示提示', true),
('learning.allow_skip', 'true', 'boolean', '是否允许跳过题目', true),

-- 审批配置
('approval.auto_approve_verified', 'false', 'boolean', '邮箱验证后是否自动批准（跳过管理员审批）', false),
('approval.pending_user_limit', '100', 'number', '待审批用户数量上限', false),
('approval.notify_admin_on_pending', 'true', 'boolean', '有待审批用户时是否通知管理员', false)

ON CONFLICT (config_key) DO NOTHING;

-- 添加注释
COMMENT ON TABLE system_configurations IS '系统配置表';
COMMENT ON COLUMN system_configurations.config_type IS '配置值类型：string, boolean, number, json';
COMMENT ON COLUMN system_configurations.is_public IS '是否可被前端访问（公开配置）';

-- 创建触发器：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_system_configurations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_configurations_timestamp ON system_configurations;
CREATE TRIGGER trigger_update_system_configurations_timestamp
    BEFORE UPDATE ON system_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_system_configurations_timestamp();

-- ============================================================================
-- 3. 学习统计汇总表
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_statistics_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_practice_time INTEGER DEFAULT 0, -- 练习时长（秒）
    questions_practiced INTEGER DEFAULT 0, -- 练习题目数
    correct_count INTEGER DEFAULT 0, -- 正确数量
    wrong_count INTEGER DEFAULT 0, -- 错误数量
    new_questions INTEGER DEFAULT 0, -- 新学题目
    review_questions INTEGER DEFAULT 0, -- 复习题目
    exam_category_stats JSONB DEFAULT '{}', -- 按考试分类统计
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, stat_date)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_learning_stats_user ON learning_statistics_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_stats_date ON learning_statistics_summary(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_stats_user_date ON learning_statistics_summary(user_id, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_stats_category ON learning_statistics_summary USING GIN(exam_category_stats);

-- 添加注释
COMMENT ON TABLE learning_statistics_summary IS '学习统计汇总表（每日统计）';
COMMENT ON COLUMN learning_statistics_summary.exam_category_stats IS '按考试分类统计（JSON格式）';

-- 创建触发器：自动更新updated_at字段
DROP TRIGGER IF EXISTS trigger_update_learning_stats_timestamp ON learning_statistics_summary;
CREATE TRIGGER trigger_update_learning_stats_timestamp
    BEFORE UPDATE ON learning_statistics_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_stats_timestamp();

CREATE OR REPLACE FUNCTION update_learning_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. 创建便捷函数
-- ============================================================================

-- 记录用户活动日志的函数
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id INTEGER,
    p_activity_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS BIGINT AS $$
DECLARE
    activity_id BIGINT;
BEGIN
    INSERT INTO user_activity_logs (
        user_id, activity_type, activity_description,
        ip_address, user_agent, metadata
    ) VALUES (
        p_user_id, p_activity_type, p_description,
        p_ip_address, p_user_agent, p_metadata
    ) RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- 获取系统配置的函数
CREATE OR REPLACE FUNCTION get_system_config(config_key TEXT)
RETURNS TEXT AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT config_value INTO config_value
    FROM system_configurations
    WHERE config_key = get_system_config.config_key;

    IF config_value IS NULL THEN
        RAISE EXCEPTION '系统配置 % 不存在', config_key;
    END IF;

    RETURN config_value;
END;
$$ LANGUAGE plpgsql;

-- 获取布尔类型配置的函数
CREATE OR REPLACE FUNCTION get_system_config_boolean(config_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT config_value INTO config_value
    FROM system_configurations
    WHERE config_key = get_system_config_boolean.config_key
      AND config_type = 'boolean';

    IF config_value IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN config_value::boolean;
END;
$$ LANGUAGE plpgsql;

-- 获取数字类型配置的函数
CREATE OR REPLACE FUNCTION get_system_config_number(config_key TEXT)
RETURNS NUMERIC AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT config_value INTO config_value
    FROM system_configurations
    WHERE config_key = get_system_config_number.config_key
      AND config_type = 'number';

    IF config_value IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN config_value::numeric;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 迁移完成报告
-- ============================================================================
-- 新增表：3个
--   - user_activity_logs (用户活动日志)
--   - system_configurations (系统配置)
--   - learning_statistics_summary (学习统计汇总)
-- 新增函数：4个
--   - log_user_activity() - 记录用户活动
--   - get_system_config() - 获取字符串配置
--   - get_system_config_boolean() - 获取布尔配置
--   - get_system_config_number() - 获取数字配置
-- 新增触发器：3个
-- 默认配置：15个系统配置项
-- ============================================================================
-- 功能说明：
-- 1. user_activity_logs：记录所有用户操作，用于审计和分析
-- 2. system_configurations：动态系统配置，无需重启即可调整
-- 3. learning_statistics_summary：每日学习统计汇总，支持高效查询
-- 4. 提供便捷函数简化配置访问
-- ============================================================================
