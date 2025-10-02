-- Hey-INY Database Schema
-- Initial migration: Three-layer identity system with complete device profiling

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: user_identities
-- Purpose: Store unique user identity records
-- ============================================================================
CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_identity_id VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_sessions INTEGER DEFAULT 1,
    total_devices INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for user_identities
CREATE INDEX idx_user_identities_user_identity_id ON user_identities(user_identity_id);
CREATE INDEX idx_user_identities_last_seen_at ON user_identities(last_seen_at DESC);
CREATE INDEX idx_user_identities_created_at ON user_identities(created_at DESC);
CREATE INDEX idx_user_identities_is_active ON user_identities(is_active);

-- ============================================================================
-- Table: user_device_profiles
-- Purpose: Store detailed device information for each user session
-- ============================================================================
CREATE TABLE user_device_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_identity_id UUID NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
    device_session_id VARCHAR(50) UNIQUE NOT NULL,
    client_uuid VARCHAR(50) NOT NULL,
    
    -- Device fingerprint hashes
    canvas_fingerprint VARCHAR(64),
    audio_fingerprint VARCHAR(64),
    webgl_fingerprint VARCHAR(64),
    
    -- Basic environment
    user_agent TEXT,
    platform VARCHAR(100),
    language VARCHAR(20),
    timezone VARCHAR(100),
    timezone_offset INTEGER,
    
    -- Screen information
    screen_width INTEGER,
    screen_height INTEGER,
    screen_color_depth INTEGER,
    screen_pixel_ratio DECIMAL(4,2),
    
    -- Hardware information
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    
    -- Software environment
    fonts_list TEXT[], -- Array of installed fonts
    plugins_list TEXT[], -- Array of browser plugins
    
    -- Network information
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    isp VARCHAR(255),
    
    -- WebGL information
    webgl_vendor VARCHAR(255),
    webgl_renderer VARCHAR(255),
    
    -- Complete device info (JSON storage for flexibility)
    device_info_raw JSONB NOT NULL,
    
    -- Timestamps
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Status
    is_current BOOLEAN DEFAULT true,
    visit_count INTEGER DEFAULT 1
);

-- Create indexes for user_device_profiles
CREATE INDEX idx_device_profiles_user_identity ON user_device_profiles(user_identity_id);
CREATE INDEX idx_device_profiles_client_uuid ON user_device_profiles(client_uuid);
CREATE INDEX idx_device_profiles_session_id ON user_device_profiles(device_session_id);
CREATE INDEX idx_device_profiles_canvas_fp ON user_device_profiles(canvas_fingerprint);
CREATE INDEX idx_device_profiles_audio_fp ON user_device_profiles(audio_fingerprint);
CREATE INDEX idx_device_profiles_is_current ON user_device_profiles(is_current);
CREATE INDEX idx_device_profiles_last_seen ON user_device_profiles(last_seen_at DESC);

-- Composite index for fingerprint matching
CREATE INDEX idx_device_profiles_fingerprints 
ON user_device_profiles(canvas_fingerprint, audio_fingerprint, webgl_fingerprint);

-- Index for hardware matching
CREATE INDEX idx_device_profiles_hardware 
ON user_device_profiles(hardware_concurrency, device_memory, screen_width, screen_height);

-- GIN index for JSONB queries
CREATE INDEX idx_device_profiles_device_info ON user_device_profiles USING GIN(device_info_raw);

-- ============================================================================
-- Table: device_change_history
-- Purpose: Track all device changes and environment modifications
-- ============================================================================
CREATE TABLE device_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_identity_id UUID NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
    device_session_id VARCHAR(50) NOT NULL,
    previous_session_id VARCHAR(50),
    
    -- Change classification
    change_type VARCHAR(50) NOT NULL, -- 'minor', 'major', 'device_reset', 'new_device'
    change_category VARCHAR(50), -- 'browser_update', 'ip_change', 'os_change', 'hardware_change', etc.
    
    -- Change details
    changed_fields TEXT[], -- Array of field names that changed
    change_summary TEXT,
    
    -- Previous and new values (for comparison)
    previous_values JSONB,
    new_values JSONB,
    
    -- Confidence and matching
    match_confidence DECIMAL(5,4), -- 0.0000 to 1.0000
    recovery_method VARCHAR(50), -- 'uuid_match', 'fingerprint_match', 'hybrid_match', 'new_user'
    
    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for device_change_history
CREATE INDEX idx_change_history_user_identity ON device_change_history(user_identity_id);
CREATE INDEX idx_change_history_session_id ON device_change_history(device_session_id);
CREATE INDEX idx_change_history_change_type ON device_change_history(change_type);
CREATE INDEX idx_change_history_detected_at ON device_change_history(detected_at DESC);
CREATE INDEX idx_change_history_confidence ON device_change_history(match_confidence);

-- GIN index for JSONB queries
CREATE INDEX idx_change_history_metadata ON device_change_history USING GIN(metadata);

-- Composite index for user timeline queries
CREATE INDEX idx_change_history_user_timeline 
ON device_change_history(user_identity_id, detected_at DESC);

-- ============================================================================
-- Table: identity_matching_logs
-- Purpose: Log all identity matching attempts for monitoring and debugging
-- ============================================================================
CREATE TABLE identity_matching_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_uuid VARCHAR(50),
    user_identity_id UUID REFERENCES user_identities(id) ON DELETE SET NULL,
    
    -- Matching results
    match_status VARCHAR(50) NOT NULL, -- 'recognized', 'recovered', 'new', 'failed'
    match_method VARCHAR(50), -- 'uuid_direct', 'canvas_match', 'audio_match', 'hybrid', 'new_user'
    match_confidence DECIMAL(5,4),
    
    -- Device fingerprints used in matching
    canvas_fingerprint VARCHAR(64),
    audio_fingerprint VARCHAR(64),
    
    -- Performance metrics
    processing_time_ms INTEGER,
    candidates_evaluated INTEGER,
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for identity_matching_logs
CREATE INDEX idx_matching_logs_client_uuid ON identity_matching_logs(client_uuid);
CREATE INDEX idx_matching_logs_user_identity ON identity_matching_logs(user_identity_id);
CREATE INDEX idx_matching_logs_match_status ON identity_matching_logs(match_status);
CREATE INDEX idx_matching_logs_attempted_at ON identity_matching_logs(attempted_at DESC);

