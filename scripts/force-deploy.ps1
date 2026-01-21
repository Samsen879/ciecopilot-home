# Force Vercel deployment script
Write-Host "Adding trigger file..."
git add trigger-deploy.txt

Write-Host "Committing changes..."
git commit -m "trigger: force Vercel redeploy - $(Get-Date)"

Write-Host "Pushing to origin..."
git push origin main

Write-Host "Deployment trigger completed!"
