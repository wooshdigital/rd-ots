-- Migration: Create settings table
-- Description: Stores application settings including notification recipients
-- Date: 2025-01-14

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_settings_key ON settings(key);

-- Add comments
COMMENT ON TABLE settings IS 'Stores application configuration settings';
COMMENT ON COLUMN settings.key IS 'Unique setting identifier (e.g., notification_recipients)';
COMMENT ON COLUMN settings.value IS 'Setting value stored as JSON';
COMMENT ON COLUMN settings.description IS 'Human-readable description of the setting';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification recipients
INSERT INTO settings (key, value, description) VALUES (
    'notification_recipients',
    '{"emails": ["hr@roochedigital.com", "admin@roochedigital.com"], "roles": ["HR Manager", "Admin"]}',
    'List of email addresses and roles to notify when new OT/UT requests are submitted'
) ON CONFLICT (key) DO NOTHING;
