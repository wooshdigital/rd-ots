-- Migration: Create useful views
-- Description: Create views for common queries
-- Date: 2024-12-31

-- View: Pending requests (awaiting approval)
CREATE OR REPLACE VIEW v_pending_requests AS
SELECT
    id,
    frappe_employee_id,
    payroll_date,
    hours,
    minutes,
    reason,
    projects_affected,
    created_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/3600 AS hours_waiting
FROM overtime_requests
WHERE approved_by IS NULL
ORDER BY created_at ASC;

COMMENT ON VIEW v_pending_requests IS 'All pending overtime requests awaiting approval';

-- View: Approved requests
CREATE OR REPLACE VIEW v_approved_requests AS
SELECT
    id,
    frappe_employee_id,
    payroll_date,
    hours,
    minutes,
    reason,
    projects_affected,
    approved_by,
    created_at,
    updated_at
FROM overtime_requests
WHERE approved_by IS NOT NULL
    AND reject_reason IS NULL
ORDER BY payroll_date DESC;

COMMENT ON VIEW v_approved_requests IS 'All approved overtime requests';

-- View: Rejected requests
CREATE OR REPLACE VIEW v_rejected_requests AS
SELECT
    id,
    frappe_employee_id,
    payroll_date,
    hours,
    minutes,
    reason,
    projects_affected,
    approved_by,
    reject_reason,
    created_at,
    updated_at
FROM overtime_requests
WHERE reject_reason IS NOT NULL
ORDER BY payroll_date DESC;

COMMENT ON VIEW v_rejected_requests IS 'All rejected overtime requests';

-- View: Monthly summary by employee
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
    frappe_employee_id,
    DATE_TRUNC('month', payroll_date) AS month,
    COUNT(*) AS total_requests,
    SUM(CASE WHEN approved_by IS NOT NULL AND reject_reason IS NULL THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN reject_reason IS NOT NULL THEN 1 ELSE 0 END) AS rejected_count,
    SUM(CASE WHEN approved_by IS NULL THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN approved_by IS NOT NULL AND reject_reason IS NULL THEN hours + (minutes::numeric / 60) ELSE 0 END) AS total_approved_hours
FROM overtime_requests
GROUP BY frappe_employee_id, DATE_TRUNC('month', payroll_date)
ORDER BY month DESC, frappe_employee_id;

COMMENT ON VIEW v_monthly_summary IS 'Monthly summary of overtime requests per employee';
