-- Migration: Create audit_log table
-- Description: Optional table for tracking all changes to overtime requests
-- Date: 2024-12-31

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    CONSTRAINT fk_request FOREIGN KEY (request_id)
        REFERENCES overtime_requests(id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_audit_log_request_id ON audit_log(request_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Add comments
COMMENT ON TABLE audit_log IS 'Audit trail for all changes to overtime requests';
COMMENT ON COLUMN audit_log.request_id IS 'Reference to overtime_requests.id';
COMMENT ON COLUMN audit_log.action IS 'Action performed (created, approved, rejected, updated)';
COMMENT ON COLUMN audit_log.performed_by IS 'Employee ID who performed the action';
COMMENT ON COLUMN audit_log.old_values IS 'JSON of old values before change';
COMMENT ON COLUMN audit_log.new_values IS 'JSON of new values after change';

-- Create trigger to automatically log changes
CREATE OR REPLACE FUNCTION log_overtime_request_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (request_id, action, performed_by, new_values)
        VALUES (NEW.id, 'created', NEW.frappe_employee_id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (request_id, action, performed_by, old_values, new_values)
        VALUES (
            NEW.id,
            CASE
                WHEN NEW.approved_by IS NOT NULL AND OLD.approved_by IS NULL AND NEW.reject_reason IS NULL THEN 'approved'
                WHEN NEW.reject_reason IS NOT NULL AND OLD.reject_reason IS NULL THEN 'rejected'
                ELSE 'updated'
            END,
            NEW.approved_by,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_overtime_request_changes
    AFTER INSERT OR UPDATE ON overtime_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_overtime_request_changes();
