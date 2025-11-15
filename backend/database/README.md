# Database Files

This directory contains PostgreSQL migrations, scripts, and exports for the RD Overtime System.

## 📁 Directory Structure

```
database/
├── migrations/           # SQL migration files (version-controlled)
│   ├── 001_create_overtime_requests_table.sql
│   ├── 002_create_audit_log_table.sql
│   └── 003_create_views.sql
├── scripts/             # Utility scripts
│   ├── run_migrations.sh       # Run all migrations
│   ├── export_supabase_data.sh # Export from Supabase to CSV
│   └── import_csv.sh           # Import CSV to PostgreSQL
├── exports/             # Generated CSV exports (gitignored)
└── README.md            # This file
```

## 🚀 Quick Commands

### Run Migrations

```bash
cd scripts
./run_migrations.sh

# Or with custom database URL:
./run_migrations.sh "postgresql://user:pass@localhost:5432/rd_ots"
```

### Export from Supabase

```bash
cd scripts
./export_supabase_data.sh

# Output: exports/overtime_requests_YYYYMMDD_HHMMSS.csv
```

### Import to PostgreSQL

```bash
cd scripts
./import_csv.sh ../exports/overtime_requests_20241231_123456.csv

# Or with custom database URL:
./import_csv.sh ../exports/file.csv "postgresql://user:pass@localhost:5432/rd_ots"
```

## 📋 Migration Files

### 001_create_overtime_requests_table.sql

Creates the main `overtime_requests` table with:
- All necessary columns (id, employee_id, dates, hours, approval status, etc.)
- Indexes for performance
- Constraints for data integrity
- Auto-updating `updated_at` trigger

### 002_create_audit_log_table.sql

Creates the `audit_log` table for tracking all changes:
- Records all INSERT/UPDATE operations
- Stores old and new values as JSONB
- Automatically triggers on changes
- Useful for compliance and debugging

### 003_create_views.sql

Creates useful views:
- `v_pending_requests` - Pending approvals
- `v_approved_requests` - Approved requests
- `v_rejected_requests` - Rejected requests
- `v_monthly_summary` - Monthly stats per employee

## 🔄 Migration Tracking

Migrations are tracked in the `schema_migrations` table:

```sql
SELECT * FROM schema_migrations;
```

Output:
```
id | migration_name                           | applied_at
---+------------------------------------------+-------------------------
 1 | 001_create_overtime_requests_table.sql  | 2024-12-31 10:00:00+00
 2 | 002_create_audit_log_table.sql          | 2024-12-31 10:00:01+00
 3 | 003_create_views.sql                    | 2024-12-31 10:00:02+00
```

## 📊 Database Schema

### overtime_requests Table

```sql
CREATE TABLE overtime_requests (
    id SERIAL PRIMARY KEY,
    frappe_employee_id VARCHAR(50) NOT NULL,
    payroll_date DATE NOT NULL,
    hours NUMERIC(3, 1) NOT NULL,
    minutes INTEGER NOT NULL,
    reason TEXT NOT NULL,
    projects_affected TEXT NOT NULL,
    approved_by VARCHAR(50),
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### audit_log Table

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES overtime_requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🛠️ Manual Queries

### Check Pending Requests

```sql
SELECT * FROM v_pending_requests;
```

### View Audit Trail for a Request

```sql
SELECT *
FROM audit_log
WHERE request_id = 123
ORDER BY created_at DESC;
```

### Monthly Summary

```sql
SELECT *
FROM v_monthly_summary
WHERE month >= '2024-01-01'
ORDER BY month DESC, total_approved_hours DESC;
```

### Find Duplicates

```sql
SELECT
    frappe_employee_id,
    payroll_date,
    COUNT(*) as count
FROM overtime_requests
GROUP BY frappe_employee_id, payroll_date
HAVING COUNT(*) > 1;
```

## 🔧 Troubleshooting

### Migrations Won't Run

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d rd_ots -c "SELECT 1;"

# Check permissions
psql -U postgres -d rd_ots -c "SELECT current_user, current_database();"
```

### Export Script Fails

**Requirements:**
- `curl` or `wget` installed
- `jq` installed (for JSON to CSV conversion)
- Valid Supabase credentials in script

```bash
# Install jq on Ubuntu/Debian
sudo apt install jq

# Install jq on macOS
brew install jq
```

### Import Fails

**Common issues:**
- CSV file doesn't exist
- PostgreSQL not running
- Wrong database credentials
- Missing columns in CSV

**Fix:**
```bash
# Verify CSV structure
head -1 your_file.csv

# Should show:
# id,frappe_employee_id,payroll_date,hours,minutes,reason,projects_affected,approved_by,reject_reason,created_at
```

## 📝 Adding New Migrations

Create a new migration file:

```bash
cd migrations
touch 004_add_new_feature.sql
```

Format:
```sql
-- Migration: Description of change
-- Date: YYYY-MM-DD

-- Your SQL here
ALTER TABLE overtime_requests ADD COLUMN new_field VARCHAR(100);

-- Rollback (optional comment)
-- ALTER TABLE overtime_requests DROP COLUMN new_field;
```

Run it:
```bash
cd ../scripts
./run_migrations.sh
```

## 🔐 Security Notes

- Database credentials should be in `.env`, not hardcoded
- Use parameterized queries (the backend already does this)
- Restrict database access by IP in production
- Enable SSL for PostgreSQL connections in production
- Regular backups are recommended

## 📦 Backup & Restore

### Backup

```bash
# Full backup
pg_dump -U rd_ots_user rd_ots > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump -U rd_ots_user --schema-only rd_ots > schema_backup.sql

# Data only
pg_dump -U rd_ots_user --data-only rd_ots > data_backup.sql
```

### Restore

```bash
# Full restore
psql -U rd_ots_user rd_ots < backup_20241231.sql

# Or with create database
psql -U postgres -c "DROP DATABASE IF EXISTS rd_ots;"
psql -U postgres -c "CREATE DATABASE rd_ots;"
psql -U rd_ots_user rd_ots < backup_20241231.sql
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg Node.js Driver](https://node-postgres.com/)
- [Database Migration Guide](../../DATABASE_MIGRATION_GUIDE.md)

---

**Need help?** See [DATABASE_MIGRATION_GUIDE.md](../../DATABASE_MIGRATION_GUIDE.md) for detailed instructions.
