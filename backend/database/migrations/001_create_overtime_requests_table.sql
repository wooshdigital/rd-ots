-- Migration: Create overtime_requests table
-- Description: Main table for storing overtime and undertime requests
-- Date: 2024-12-31

CREATE TABLE IF NOT EXISTS overtime_requests (
    id SERIAL PRIMARY KEY,
    frappe_employee_id VARCHAR(50) NOT NULL,
    payroll_date DATE NOT NULL,
    hours NUMERIC(3, 1) NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    projects_affected TEXT NOT NULL,
    approved_by VARCHAR(50) DEFAULT NULL,
    reject_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_hours CHECK (hours >= 0 AND hours <= 8),
    CONSTRAINT chk_minutes CHECK (minutes IN (0, 15, 30, 45)),
    CONSTRAINT chk_payroll_date CHECK (payroll_date <= CURRENT_DATE)
);

-- Create indexes for better query performance
CREATE INDEX idx_overtime_requests_employee ON overtime_requests(frappe_employee_id);
CREATE INDEX idx_overtime_requests_payroll_date ON overtime_requests(payroll_date);
CREATE INDEX idx_overtime_requests_approved_by ON overtime_requests(approved_by);
CREATE INDEX idx_overtime_requests_created_at ON overtime_requests(created_at DESC);

-- Create composite index for checking duplicates
CREATE UNIQUE INDEX idx_overtime_requests_unique_per_day
    ON overtime_requests(frappe_employee_id, payroll_date, approved_by)
    WHERE approved_by IS NULL;

-- Add comments
COMMENT ON TABLE overtime_requests IS 'Stores overtime and undertime requests from employees';
COMMENT ON COLUMN overtime_requests.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN overtime_requests.frappe_employee_id IS 'Employee ID from ERPNext system';
COMMENT ON COLUMN overtime_requests.payroll_date IS 'Date the overtime/undertime occurred';
COMMENT ON COLUMN overtime_requests.hours IS 'Number of hours (0-8)';
COMMENT ON COLUMN overtime_requests.minutes IS 'Minutes portion (0, 15, 30, or 45)';
COMMENT ON COLUMN overtime_requests.reason IS 'Employee-provided reason for the request';
COMMENT ON COLUMN overtime_requests.projects_affected IS 'Discord channel or project name';
COMMENT ON COLUMN overtime_requests.approved_by IS 'Employee ID of approver (NULL if pending)';
COMMENT ON COLUMN overtime_requests.reject_reason IS 'Reason for rejection if rejected';
COMMENT ON COLUMN overtime_requests.created_at IS 'Timestamp when request was created';
COMMENT ON COLUMN overtime_requests.updated_at IS 'Timestamp when request was last updated';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_overtime_requests_updated_at
    BEFORE UPDATE ON overtime_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
