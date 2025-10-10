# TODO: Fix MySQL Connection Issue in PM2

## Problem
- MySQL connection closes prematurely in production, causing "Can't add new command when connection is in closed state" errors.
- Affects login (authenticateUser) and kiosk (getAllServices) endpoints.

## Solution
- Switch from single MySQL connection to connection pool for better reliability and automatic reconnection.

## Steps
- [x] Modify backend/src/models/db.js to use mysql.createPool instead of createConnection.
- [ ] Deploy the changes to VPS and restart PM2 process.
- [ ] Monitor PM2 logs for any remaining issues.
