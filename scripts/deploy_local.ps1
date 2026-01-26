# Deploy Helper - Run this on your Local Windows Machine
# Usage: .\scripts\deploy_local.ps1

Write-Host "--- Starting Local Deployment Prep ---" -ForegroundColor Cyan

# 1. Export Database
Write-Host "1. Exporting Database 'mcqs-jcq'..." -ForegroundColor Yellow
$dumpPath = "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
if (-not (Test-Path $dumpPath)) {
    Write-Error "mysqldump not found at $dumpPath. Please verify path."
    exit 1
}

& $dumpPath -u root -p123456789 --databases mcqs-jcq --hex-blob --default-character-set=utf8mb4 --skip-lock-tables --result-file=mcqs-jcq_deploy.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database exported successfully to mcqs-jcq_deploy.sql" -ForegroundColor Green
} else {
    Write-Error "Database export failed!"
    exit 1
}

# 2. Git Push
Write-Host "2. Pushing to GitHub..." -ForegroundColor Yellow
git add .
git commit -m "Deploy: Database update and fixes"
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Code pushed to GitHub successfully." -ForegroundColor Green
} else {
    Write-Host "Git push failed. Please check your SSH keys or credentials." -ForegroundColor Red
}

Write-Host "--- Local Prep Complete. Now run 'scripts/deploy_vps.sh' on your VPS ---" -ForegroundColor Cyan
