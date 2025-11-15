# PowerShell script to deploy CORS configuration to Firebase Storage
# Run this from the frontend directory

Write-Host "🚀 Deploying CORS configuration to Firebase Storage..." -ForegroundColor Cyan

# Check if gsutil is available
try {
    $gsutilVersion = gsutil --version 2>&1
    Write-Host "✅ Google Cloud SDK found" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud SDK (gsutil) not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Google Cloud SDK:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "2. Or use Chocolatey: choco install gcloudsdk" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installation, run:" -ForegroundColor Yellow
    Write-Host "  gcloud auth login" -ForegroundColor Yellow
    Write-Host "  gcloud config set project ai-healthcare-robot" -ForegroundColor Yellow
    exit 1
}

# Check if cors.json exists
if (-not (Test-Path "cors.json")) {
    Write-Host "❌ cors.json not found in current directory!" -ForegroundColor Red
    exit 1
}

# Deploy CORS configuration
Write-Host ""
Write-Host "📤 Deploying CORS configuration..." -ForegroundColor Cyan
try {
    gsutil cors set cors.json gs://ai-healthcare-robot.firebasestorage.app
    Write-Host ""
    Write-Host "✅ CORS configuration deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Wait 2-5 minutes for changes to propagate" -ForegroundColor Yellow
    Write-Host "2. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor Yellow
    Write-Host "3. Refresh your browser and try uploading again" -ForegroundColor Yellow
} catch {
    Write-Host ""
    Write-Host "❌ Failed to deploy CORS configuration" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternative: Use Google Cloud Console manually" -ForegroundColor Yellow
    Write-Host "See FIX_FIREBASE_STORAGE_CORS.md for manual steps" -ForegroundColor Yellow
}



