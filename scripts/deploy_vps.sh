#!/bin/bash
# Deploy Script - Run this on your VPS
# Upload this file to your VPS or copy-paste it.
# Usage: ./deploy_vps.sh

# CONFIGURATION
PROJECT_DIR="/var/www/garantias_seacee" # UPDATE THIS IF NEEDED
DB_USER="root" # OR "mcqs-jcq" if specific user
DB_PASS="mcqs-jcq" # Check credentials provided
DB_NAME="mcqs-jcq"

echo "--- Starting VPS Deployment ---"

# 1. Pull Code
echo "1. Pulling latest code..."
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    git pull origin main
else
    echo "Directory $PROJECT_DIR does not exist. Cloning..."
    # git clone git@github.com:scraping050/garantias_seacee.git "$PROJECT_DIR"
    # cd "$PROJECT_DIR"
fi

# 2. Import Database
echo "2. Importing Database..."
if [ -f "mcqs-jcq_deploy.sql" ]; then
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < mcqs-jcq_deploy.sql
    echo "Database imported successfully."
else
    echo "WARNING: mcqs-jcq_deploy.sql not found. Did you push it?"
fi

# 3. Restart Services (Optional)
# echo "3. Restarting Services..."
# systemctl restart nginx
# systemctl restart gunicorn # or whatever is used

echo "--- Deployment Complete ---"
