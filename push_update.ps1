# PowerShell script to push updates
Write-Host "Adding files to git..."
git add .

Write-Host "Committing changes..."
git commit -m "Add README.md and trigger Vercel redeploy with latest fixes"

Write-Host "Pushing to origin main..."
git push origin main

Write-Host "Deployment triggered! Check Vercel dashboard for status."
