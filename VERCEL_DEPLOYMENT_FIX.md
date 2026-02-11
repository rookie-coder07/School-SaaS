# CORS & Deployment Fix Guide

## Problem
Frontend on Vercel cannot access backend on Render due to CORS policy blocking.

## Solution Applied

### 1. Backend (Render) - CORS Fix
✅ Updated `server/server.js` to allow .vercel.app domains:

```javascript
// Now allows:
- localhost domains (dev)
- *.netlify.app (Netlify)
- *.vercel.app (Vercel) ← NEW
```

### 2. Frontend (Vercel) - Environment Configuration
✅ Created `.env.production` with Render backend URL:
```
VITE_API_URL=https://school-saas-somv.onrender.com
```

✅ Created `vercel.json` for deployment configuration

## Deployment Steps

### Step 1: Redeploy Backend on Render
1. Go to https://render.com/
2. Select your "school-saas-somv" service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for green "Live" status
5. Test: `curl https://school-saas-somv.onrender.com/api/auth/student/login -X OPTIONS -v`

### Step 2: Set Vercel Environment Variables
1. Go to https://vercel.com/
2. Select "school-saa" project
3. Go to Settings → Environment Variables
4. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://school-saas-somv.onrender.com`
   - **Environments**: Production, Preview, Development

5. Click "Save"

### Step 3: Redeploy Frontend on Vercel
1. Go to Deployments
2. Click "Redeploy" on latest deployment
3. Wait for build to complete
4. Test: Try login at https://school-saa-q9rn0timm-munnas-projects-1bb24b63.vercel.app

## Testing
```
Frontend URL: https://school-saa-q9rn0timm-munnas-projects-1bb24b63.vercel.app
Backend URL:  https://school-saas-somv.onrender.com

Browser Console should show:
✅ No CORS errors
✅ Login successful
```

## If Still Getting CORS Errors
1. Check Render backend is running (not asleep)
2. Verify environment variable in Vercel is set correctly
3. Check server.js has `.vercel.app` configuration
4. Clear browser cache (Ctrl+Shift+Delete)
5. Try incognito window

## Files Modified
- ✅ `server/server.js` - CORS config updated
- ✅ `client/.env.production` - Production API URL
- ✅ `client/vercel.json` - Vercel build config
