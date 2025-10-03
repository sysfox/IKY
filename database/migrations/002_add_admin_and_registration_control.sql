-- IKY Database Schema - Migration 002
-- Add admin role and registration control features

-- ============================================================================
-- Add role field to user_identities table
-- ============================================================================
ALTER TABLE user_identities
ADD COLUMN role VARCHAR(20) DEFAULT 'user',
ADD COLUMN registration_enabled BOOLEAN DEFAULT true;

-- Create index for role queries
CREATE INDEX idx_user_identities_role ON user_identities(role);

-- ============================================================================
-- Function to set first user as admin
-- ============================================================================
CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM user_identities;
    
    -- If this is the first user, set as admin and disable future registration
    IF user_count = 0 THEN
        NEW.role := 'admin';
        -- Update global registration setting (stored in a settings table or use a simpler approach)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set first user as admin
CREATE TRIGGER set_first_user_as_admin_trigger
    BEFORE INSERT ON user_identities
    FOR EACH ROW
    EXECUTE FUNCTION set_first_user_as_admin();

-- ============================================================================
-- Create system settings table for global configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert default registration setting (enabled initially, will be disabled after first user)
INSERT INTO system_settings (setting_key, setting_value)
VALUES ('registration_enabled', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for quick lookup
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- ============================================================================
-- Function to disable registration after first user
-- ============================================================================
CREATE OR REPLACE FUNCTION disable_registration_after_first_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users (including the one being inserted)
    SELECT COUNT(*) INTO user_count FROM user_identities;
    
    -- If this is the first user, disable future registration
    IF user_count = 1 THEN
        UPDATE system_settings 
        SET setting_value = 'false'::jsonb, 
            updated_at = CURRENT_TIMESTAMP
        WHERE setting_key = 'registration_enabled';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to disable registration after first user
CREATE TRIGGER disable_registration_after_first_user_trigger
    AFTER INSERT ON user_identities
    FOR EACH ROW
    EXECUTE FUNCTION disable_registration_after_first_user();

-- ============================================================================
-- Add comments
-- ============================================================================
COMMENT ON COLUMN user_identities.role IS 'User role: admin or user';
COMMENT ON TABLE system_settings IS 'Global system configuration settings';

-- ============================================================================
-- Completion Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✓ Admin and registration control migration completed';
    RAISE NOTICE '✓ Added role field to user_identities';
    RAISE NOTICE '✓ Created system_settings table';
    RAISE NOTICE '✓ First user will automatically become admin';
    RAISE NOTICE '✓ Registration will be disabled after first user';
END $$;
