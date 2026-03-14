# Environment Configuration Quick Reference

This file explains how to configure API URLs for different deployment scenarios.

## 📁 Files Involved

```
client/
├── .env.local          ← Local development (git ignored)
├── .env.production     ← Production build (Vercel deployment)
├── .env.development    ← Optional: Explicit dev config
├── .env.example        ← Template
└── vite.config.js      ← Build & proxy configuration
```

## 🎯 Current Setup

### Local Development
**File:** `client/.env.local`
```dotenv
VITE_API_URL=http://localhost:5000
```
- Used when running: `npm run dev`
- Vite automatically loads this file
- Proxy defined in vite.config.js forwards `/api` to localhost:5000

### Production (Vercel → Render)
**File:** `client/.env.production`
```dotenv
VITE_API_URL=https://school-saas-somv.onrender.com
```
- Used when running: `npm run build`
- Deployed to Vercel
- All API calls go directly to Render backend

---

## Backend MongoDB (Server)

**File:** `server/.env`
```dotenv
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/school_saas
MONGO_URI_STANDARD=mongodb://host1:27017,host2:27017,host3:27017/school_saas?replicaSet=atlas-cluster
```

**Behavior**
- Always tries `MONGO_URI` (SRV) first.
- In development, if SRV DNS fails, it falls back to `MONGO_URI_STANDARD`.
- In production, SRV only (no fallback).
- If both fail, server runs with mock DB and logs: `MongoDB unreachable, using mock database`.

---

## 🔄 How Environment Variables Work

### During Development (`npm run dev`)
1. Vite reads `.env.local`
2. Loads: `VITE_API_URL=http://localhost:5000`
3. Code: `import.meta.env.VITE_API_URL` → `"http://localhost:5000"`
4. Proxy: `vite.config.js` routes `/api/*` → backend

### During Production Build (`npm run build`)
1. Vite reads `.env.production`
2. Loads: `VITE_API_URL=https://school-saas-somv.onrender.com`
3. Code: `import.meta.env.VITE_API_URL` → `"https://school-saas-somv.onrender.com"`
4. Direct fetch calls to Render backend from browser

---

## 🌍 Deployment Scenarios

### Scenario A: Localhost ↔ Localhost (Development)
```
Configuration: .env.local
VITE_API_URL=http://localhost:5000

What happens:
1. Frontend: localhost:5173 (npm run dev)
2. Backend: localhost:5000 (npm start)
3. Proxy: /api calls forwarded by Vite
4. Result: ✅ Works out of the box

No code changes needed!
```

### Scenario B: Vercel ↔ Render (⭐ Current Setup)
```
Configuration: .env.production
VITE_API_URL=https://school-saas-somv.onrender.com

What happens:
1. Frontend: deployed to Vercel (school-app.vercel.app)
2. Build: npm run build (uses .env.production)
3. Deployment: Vercel hosts built dist/ folder
4. API Calls: All requests to school-saas-somv.onrender.com
5. Backend: Render handles all requests
6. Result: ✅ Works after deployment

To deploy:
$ vercel deploy
```

### Scenario C: Render ↔ Render (Alternative)
```
Configuration: Need to create .env.render or update .env.production
VITE_API_URL=https://your-render-backend.onrender.com

What happens:
1. Frontend: Deployed to Render (separate service)
2. Build: npm run build (uses .env.production)
3. Backend: Also on Render (different service)
4. API Calls: Direct to Render backend service
5. Result: ✅ Works when both deployed

Different approach:
- Frontend as separate Render service
- Configure to use backend URL
- Both services communicate on Render network
```

### Scenario D: AWS ↔ Custom Backend
```
Configuration: Update .env.production
VITE_API_URL=https://api.your-domain.com

What happens:
1. Frontend: AWS S3 + CloudFront
2. Build: npm run build (uses .env.production)
3. Backend: Custom domain/server
4. API Calls: Direct to your backend
5. Result: ✅ Works with custom setup

Just update the URL!
```

---

## 📝 How to Change URLs

### For Localhost
**File to edit:** `client/.env.local`
```dotenv
# Local backend on custom port
VITE_API_URL=http://localhost:3000
```

### For Production (Vercel)
**File to edit:** `client/.env.production`
```dotenv
# Change to your actual backend URL
VITE_API_URL=https://your-backend-url.com
# or for Render
VITE_API_URL=https://your-app.onrender.com
# or for AWS
VITE_API_URL=https://api.your-domain.com
```

### After Editing
1. Save the file
2. Rebuild: `npm run build`
3. Deploy: `vercel deploy` (or your deployment tool)

---

## ✅ Verification

### Check Local Development
```bash
cd client
npm run dev

# In browser console (http://localhost:5173)
console.log(import.meta.env.VITE_API_URL);
// Should print: http://localhost:5000
```

### Check Production Build
```bash
cd client
npm run build

# Check dist/assets/main.*.js file
# Search for "VITE_API_URL" or "school-saas-somv.onrender.com"
```

### Test API Connection
```javascript
// Open browser console on your deployed site
fetch(import.meta.env.VITE_API_URL + "/api/tracking/concurrent-users", {
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  }
})
.then(r => r.json())
.then(data => console.log("Success:", data))
.catch(e => console.error("Failed:", e));
```

---

## 🚀 Quick Deployment Steps

### Deploy to Vercel (from client directory)
```bash
# First time setup
npm install -g vercel
vercel login

# Deploy
cd client
npm run build
vercel deploy

# Copy Vercel URL and share
# Example: https://school-app.vercel.app
```

### Update Backend URL
```bash
# If backend URL changes
cd client
nano .env.production
# Edit: VITE_API_URL=https://new-backend-url.com

npm run build
vercel deploy
```

---

## 🔐 Environment Variable Security

- `.env.local` - Git ignored ✅ (local dev only)
- `.env.production` - Can be tracked ✅ (no secrets needed)
- Sensitive data: Use Vercel/Render dashboard environment variables
- Current setup: ✅ No secrets in .env files

---

## 📊 All Components Using Environment Variables

The following components use `import.meta.env.VITE_API_URL`:

1. ✅ `UserTrackingDashboard.jsx` (line 4)
2. ✅ `sessionTracker.js` (line 5)
3. ✅ `MarksViewer.jsx` (if using API)
4. ✅ Any other component with fetch calls

All use the same pattern:
```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
```

---

## 🎯 Summary

| What | Where | Current Value |
|------|-------|---|
| Local API | `.env.local` | `http://localhost:5000` |
| Production API | `.env.production` | `https://school-saas-somv.onrender.com` |
| Default Fallback | Code | `http://localhost:5000` |
| Proxy (Dev) | `vite.config.js` | `/api` → backend |

**That's it!** Your setup is complete and production-ready. 🚀

---

## ❓ FAQ

**Q: Do I need to edit .env files every time I deploy?**
A: No, only when your backend URL changes. The same .env.production works for all deployments to Vercel (as long as backend URL doesn't change).

**Q: What if I want different URLs for staging and production?**
A: Create new environment files:
- `.env.staging` for staging
- `.env.production` for production
- Update build script in package.json to use correct one

**Q: Can I have both frontend and backend on Vercel?**
A: Yes, but you'd need:
- Frontend as static site (current setup) ✅
- Backend as Vercel function or separate service
- Update VITE_API_URL to point to backend

**Q: Is it safe to commit .env.production?**
A: Yes, it only contains URLs with no secrets.
- ✅ Commit .env.production
- ✅ Commit .env.example
- ❌ Don't commit .env.local or secrets

---

**Ready to deploy? You've got everything configured! 🎉**
