@echo off
where node
IF %ERRORLEVEL% NEQ 0 (ECHO NodeJS is not installed or not set in current environment.) else (npm install)
pause