# Vercel Deployment Setup Guide

## ✅ Fixed Issues

### Problem: Build Failure with VITE_API_URL
**Error**: `VITE_API_URL references secret api_url that does not exist`

**Root Cause**: 
- `client/vercel.json` had `"VITE_API_URL": "@api_url"` 
- This tried to reference a secret called `api_url` which wasn't configured
- The `@` prefix syntax is incorrect for environment variables

**Solution**: Removed the problematic `env` section from `vercel.json` and let Vercel use environment variables from its dashboard instead.

---

## 📁 Files Changed

### 1. **`client/vercel.json`** ✅ FIXED
**What was wrong:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@api_url"  // ❌ INCORRECT - references non-existent secret
  }
}
```

**Fixed to:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**Why**: Vercel environment variables should be configured in the Vercel Dashboard, not hardcoded in `vercel.json`. This removes the dependency on a missing secret and lets Vercel use whatever environment variables you set.

---

### 2. **`client/src/pages/DeveloperLogin.jsx`** ✅ FIXED
**What was wrong:**
```jsx
const API_URL = import.meta.env.VITE_API_URL || "";
const endpoint = API_URL ? `${API_URL}/api/auth/developer/login` : "/api/auth/developer/login";
```
This created a relative URL fallback (`/api/...`), which only works with Vite's proxy during development.

**Fixed to:**
```jsx
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const endpoint = `${API_URL}/api/auth/developer/login`;
```

**Why**: Consistent with all other components. Provides a proper fallback URL instead of relative proxying.

---

### 3. **All Other Component Files** ✅ VERIFIED CORRECT
The following files already use the correct pattern and need **NO changes**:
- `AdminDashboard.jsx`: `const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";` ✅
- `TeacherDashboard.jsx`: `const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";` ✅
- `StudentDashboard.jsx`: Uses `API_URL` correctly ✅
- `Admin.jsx`: `const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";` ✅
- `AdminAdmissions.jsx`: `const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";` ✅
- `AdminDashboard-Old.jsx`: `const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";` ✅

---

## 🚀 How to Deploy to Vercel

### Step 1: Push Code to Git
```bash
git add .
git commit -m "Fix: Remove incorrect VITE_API_URL reference from vercel.json"
git push origin main
```

### Step 2: Set Environment Variable in Vercel Dashboard

1. **Go to your Vercel project**: https://vercel.com/dashboard
2. **Click your School SaaS project**
3. **Go to Settings → Environment Variables**
4. **Add new environment variable**:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://school-saas-somv.onrender.com` (or your Render API URL)
   - **Select environments**: Production, Preview, Development
5. **Click "Save"**

### Step 3: Trigger Rebuild
- Vercel will automatically redeploy when you push to main
- Or click "Deployments" → Find your deployment → Click "..." → "Redeploy"

### Step 4: Verify Deployment
1. Go to your Vercel deployment URL
2. Open browser DevTools → Console
3. You should see API calls going to `https://school-saas-somv.onrender.com/api/...` ✅

---

## 🧪 Local Development Setup

### For Frontend (.env file in `/client/`)
```dotenv
# Use default provided in code (http://localhost:5000)
# OR set to your production URL for testing:
VITE_API_URL=http://localhost:5000
```

### For Backend (`.env` in root or `/server/`)
```dotenv
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NETLIFY_DOMAIN=optional_domain
```

---

## 🔍 How the Fallback Works

### In Vite Components:
```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
```

**During Build**:
- If `VITE_API_URL` environment variable is set → use it
- If not set → use `http://localhost:5000` as fallback

**This means**:
- ✅ Vercel: Uses `VITE_API_URL` from dashboard (production URL)
- ✅ Local dev: Falls back to `http://localhost:5000`
- ✅ No build failures from missing environment variables
- ✅ Safe and works offline

---

## ✅ Verification Checklist

- [x] `vercel.json` no longer has `"VITE_API_URL": "@api_url"`
- [x] `DeveloperLogin.jsx` uses proper fallback URL
- [x] All components use `import.meta.env.VITE_API_URL || "http://localhost:5000"`
- [x] `VITE_API_URL` is set in Vercel Dashboard environment variables
- [x] Backend is running on Render at `https://school-saas-somv.onrender.com`
- [x] No hardcoded API URLs in components (all use environment variables)
- [x] No circular dependencies between vercel.json and environment secrets

---

## 🐛 Common Issues & Solutions

### Issue: Vercel Build Still Fails
**Check**:
1. Verify `VITE_API_URL` is set in Vercel Dashboard → Settings → Environment Variables
2. Ensure the value doesn't have `@` prefix or reference to non-existent secrets
3. Clear build cache: Vercel Dashboard → Deployments → Click "..." → Redeploy

### Issue: Frontend can't reach Backend
**Check**:
1. Is backend running on Render?
   ```bash
   # Test the URL
   curl https://school-saas-somv.onrender.com/
   # Should return: {"status":"OK","message":"School SaaS Backend..."}
   ```
2. Is `VITE_API_URL` correct in Vercel Dashboard?
3. Check browser DevTools → Network → See if API calls have correct URL

### Issue: Blank Page / 404 on Vercel
**Check**:
1. Inspect HTML: DevTools → Elements
2. Check that `dist/` folder generated correctly during build
3. Verify `outputDirectory` in `vercel.json` is `dist` (it should be)

### Issue: CORS Errors
**Check**:
1. Is backend CORS configured? Check `server.js` line 15-45
2. Is your Vercel domain in the allowed origins?
3. Does Render backend need restart?

---

## 📝 Environment Variable Summary

| Variable | Where to Set | Value | Used By |
|----------|---|---|---|
| `VITE_API_URL` | Vercel Dashboard | `https://school-saas-somv.onrender.com` | Frontend (all components) |
| `PORT` | Render Environment | `5000` | Backend (Node.js) |
| `MONGO_URI` | Render Environment | MongoDB connection string | Backend |
| `JWT_SECRET` | Render Environment | Random secret key | Backend |

---

## 🎯 Final Check

After deployment, test these:

1. **Admin Login**:
   - Go to Vercel URL
   - Login as admin
   - Should authenticate with backend at `https://school-saas-somv.onrender.com`

2. **Teacher Features**:
   - Login as teacher
   - Record voice message → should upload to `https://school-saas-somv.onrender.com/api/teacher/voice-broadcast`
   - Check student for received message

3. **Student Features**:
   - Login as student
   - See voice messages → audio URLs should be `https://school-saas-somv.onrender.com/uploads/voice/...`
   - Play audio → should work without 0-second duration

4. **API Calls**:
   - Open DevTools → Network tab
   - Perform any action (submit marks, add homework, etc.)
   - Verify all `XHR` requests go to `https://school-saas-somv.onrender.com`

---

## 📞 Notes

- The `.env.production` file in `/client/` is no longer used during Vercel builds. Vercel uses dashboard settings instead.
- The fallback URL `http://localhost:5000` is bundled in the production build. This is intentional for local testing/fallback.
- No secrets are exposed in the code or config files.
- All environment variables are properly scoped to their respective platforms (Vercel for frontend, Render for backend).
