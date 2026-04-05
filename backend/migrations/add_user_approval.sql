-- ============================================================================
-- 用户审批状态增强
-- 功能：添加邮箱验证和管理员审批流程所需的字段
-- 创建时间：2026-04-05
-- ============================================================================

-- 添加用户审批状态枚举
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_approval_status') THEN
        CREATE TYPE user_approval_status AS ENUM (
            'pending_verification',   -- 待邮箱验证
            'pending_approval',       -- 待管理员审批
            'approved',              -- 已批准
            'rejected',              -- 已拒绝
            'suspended'              -- 已暂停
        );
    END IF;
END
$$;

-- 添加审批相关字段到users表
DO $$
BEGIN
    -- 添加审批状态字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE users ADD COLUMN approval_status user_approval_status DEFAULT 'pending_verification';
    END IF;

    -- 添加邮箱验证状态字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;

    -- 添加审批备注字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'approval_notes'
    ) THEN
        ALTER TABLE users ADD COLUMN approval_notes TEXT;
    END IF;

    -- 添加审批时间字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE users ADD COLUMN approved_at TIMESTAMP;
    END IF;

    -- 添加审批人字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id);
    END IF;

    -- 添加拒绝时间字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE users ADD COLUMN rejected_at TIMESTAMP;
    END IF;

    -- 添加拒绝人字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'rejected_by'
    ) THEN
        ALTER TABLE users ADD COLUMN rejected_by INTEGER REFERENCES users(id);
    END IF;

    -- 添加拒绝原因字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE users ADD COLUMN rejection_reason TEXT;
    END IF;
END
$$;

-- 添加索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified) WHERE email_verified = false;
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_rejected_by ON users(rejected_by) WHERE rejected_by IS NOT NULL;

-- 更新现有用户状态（活跃用户自动设为已批准）
UPDATE users
SET
    approval_status = 'approved',
    email_verified = true
WHERE is_active = true AND approval_status IS NULL;

-- 添加注释
COMMENT ON COLUMN users.approval_status IS '用户审批状态：pending_verification(待邮箱验证), pending_approval(待审批), approved(已批准), rejected(已拒绝), suspended(已暂停)';
COMMENT ON COLUMN users.email_verified IS '邮箱是否已验证';
COMMENT ON COLUMN users.approval_notes IS '审批备注信息';
COMMENT ON COLUMN users.approved_at IS '审批通过时间';
COMMENT ON COLUMN users.approved_by IS '审批人ID（管理员）';
COMMENT ON COLUMN users.rejected_at IS '审批拒绝时间';
COMMENT ON COLUMN users.rejected_by IS '拒绝人ID（管理员）';
COMMENT ON COLUMN users.rejection_reason IS '拒绝原因';

-- 创建触发器：确保新用户默认状态
CREATE OR REPLACE FUNCTION set_default_user_approval_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.approval_status IS NULL THEN
        NEW.approval_status := 'pending_verification';
    END IF;
    IF NEW.email_verified IS NULL THEN
        NEW.email_verified := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_user_approval_status ON users;
CREATE TRIGGER trigger_set_default_user_approval_status
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_default_user_approval_status();

-- ============================================================================
-- 迁移完成报告
-- ============================================================================
-- 新增字段：6个
-- 新增索引：4个
-- 新增触发器：1个
-- 影响表：users
-- 数据兼容性：已自动更新现有用户状态
-- ============================================================================
