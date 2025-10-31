@echo off
echo Starting Gitam Library System Server...
node backend/server.js &
timeout /t 3 /nobreak > nul
echo Opening login page in browser...
start http://localhost:3002/login.html
echo Server is running on port 3002. Connected to MongoDB.
pause
