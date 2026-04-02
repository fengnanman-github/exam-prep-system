-- ============================================
-- 管理员配置管理表
-- 版本: 2.0.1
-- 说明: 支持题目和文档范围配置的动态管理
-- ============================================

-- 配置分类枚举
CREATE TYPE config_category AS ENUM (
    'question_scope',
    'document_scope',
    'auto_update_rule',
    'system_setting'
);

-- 配置键枚举（主要配置项）
CREATE TYPE config_key AS ENUM (
    -- 题目范围配置
    'practice_question_scope',
    'category_question_scope',
    'exam_category_scope',
    'document_question_scope',
    'random_question_scope',
    -- 文档范围配置
    'practice_document_scope',
    'review_document_scope',
    -- 自动更新规则
    'auto_apply_supermemo',
    'auto_sync_question_state',
    'auto_update_mastery',
    -- 系统设置
    'config_version',
    'config_reload_mode'
);

-- 配置值类型枚举
CREATE TYPE config_value_type AS ENUM (
    'string',
    'integer',
    'boolean',
    'json',
    'array'
);

-- 管理员配置表
CREATE TABLE IF NOT EXISTS admin_config (
    id SERIAL PRIMARY KEY,
    config_key config_key NOT NULL,
    config_category config_category NOT NULL,
    config_value_type config_value_type NOT NULL,

    -- 值存储（根据类型选择不同的字段）
    value_string TEXT,
    value_integer INTEGER,
    value_boolean BOOLEAN,
    value_json JSONB,
    value_array TEXT[],

    -- 描述信息
    display_name VARCHAR(200),
    description TEXT,
    default_value TEXT,

    -- 更新追踪
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 版本控制
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,

    -- 唯一约束
    CONSTRAINT uk_config_key UNIQUE (config_key)
);

