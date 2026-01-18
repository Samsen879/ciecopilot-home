-- 014_auth_system.sql
-- 认证系统相关表结构

-- 用户登录尝试记录表
CREATE TABLE IF NOT EXISTS user_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户权限表
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted_by UUID REFERENCES user_profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户角色历史表
CREATE TABLE IF NOT EXISTS user_role_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    old_role VARCHAR(50),
    new_role VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES user_profiles(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 密码历史表（防止重复使用旧密码）
CREATE TABLE IF NOT EXISTS user_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户设备表
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- mobile, desktop, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    is_trusted BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- 安全事件日志表
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- login_success, login_failed, password_changed, etc.
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_login_attempts_email_created ON user_login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_attempts_ip_created ON user_login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_user_role_history_user_id ON user_role_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_password_history_user_id ON user_password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_created ON security_events(severity, created_at DESC);

-- 为 user_profiles 表添加认证相关字段（如果不存在）
DO $$ 
BEGIN
    -- 添加密码重置相关字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'password_reset_token') THEN
        ALTER TABLE user_profiles ADD COLUMN password_reset_token VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'password_reset_expires') THEN
        ALTER TABLE user_profiles ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- 添加邮箱验证相关字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_verification_code') THEN
        ALTER TABLE user_profiles ADD COLUMN email_verification_code VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_verification_expires') THEN
        ALTER TABLE user_profiles ADD COLUMN email_verification_expires TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_verified') THEN
        ALTER TABLE user_profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- 添加密码哈希字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'password_hash') THEN
        ALTER TABLE user_profiles ADD COLUMN password_hash VARCHAR(255);
    END IF;
    
    -- 添加最后登录时间
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_login') THEN
        ALTER TABLE user_profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- 添加账户状态字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'status') THEN
        ALTER TABLE user_profiles ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- 创建 user_profiles 相关索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_password_reset_token ON user_profiles(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_verification_code ON user_profiles(email_verification_code) WHERE email_verification_code IS NOT NULL;

-- 启用行级安全
ALTER TABLE user_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略

-- user_login_attempts 策略
CREATE POLICY "Users can view their own login attempts" ON user_login_attempts
    FOR SELECT USING (auth.email() = email);

CREATE POLICY "System can insert login attempts" ON user_login_attempts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all login attempts" ON user_login_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- user_sessions 策略
CREATE POLICY "Users can manage their own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- user_permissions 策略
CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- user_role_history 策略
CREATE POLICY "Users can view their own role history" ON user_role_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage role history" ON user_role_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    );

-- user_password_history 策略
CREATE POLICY "Users can view their own password history" ON user_password_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert password history" ON user_password_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_devices 策略
CREATE POLICY "Users can manage their own devices" ON user_devices
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all devices" ON user_devices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- security_events 策略
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security events" ON security_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all security events" ON security_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 创建函数：清理过期的登录尝试记录
CREATE OR REPLACE FUNCTION cleanup_expired_login_attempts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除24小时前的登录尝试记录
    DELETE FROM user_login_attempts 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：清理过期的会话
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除过期的会话
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：记录安全事件
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_event_type VARCHAR(50),
    p_severity VARCHAR(20) DEFAULT 'info',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO security_events (
        user_id,
        event_type,
        severity,
        ip_address,
        user_agent,
        details
    ) VALUES (
        p_user_id,
        p_event_type,
        p_severity,
        p_ip_address,
        p_user_agent,
        p_details
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：检查密码历史
CREATE OR REPLACE FUNCTION check_password_history(
    p_user_id UUID,
    p_password_hash VARCHAR(255),
    p_history_limit INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
    password_exists BOOLEAN;
BEGIN
    -- 检查新密码是否在最近的密码历史中
    SELECT EXISTS(
        SELECT 1 FROM user_password_history
        WHERE user_id = p_user_id
        AND password_hash = p_password_hash
        ORDER BY created_at DESC
        LIMIT p_history_limit
    ) INTO password_exists;
    
    RETURN password_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：添加密码到历史记录
CREATE OR REPLACE FUNCTION add_password_to_history(
    p_user_id UUID,
    p_password_hash VARCHAR(255),
    p_history_limit INTEGER DEFAULT 5
)
RETURNS VOID AS $$
BEGIN
    -- 添加新密码到历史记录
    INSERT INTO user_password_history (user_id, password_hash)
    VALUES (p_user_id, p_password_hash);
    
    -- 删除超出限制的旧密码记录
    DELETE FROM user_password_history
    WHERE user_id = p_user_id
    AND id NOT IN (
        SELECT id FROM user_password_history
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT p_history_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：用户角色变更时记录历史
CREATE OR REPLACE FUNCTION trigger_user_role_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果角色发生变更，记录到历史表
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO user_role_history (
            user_id,
            old_role,
            new_role,
            changed_by,
            reason
        ) VALUES (
            NEW.id,
            OLD.role,
            NEW.role,
            auth.uid(),
            'Role updated'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_user_role_change ON user_profiles;
CREATE TRIGGER trigger_user_role_change
    AFTER UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_role_history();

-- 创建触发器：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表创建 updated_at 触发器
DROP TRIGGER IF EXISTS trigger_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER trigger_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：用户安全概览
CREATE OR REPLACE VIEW user_security_overview AS
SELECT 
    up.id,
    up.email,
    up.name,
    up.role,
    up.status,
    up.email_verified,
    up.last_login,
    up.created_at,
    (
        SELECT COUNT(*) 
        FROM user_login_attempts ula 
        WHERE ula.email = up.email 
        AND ula.created_at > NOW() - INTERVAL '24 hours'
        AND ula.success = false
    ) as failed_login_attempts_24h,
    (
        SELECT COUNT(*) 
        FROM user_sessions us 
        WHERE us.user_id = up.id 
        AND us.expires_at > NOW()
    ) as active_sessions,
    (
        SELECT COUNT(*) 
        FROM user_devices ud 
        WHERE ud.user_id = up.id
    ) as registered_devices,
    (
        SELECT COUNT(*) 
        FROM security_events se 
        WHERE se.user_id = up.id 
        AND se.created_at > NOW() - INTERVAL '30 days'
        AND se.severity IN ('warning', 'critical')
    ) as security_alerts_30d
FROM user_profiles up;

-- 授予权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON user_security_overview TO authenticated;

-- 创建定期清理任务的函数
CREATE OR REPLACE FUNCTION run_auth_maintenance()
RETURNS TEXT AS $$
DECLARE
    login_attempts_cleaned INTEGER;
    sessions_cleaned INTEGER;
    result_text TEXT;
BEGIN
    -- 清理过期的登录尝试记录
    SELECT cleanup_expired_login_attempts() INTO login_attempts_cleaned;
    
    -- 清理过期的会话
    SELECT cleanup_expired_sessions() INTO sessions_cleaned;
    
    result_text := format(
        'Auth maintenance completed: %s login attempts cleaned, %s sessions cleaned',
        login_attempts_cleaned,
        sessions_cleaned
    );
    
    -- 记录维护事件
    PERFORM log_security_event(
        NULL,
        'maintenance_completed',
        'info',
        NULL,
        NULL,
        jsonb_build_object(
            'login_attempts_cleaned', login_attempts_cleaned,
            'sessions_cleaned', sessions_cleaned
        )
    );
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;