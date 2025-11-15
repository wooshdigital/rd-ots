#!/bin/bash

# PostgreSQL Migration Runner
# Usage: ./run_migrations.sh [database_url]

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection
DB_URL=${1:-${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/rd_ots"}}

echo -e "${YELLOW}==================================${NC}"
echo -e "${YELLOW}RD Overtime System - Migrations${NC}"
echo -e "${YELLOW}==================================${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo -e "Database URL: ${GREEN}${DB_URL}${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: Migrations directory not found${NC}"
    exit 1
fi

# Create migrations tracking table if it doesn't exist
echo -e "${YELLOW}Creating migrations tracking table...${NC}"
psql "$DB_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
" || {
    echo -e "${RED}Error: Could not connect to database${NC}"
    exit 1
}

echo -e "${GREEN}✓ Migrations tracking table ready${NC}"
echo ""

# Run each migration file in order
for migration_file in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
    migration_name=$(basename "$migration_file")

    # Check if migration has already been applied
    already_applied=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';")

    if [ "$already_applied" -gt 0 ]; then
        echo -e "${YELLOW}⊘ Skipping: $migration_name (already applied)${NC}"
    else
        echo -e "${YELLOW}→ Running: $migration_name${NC}"

        # Run the migration
        if psql "$DB_URL" -f "$migration_file"; then
            # Record successful migration
            psql "$DB_URL" -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');"
            echo -e "${GREEN}✓ Applied: $migration_name${NC}"
        else
            echo -e "${RED}✗ Failed: $migration_name${NC}"
            exit 1
        fi
    fi
    echo ""
done

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}All migrations completed!${NC}"
echo -e "${GREEN}==================================${NC}"
