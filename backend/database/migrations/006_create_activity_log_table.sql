-- Migration: Create activity_log table
-- Description: Track system-wide activities like cron jobs, notifications, and other events
-- Date: 2025-01-19

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    performed_by VARCHAR(255),
    request_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX idx_activity_log_status ON activity_log(status);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_request_id ON activity_log(request_id) WHERE request_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE activity_log IS 'System-wide activity log for tracking cron jobs, notifications, and events';
COMMENT ON COLUMN activity_log.activity_type IS 'Type of activity: cron_job, notification_sent, email_sent, system_event, etc.';
COMMENT ON COLUMN activity_log.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN activity_log.details IS 'Additional JSON details about the activity (recipients, errors, etc.)';
COMMENT ON COLUMN activity_log.status IS 'Status: success, failed, warning, info';
COMMENT ON COLUMN activity_log.performed_by IS 'User email or system identifier that performed the action';
COMMENT ON COLUMN activity_log.request_id IS 'Optional reference to overtime_requests.id if related';
