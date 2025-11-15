#!/bin/bash

# Export data from Supabase to CSV
# Usage: ./export_supabase_data.sh

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Supabase connection (from .env)
SUPABASE_URL="https://izfhzhjtvsvdqptlwofp.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Zmh6aGp0dnN2ZHFwdGx3b2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjQ4NDksImV4cCI6MjA2ODcwMDg0OX0.7kFbVZMCm-Kdbpey1rporMEb8hst-9IBCSzhsJhNxA4"

# Output directory
OUTPUT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../exports"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/overtime_requests_${TIMESTAMP}.csv"

echo -e "${YELLOW}==================================${NC}"
echo -e "${YELLOW}Exporting Supabase Data to CSV${NC}"
echo -e "${YELLOW}==================================${NC}"
echo ""

# Check if curl or wget is available
if command -v curl &> /dev/null; then
    HTTP_CLIENT="curl"
elif command -v wget &> /dev/null; then
    HTTP_CLIENT="wget"
else
    echo "Error: Neither curl nor wget is installed"
    exit 1
fi

echo -e "${YELLOW}Fetching data from Supabase...${NC}"

# Fetch data from Supabase REST API
if [ "$HTTP_CLIENT" = "curl" ]; then
    curl -X GET "${SUPABASE_URL}/rest/v1/Overtime-Requests?select=*&order=id.asc" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -o "${OUTPUT_DIR}/temp_data.json"
else
    wget -O "${OUTPUT_DIR}/temp_data.json" \
      --header="apikey: ${SUPABASE_KEY}" \
      --header="Authorization: Bearer ${SUPABASE_KEY}" \
      --header="Content-Type: application/json" \
      "${SUPABASE_URL}/rest/v1/Overtime-Requests?select=*&order=id.asc"
fi

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Saving raw JSON file.${NC}"
    mv "${OUTPUT_DIR}/temp_data.json" "${OUTPUT_DIR}/overtime_requests_${TIMESTAMP}.json"
    echo -e "${GREEN}✓ Data exported to: ${OUTPUT_DIR}/overtime_requests_${TIMESTAMP}.json${NC}"
    echo ""
    echo "To convert to CSV, install jq and run this script again."
    exit 0
fi

# Convert JSON to CSV using jq
echo -e "${YELLOW}Converting to CSV...${NC}"

# Create CSV header
echo "id,frappe_employee_id,payroll_date,hours,minutes,reason,projects_affected,approved_by,reject_reason,created_at" > "$OUTPUT_FILE"

# Convert JSON data to CSV rows
jq -r '.[] | [.id, .frappe_employee_id, .payroll_date, .hours, .minutes, .reason, .projects_affected, .approved_by // "", .reject_reason // "", .created_at] | @csv' \
    "${OUTPUT_DIR}/temp_data.json" >> "$OUTPUT_FILE"

# Clean up temp file
rm "${OUTPUT_DIR}/temp_data.json"

echo -e "${GREEN}✓ Data exported successfully!${NC}"
echo ""
echo -e "Output file: ${GREEN}${OUTPUT_FILE}${NC}"
echo -e "Total rows: ${GREEN}$(( $(wc -l < "$OUTPUT_FILE") - 1 ))${NC}"
echo ""
echo "To import into PostgreSQL, run:"
echo "  ./import_csv.sh $OUTPUT_FILE"
