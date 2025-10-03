# Environment Setup Guide

This guide explains how to configure environment variables for the Customer Service School project.

## Quick Start

1. **Copy environment files:**
   ```bash
   # Root level
   cp .env.example .env
   
   # Frontend
   cp frontend/.env.example frontend/.env
   
   # Backend
   cp backend/.env.example backend/.env
   ```

2. **Update the values** in each `.env` file according to your environment.

## Environment Files Overview

### Root Level (`.env`)
Contains project-wide configuration variables used by Docker Compose and deployment scripts.

### Frontend (`frontend/.env`)
Contains Vite-specific environment variables (prefixed with `VITE_`).

### Backend (`backend/.env`)
Contains Node.js server configuration variables.

## Environment Variables Reference

### Frontend Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_BASE` | Backend API URL | `http://localhost:3000` | `https://api.yourapp.com` |
| `VITE_SOCKET_URL` | WebSocket connection URL | `http://localhost:3000` | `https://api.yourapp.com` |
| `VITE_DEV_PROXY_TARGET` | Development proxy target | `http://localhost:3001` | `http://192.168.1.100:3001` |

### Backend Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `3000` | `8080` |
| `HOST` | Server host | `0.0.0.0` | `localhost` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` | `https://yourapp.com` |
| `DATABASE_URL` | Database file path | `./database.sqlite` | `/data/app.db` |
| `JWT_SECRET` | JWT signing secret | `change-this-secret` | `your-secure-secret-key` |
| `NODE_ENV` | Environment mode | `development` | `production` |

## Environment-Specific Configurations

### Development Environment
```bash
# Frontend (.env)
VITE_API_BASE=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_DEV_PROXY_TARGET=http://localhost:3001

# Backend (.env)
PORT=3000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Production Environment
```bash
# Frontend (.env)
VITE_API_BASE=https://api.yourapp.com
VITE_SOCKET_URL=https://api.yourapp.com

# Backend (.env)
PORT=3000
HOST=0.0.0.0
FRONTEND_URL=https://yourapp.com
NODE_ENV=production
JWT_SECRET=your-super-secure-production-secret
```

### Docker Development
```bash
# Frontend (.env)
VITE_API_BASE=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001

# Backend (.env)
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production
3. **Restrict CORS origins** in production
4. **Use HTTPS URLs** in production
5. **Rotate secrets regularly**

## Troubleshooting

### Common Issues

**Frontend can't connect to backend:**
- Check `VITE_API_BASE` matches backend URL
- Verify backend `FRONTEND_URL` includes frontend URL
- Ensure CORS is properly configured

**Socket.IO connection fails:**
- Verify `VITE_SOCKET_URL` matches backend URL
- Check firewall settings for WebSocket connections

**Development proxy not working:**
- Update `VITE_DEV_PROXY_TARGET` to correct backend URL
- Restart Vite dev server after changing proxy settings

### Verification Commands

```bash
# Check if environment variables are loaded (Frontend)
npm run dev # Should show proxy target in console

# Check if environment variables are loaded (Backend)
npm start # Should show server URL with correct host/port

# Test API connection
curl http://localhost:3000/health

# Test frontend build
npm run build # Should use correct API URLs
```

## Migration from Hardcoded URLs

This project has been updated to use environment variables instead of hardcoded URLs. The following changes were made:

### Removed Hardcoded URLs:
- ❌ `http://192.168.1.21:3001` in `vite.config.js`
- ❌ `http://localhost:3000` fallback in `lib/api.js`
- ❌ `http://localhost:5173` fallback in `server.js`

### Now Uses Environment Variables:
- ✅ `VITE_DEV_PROXY_TARGET` for development proxy
- ✅ `VITE_API_BASE` for API connections
- ✅ `VITE_SOCKET_URL` for WebSocket connections
- ✅ `FRONTEND_URL` for CORS configuration

This makes the application more flexible and secure for different deployment environments.
