@echo off
echo Running Prisma migration for outreach module...
echo.

cd /d "%~dp0"

echo Step 1: Generating Prisma Client...
call npx prisma generate

echo.
echo Step 2: Creating migration...
call npx prisma migrate dev --name add_outreach_module

echo.
echo Migration complete!
echo.
echo Next steps:
echo 1. Update your .env.local with the required secrets
echo 2. Start the dev server: npm run dev
echo 3. Visit http://localhost:3000/console
echo.
pause
