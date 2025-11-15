#!/bin/bash

# Import CSV data into PostgreSQL
# Usage: ./import_csv.sh [csv_file] [database_url]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Arguments
CSV_FILE=${1:-""}
DB_URL=${2:-${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/rd_ots"}}

echo -e "${YELLOW}==================================${NC}"
echo -e "${YELLOW}Import CSV to PostgreSQL${NC}"
echo -e "${YELLOW}==================================${NC}"
echo ""

# Check if CSV file is provided
if [ -z "$CSV_FILE" ]; then
    echo -e "${RED}Error: No CSV file provided${NC}"
    echo "Usage: ./import_csv.sh [csv_file] [database_url]"
    echo ""
    echo "Available exports:"
    ls -1 ../exports/*.csv 2>/dev/null || echo "  (none found)"
    exit 1
fi

# Check if file exists
if [ ! -f "$CSV_FILE" ]; then
    echo -e "${RED}Error: File not found: $CSV_FILE${NC}"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    exit 1
fi

echo -e "CSV File: ${GREEN}${CSV_FILE}${NC}"
echo -e "Database: ${GREEN}${DB_URL}${NC}"
echo ""

# Count rows (excluding header)
ROW_COUNT=$(( $(wc -l < "$CSV_FILE") - 1 ))
echo -e "Rows to import: ${GREEN}${ROW_COUNT}${NC}"
echo ""

# Confirm import
read -p "Continue with import? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Import cancelled"
    exit 0
fi

echo -e "${YELLOW}Importing data...${NC}"

# Import CSV into PostgreSQL
psql "$DB_URL" << EOF
-- Create temporary table
CREATE TEMP TABLE temp_import (
    id INTEGER,
    frappe_employee_id VARCHAR(50),
    payroll_date DATE,
    hours NUMERIC(3, 1),
    minutes INTEGER,
    reason TEXT,
    projects_affected TEXT,
    approved_by VARCHAR(50),
    reject_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

-- Copy data from CSV (using stdin)
\COPY temp_import FROM '${CSV_FILE}' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"');

-- Insert into main table (skip duplicates)
INSERT INTO overtime_requests (
    id,
    frappe_employee_id,
    payroll_date,
    hours,
    minutes,
    reason,
    projects_affected,
    approved_by,
    reject_reason,
    created_at
)
SELECT
    id,
    frappe_employee_id,
    payroll_date,
    hours,
    minutes,
    reason,
    projects_affected,
    NULLIF(approved_by, ''),
    NULLIF(reject_reason, ''),
    created_at
FROM temp_import
ON CONFLICT (id) DO NOTHING;

-- Update sequence to avoid ID conflicts
SELECT setval('overtime_requests_id_seq', COALESCE((SELECT MAX(id) FROM overtime_requests), 1), true);

-- Show import summary
SELECT
    COUNT(*) as total_imported,
    SUM(CASE WHEN approved_by IS NOT NULL AND reject_reason IS NULL THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN reject_reason IS NOT NULL THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN approved_by IS NULL THEN 1 ELSE 0 END) as pending
FROM overtime_requests
WHERE id IN (SELECT id FROM temp_import);

-- Drop temp table
DROP TABLE temp_import;
EOF

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Import completed successfully!${NC}"
echo -e "${GREEN}==================================${NC}"