-- 配置变更历史表
CREATE TABLE IF NOT EXISTS admin_config_history (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL,
    config_key config_key NOT NULL,
    config_category config_category NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by VARCHAR(100),
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (config_id) REFERENCES admin_config(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admin_config_category ON admin_config(config_category);
CREATE INDEX IF NOT EXISTS idx_admin_config_active ON admin_config(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_config_history_config_id ON admin_config_history(config_id);
);
CREATE INDEX IF NOT EXISTS idx_admin_config_history_changed_at ON admin_config_history(changed_at DESC);

-- 插入默认配置
INSERT INTO admin_config (config_key, config_category, config_value_type, value_boolean, display_name, description, default_value)
VALUES
    -- 题目范围配置（默认全部）
    ('practice_question_scope', 'question_scope', 'json', true,
     '练习题目范围', '随机练习模式可用的题目范围', '{"mode":"all","filters":{}}'),

    ('category_question_scope', 'question_scope', 'json', true,
     '分类题目范围', '按知识点分类练习可用的题目范围', '{"mode":"all","filters":{}}'),

    ('exam_category_scope', 'question_scope', 'json', true,
     '考试类别题目范围', '按考试类别练习可用的题目范围', '{"mode":"all","filters":{}}'),

    ('document_question_scope', 'question_scope', 'json', true,
     '文档关联题目范围', '文档复习模式可用的题目范围', '{"mode":"all","filters":{}}'),

    ('random_question_scope', 'question_scope', 'json', true,
     '随机题目范围', '随机抽题可用的题目范围', '{"mode":"all","filters":{}}'),

    -- 文档范围配置
    ('practice_document_scope', 'document_scope', 'json', true,
     '练习文档范围', '练习模式可用的文档范围', '{"mode":"all","filters":{}}'),

    ('review_document_scope', 'document_scope', 'json', true,
     '复习文档范围', '文档复习模式可用的文档范围', '{"mode":"all","filters":{}}'),

    -- 自动更新规则
    ('auto_apply_supermemo', 'auto_update_rule', 'boolean', true,
     '自动应用SuperMemo算法', '练习后自动应用遗忘算法计算复习间隔', 'true'),

    ('auto_sync_question_state', 'auto_update_rule', 'boolean', true,
     '自动同步题目状态', '跨模式自动同步题目状态（不确定、收藏）', 'true'),

    ('auto_update_mastery', 'auto_update_rule', 'boolean', true,
     '自动更新掌握度', '根据练习结果自动更新题目掌握度', 'true'),

    -- 系统设置
    ('config_version', 'system_setting', 'string', true,
     '配置版本', '当前配置版本号', '2.0.1'),

    ('config_reload_mode', 'system_setting', 'string', true,
     '配置重载模式', 'hot-热重载, cold-需要重启', 'hot')
ON CONFLICT (config_key) DO NOTHING;

-- 创建触发器：记录配置变更
CREATE OR REPLACE FUNCTION log_config_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 只记录实际值变更
    IF TG_OP = 'UPDATE' THEN
        IF OLD.config_value_type = 'string' THEN
            IF OLD.value_string = NEW.value_string THEN
                RETURN NEW;
            END IF;
        ELSIF OLD.config_value_type = 'integer' THEN
            IF OLD.value_integer = NEW.value_integer THEN
                RETURN NEW;
            END IF;
        ELSIF OLD.config_value_type = 'boolean' THEN
            IF OLD.value_boolean = NEW.value_boolean THEN
                RETURN NEW;
            END IF;
        ELSIF OLD.config_value_type = 'json' THEN
            IF OLD.value_json = NEW.value_json THEN
                RETURN NEW;
            END IF;
        ELSIF OLD.config_value_type = 'array' THEN
            IF OLD.value_array = NEW.value_array THEN
                RETURN NEW;
            END IF;
        END IF;
    END IF;

    -- 记录到历史表
    INSERT INTO admin_config_history (
        config_id,
        config_key,
        config_category,
        old_value,
        new_value,
        changed_by
    ) VALUES (
        NEW.id,
        NEW.config_key,
        NEW.config_category,
        jsonb_build_object(
            COALESCE(OLD.value_string, 'NULL'),
            COALESCE(OLD.value_integer, 'NULL'),
            COALESCE(OLD.value_boolean::text, 'NULL'),
            COALESCE(OLD.value_json, 'NULL'),
            COALESCE(OLD.value_array, 'NULL')
        ),
        jsonb_build_object(
            COALESCE(NEW.value_string, 'NULL'),
            COALESCE(NEW.value_integer, 'NULL'),
            COALESCE(NEW.value_boolean::text, 'NULL'),
            COALESCE(NEW.value_json, 'NULL'),
            COALESCE(NEW.value_array, 'NULL')
        ),
        NEW.updated_by
    );

    -- 增加版本号
    NEW.version := OLD.version + 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用触发器
DROP TRIGGER IF EXISTS trg_admin_config_update ON admin_config;
CREATE TRIGGER trg_admin_config_update
    BEFORE UPDATE ON admin_config
    FOR EACH ROW
    EXECUTE FUNCTION log_config_change();

-- ============================================
-- 配置说明
-- ============================================

/*
题目范围配置格式（JSON）:
{
    "mode": "all" | "category" | "exam_category" | "custom" | "document",
    "filters": {
        "categories": ["数据安全", "网络与通信安全"],  // mode=category时使用
        "exam_categories": ["三级", "四级"],         // mode=exam_category时使用
        "question_ids": [1, 2, 3],              // mode=custom时使用
        "document_ids": [1, 2, 3],               // mode=document时使用
        "exclude_ids": [4, 5, 6]                 // 任何模式下都可排除的ID
    }
}

使用场景：
- practice_question_scope: 控制随机练习的题目池
- category_question_scope: 控制按知识点分类的题目池
- exam_category_scope: 控制按考试类别的题目池
- document_question_scope: 控制文档复习关联的题目
- random_question_scope: 控制随机抽题的范围

文档范围配置格式（JSON）:
{
    "mode": "all" | "category" | "custom",
    "filters": {
        "categories": ["技术标准", "法规标准"],
        "document_ids": [1, 2, 3],
        "exclude_ids": [4, 5, 6]
    }
}

使用场景：
- practice_document_scope: 控制练习模式可用的文档
- review_document_scope: 控制文档复习的范围
*/
