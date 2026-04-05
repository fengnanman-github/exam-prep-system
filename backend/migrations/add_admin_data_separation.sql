-- ============================================================================
-- 管理员数据分离
-- 功能：将管理员练习数据与普通用户数据分离，确保统计准确性
-- 创建时间：2026-04-05
-- ============================================================================

-- 在practice_history表添加管理员练习标记
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'practice_history' AND column_name = 'is_admin_practice'
    ) THEN
        ALTER TABLE practice_history ADD COLUMN is_admin_practice BOOLEAN DEFAULT false;
    END IF;
END
$$;

-- 在wrong_answers表添加管理员练习标记
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wrong_answers' AND column_name = 'is_admin_practice'
    ) THEN
        ALTER TABLE wrong_answers ADD COLUMN is_admin_practice BOOLEAN DEFAULT false;
    END IF;
END
$$;

-- 在uncertain_questions表添加管理员练习标记（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uncertain_questions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'uncertain_questions' AND column_name = 'is_admin_practice'
        ) THEN
            ALTER TABLE uncertain_questions ADD COLUMN is_admin_practice BOOLEAN DEFAULT false;
        END IF;
    END IF;
END
$$;

-- 在favorite_questions表添加管理员练习标记（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorite_questions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'favorite_questions' AND column_name = 'is_admin_practice'
        ) THEN
            ALTER TABLE favorite_questions ADD COLUMN is_admin_practice BOOLEAN DEFAULT false;
        END IF;
    END IF;
END
$$;

-- 添加索引以提升管理员数据查询性能
CREATE INDEX IF NOT EXISTS idx_practice_history_admin
ON practice_history(user_id, is_admin_practice);

CREATE INDEX IF NOT EXISTS idx_wrong_answers_admin
ON wrong_answers(user_id, is_admin_practice);

-- 为现有管理员数据标记（基于用户角色）
-- 注意：user_id可能是VARCHAR类型，需要类型转换
UPDATE practice_history ph
SET is_admin_practice = true
FROM users u
WHERE ph.user_id::text = u.id::text
  AND u.role = 'admin'
  AND ph.is_admin_practice = false;

UPDATE wrong_answers wa
SET is_admin_practice = true
FROM users u
WHERE wa.user_id::text = u.id::text
  AND u.role = 'admin'
  AND wa.is_admin_practice = false;

-- 创建触发器：自动标记管理员练习数据
CREATE OR REPLACE FUNCTION mark_admin_practice_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 检查用户是否为管理员
    DECLARE
        is_admin BOOLEAN;
    BEGIN
        SELECT role = 'admin' INTO is_admin
        FROM users
        WHERE id = NEW.user_id;

        IF is_admin THEN
            NEW.is_admin_practice := true;
        ELSE
            NEW.is_admin_practice := false;
        END IF;

        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- 为practice_history创建触发器
DROP TRIGGER IF EXISTS trigger_mark_admin_practice_history ON practice_history;
CREATE TRIGGER trigger_mark_admin_practice_history
    BEFORE INSERT ON practice_history
    FOR EACH ROW
    WHEN (NEW.is_admin_practice IS NULL)
    EXECUTE FUNCTION mark_admin_practice_data();

-- 为wrong_answers创建触发器
DROP TRIGGER IF EXISTS trigger_mark_admin_wrong_answers ON wrong_answers;
CREATE TRIGGER trigger_mark_admin_wrong_answers
    BEFORE INSERT ON wrong_answers
    FOR EACH ROW
    WHEN (NEW.is_admin_practice IS NULL)
    EXECUTE FUNCTION mark_admin_practice_data();

-- 创建管理员练习统计视图
CREATE OR REPLACE VIEW admin_practice_stats AS
SELECT
    u.id AS user_id,
    u.username,
    u.display_name,
    COUNT(DISTINCT ph.question_id) AS total_questions_practiced,
    COUNT(CASE WHEN ph.is_correct THEN 1 END) AS correct_count,
    ROUND(
        COUNT(CASE WHEN ph.is_correct THEN 1 END)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) AS accuracy_rate,
    MAX(ph.practiced_at) AS last_practice_at,
    COUNT(*) AS total_attempts
FROM users u
JOIN practice_history ph ON u.id::text = ph.user_id
WHERE u.role = 'admin' AND ph.is_admin_practice = true
GROUP BY u.id, u.username, u.display_name;

-- 创建普通用户练习统计视图（排除管理员数据）
CREATE OR REPLACE VIEW user_practice_stats AS
SELECT
    u.id AS user_id,
    u.username,
    u.display_name,
    COUNT(DISTINCT ph.question_id) AS total_questions_practiced,
    COUNT(CASE WHEN ph.is_correct THEN 1 END) AS correct_count,
    ROUND(
        COUNT(CASE WHEN ph.is_correct THEN 1 END)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) AS accuracy_rate,
    MAX(ph.practiced_at) AS last_practice_at,
    COUNT(*) AS total_attempts
FROM users u
JOIN practice_history ph ON u.id::text = ph.user_id
WHERE ph.is_admin_practice = false
GROUP BY u.id, u.username, u.display_name;

-- 添加注释
COMMENT ON COLUMN practice_history.is_admin_practice IS '是否为管理员练习数据（用于统计分离）';
COMMENT ON COLUMN wrong_answers.is_admin_practice IS '是否为管理员错题数据（用于统计分离）';
COMMENT ON VIEW admin_practice_stats IS '管理员练习统计视图（仅包含管理员数据）';
COMMENT ON VIEW user_practice_stats IS '普通用户练习统计视图（排除管理员数据）';

-- ============================================================================
-- 迁移完成报告
-- ============================================================================
-- 新增字段：3个（practice_history, wrong_answers, uncertain_questions, favorite_questions）
-- 新增索引：2个
-- 新增触发器：2个
-- 新增视图：2个（admin_practice_stats, user_practice_stats）
-- 影响表：practice_history, wrong_answers, uncertain_questions, favorite_questions
-- 数据兼容性：已自动标记现有管理员数据
-- ============================================================================
-- 说明：
-- 1. 所有练习相关表都添加了is_admin_practice标记
-- 2. 通过触发器自动标记新数据
-- 3. 提供分离的统计视图
-- 4. 确保统计数据准确性
-- ============================================================================
