@echo off
echo Checking git status...
git status

echo Adding all changes...
git add .

echo Committing changes...
git commit -m "Fix Vercel deployment issues: update vercel.json config and temporarily disable physics data import"

echo Pushing to remote...
git push origin main

echo Deploying to Vercel...
npx vercel --prod --yes

echo Deployment complete!
pause