-- Index for performance monitoring
CREATE INDEX idx_matching_logs_performance 
ON identity_matching_logs(attempted_at DESC, processing_time_ms);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_identities
CREATE TRIGGER update_user_identities_updated_at
    BEFORE UPDATE ON user_identities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate user_identity_id
CREATE OR REPLACE FUNCTION generate_user_identity_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_identity_id IS NULL THEN
        NEW.user_identity_id := 'usr_' || substring(md5(random()::text) from 1 for 12);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate user_identity_id
CREATE TRIGGER generate_user_identity_id_trigger
    BEFORE INSERT ON user_identities
    FOR EACH ROW
    EXECUTE FUNCTION generate_user_identity_id();

-- Function to generate device_session_id
CREATE OR REPLACE FUNCTION generate_device_session_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.device_session_id IS NULL THEN
        NEW.device_session_id := 'ses_' || substring(md5(random()::text || CURRENT_TIMESTAMP::text) from 1 for 12);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate device_session_id
CREATE TRIGGER generate_device_session_id_trigger
    BEFORE INSERT ON user_device_profiles
    FOR EACH ROW
    EXECUTE FUNCTION generate_device_session_id();

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- View: Active user devices
CREATE OR REPLACE VIEW v_active_user_devices AS
SELECT 
    ui.user_identity_id,
    ui.last_seen_at as user_last_seen,
    udp.device_session_id,
    udp.client_uuid,
    udp.platform,
    udp.user_agent,
    udp.last_seen_at as device_last_seen,
    udp.visit_count,
    udp.ip_address,
    udp.country,
    udp.city
FROM user_identities ui
JOIN user_device_profiles udp ON ui.id = udp.user_identity_id
WHERE ui.is_active = true AND udp.is_current = true;

-- View: Recent device changes
CREATE OR REPLACE VIEW v_recent_device_changes AS
SELECT 
    ui.user_identity_id,
    dch.change_type,
    dch.change_category,
    dch.change_summary,
    dch.match_confidence,
    dch.detected_at,
    array_length(dch.changed_fields, 1) as fields_changed_count
FROM user_identities ui
JOIN device_change_history dch ON ui.id = dch.user_identity_id
WHERE dch.detected_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY dch.detected_at DESC;

-- View: User statistics
CREATE OR REPLACE VIEW v_user_statistics AS
SELECT 
    ui.user_identity_id,
    ui.created_at,
    ui.last_seen_at,
    ui.total_sessions,
    ui.total_devices,
    COUNT(DISTINCT udp.id) as active_devices,
    COUNT(dch.id) as total_changes,
    MAX(dch.detected_at) as last_change_at
FROM user_identities ui
LEFT JOIN user_device_profiles udp ON ui.id = udp.user_identity_id AND udp.is_current = true
LEFT JOIN device_change_history dch ON ui.id = dch.user_identity_id
WHERE ui.is_active = true
GROUP BY ui.id, ui.user_identity_id, ui.created_at, ui.last_seen_at, ui.total_sessions, ui.total_devices;

-- ============================================================================
-- Sample Data Partitioning (for large scale deployments)
-- ============================================================================

-- Partition device_change_history by month for better performance
-- Uncomment and adjust for production use

-- CREATE TABLE device_change_history_y2024m01 PARTITION OF device_change_history
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- CREATE TABLE device_change_history_y2024m02 PARTITION OF device_change_history
--     FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ============================================================================
-- Grant Permissions (adjust for your application user)
-- ============================================================================

-- Example for application user 'hey_iny_app'
-- CREATE USER hey_iny_app WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE hey_iny TO hey_iny_app;
-- GRANT USAGE ON SCHEMA public TO hey_iny_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO hey_iny_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hey_iny_app;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_identities IS 'Main user identity records with lifecycle tracking';
COMMENT ON TABLE user_device_profiles IS 'Detailed device fingerprint profiles for each user session';
COMMENT ON TABLE device_change_history IS 'Historical log of all device changes and environment modifications';
COMMENT ON TABLE identity_matching_logs IS 'Audit log of identity matching attempts with performance metrics';

COMMENT ON COLUMN user_device_profiles.canvas_fingerprint IS 'SHA-256 hash of Canvas rendering fingerprint';
COMMENT ON COLUMN user_device_profiles.audio_fingerprint IS 'SHA-256 hash of Audio context fingerprint';
COMMENT ON COLUMN user_device_profiles.device_info_raw IS 'Complete raw device information in JSON format';

COMMENT ON COLUMN device_change_history.change_type IS 'Classification: minor, major, device_reset, new_device';
COMMENT ON COLUMN device_change_history.match_confidence IS 'Confidence score of the device match (0-1)';

-- ============================================================================
-- Completion Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✓ Hey-INY database schema created successfully';
    RAISE NOTICE '✓ Tables: user_identities, user_device_profiles, device_change_history, identity_matching_logs';
    RAISE NOTICE '✓ Indexes: Created for optimal query performance';
    RAISE NOTICE '✓ Triggers: Auto-generation of IDs and timestamp updates';
    RAISE NOTICE '✓ Views: Active devices, recent changes, user statistics';
END $$;
