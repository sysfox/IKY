-- IKY Database Schema - Migration 003
-- Add admin credentials for username/password authentication

-- ============================================================================
-- Create admin_credentials table
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_credentials (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for username lookup
CREATE INDEX idx_admin_credentials_username ON admin_credentials(username);

-- ============================================================================
-- Create admin_sessions table for session management
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES admin_credentials(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create index for session token lookup
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- ============================================================================
-- Trigger for updating updated_at timestamp
-- ============================================================================
CREATE TRIGGER update_admin_credentials_updated_at
    BEFORE UPDATE ON admin_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Add comments
-- ============================================================================
COMMENT ON TABLE admin_credentials IS 'Admin user credentials for username/password authentication';
COMMENT ON TABLE admin_sessions IS 'Admin session tokens for authentication';
COMMENT ON COLUMN admin_credentials.username IS 'Admin username for login';
COMMENT ON COLUMN admin_credentials.password_hash IS 'Bcrypt hashed password';

-- ============================================================================
-- Completion Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✓ Admin credentials migration completed';
    RAISE NOTICE '✓ Created admin_credentials table';
    RAISE NOTICE '✓ Created admin_sessions table';
    RAISE NOTICE '✓ Admins can now register with username/password';
END $$;
