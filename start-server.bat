@echo off
echo Starting Persatuan Anak Kelantan Server...
cd backend
start "Server" cmd /k "node server.js"
echo Server started! Check the new window.
echo Login page: http://localhost:3000/login
pause
