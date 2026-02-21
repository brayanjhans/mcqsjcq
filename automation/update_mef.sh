#!/bin/bash
# Script to update MEF execution data on Linux (VPS)
# Intended to be run daily via CRON.

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$( dirname "$SCRIPT_DIR" )"
LOG_FILE="$PROJECT_DIR/logs/mef_update.log"
VENV_ACTIVATE="$PROJECT_DIR/venv/bin/activate"
IMPORT_SCRIPT="$PROJECT_DIR/scripts/import_mef_csv.py"
SCRIPTS_DIR="$PROJECT_DIR/scripts"

mkdir -p "$(dirname "$LOG_FILE")"

echo "----------------------------------------------------------------" >> "$LOG_FILE"
echo "Starting MEF Update: $(date)" >> "$LOG_FILE"
echo "Project Dir: $PROJECT_DIR" >> "$LOG_FILE"

# Activate Venv
if [ -f "$VENV_ACTIVATE" ]; then
    echo "Activating virtual environment..." >> "$LOG_FILE"
    source "$VENV_ACTIVATE"
else
    echo "ERROR: Virtual environment not found at $VENV_ACTIVATE" >> "$LOG_FILE"
    exit 1
fi

# Function to download and import
process_year() {
    YEAR=$1
    URL="https://fs.datosabiertos.mef.gob.pe/datastorefiles/${YEAR}-Gasto-Devengado-Diario.csv"
    FILE="$SCRIPTS_DIR/mef_${YEAR}_gasto.csv"

    echo "Processing Year $YEAR..." >> "$LOG_FILE"
    
    # Download
    echo "Downloading $URL..." >> "$LOG_FILE"
    curl -L -o "$FILE" "$URL" >> "$LOG_FILE" 2>&1
    
        if [ $? -eq 0 ]; then
        echo "Download successful." >> "$LOG_FILE"
        # Import ALL rows to handle projects without explicit CUI in description
        python3 "$IMPORT_SCRIPT" --year "$YEAR" --all-rows >> "$LOG_FILE" 2>&1
    else
        echo "ERROR: Download failed for $YEAR" >> "$LOG_FILE"
    fi
}

# Process years
process_year 2025
process_year 2026

echo "Finished: $(date)" >> "$LOG_FILE"
echo "----------------------------------------------------------------" >> "$LOG_FILE"
