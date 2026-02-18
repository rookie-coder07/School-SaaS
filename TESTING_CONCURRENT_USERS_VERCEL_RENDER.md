# Testing Concurrent Users - Vercel + Render Guide

## 🎯 Goal
Verify that the User Tracking Dashboard shows concurrent users correctly when deployed to Vercel frontend + Render backend.

---

## ✅ Pre-Deployment Checklist

Before testing in production, ensure:

- [ ] Backend is running on Render (check Render dashboard)
- [ ] `.env.production` has correct Render URL: `VITE_API_URL=https://school-saas-somv.onrender.com`
- [ ] Frontend built locally: `npm run build`
- [ ] `dist/` folder created with bundled code
- [ ] No build errors during npm run build
- [ ] Package.json has correct build script

---

## 🚀 Step 1: Deploy Frontend to Vercel

### Option A: Using Vercel CLI

```bash
# From client directory
cd client

# Install Vercel CLI (first time only)
npm install -g vercel

# Deploy
vercel deploy

# Follow prompts:
# - Setup new Vercel project? (Yes)
# - Project name: school-app (or your choice)
# - Framework preset: Vite (select this)
# - Build command: npm run build
# - Output directory: dist
# - Install dependencies? (Yes)
```

**Result:** You'll get a Vercel URL like `https://school-app.vercel.app`

### Option B: GitHub Integration (Recommended for continuous deployment)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Connect on Vercel**
   - Go to vercel.com
   - Click "New Project"
   - Select GitHub repo
   - Framework: Vite (auto-detected)
   - Deploy

3. **Auto-redeploy on Push**
   - Every git push rebuilds and redeploys
   - Perfect for continuous development

---

## 🔧 Step 2: Verify Deployment Configuration

### Check Frontend Build Includes Correct API URL

```bash
# After deployment, check that the built code uses correct URL
# Look at one user from different device/incognito window

# In browser console on Vercel site:
console.log(import.meta.env.VITE_API_URL);
// Should show: https://school-saas-somv.onrender.com
```

### Alternative: Inspect Network Requests

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Filter to "tracking"
4. Look for API calls:
   - `https://school-saas-somv.onrender.com/api/tracking/concurrent-users`
5. Should return 200 (success) with user data

---

## 📊 Step 3: Test Concurrent Users Display

### Test Case 1: Single User

1. Open Vercel URL: `https://your-app.vercel.app`
2. Log in as Admin
3. Navigate to Dashboard → "User Tracking" tab
4. **Expected:** See yourself in "Active Now" section with:
   - User name (or ID if name not found)
   - Role (admin)
   - Login time
   - Session duration (minutes since login)

### Test Case 2: Multiple Concurrent Users

1. **Window 1:** Open `https://your-app.vercel.app` in incognito/private window
   - Log in as Teacher (User A)
   - Keep this window open
   
2. **Window 2:** Open `https://your-app.vercel.app` in another incognito/private window
   - Log in as Student (User B)
   - Keep this window open

3. **Window 3:** Open `https://your-app.vercel.app` normally
   - Log in as Admin
   - Go to Dashboard → User Tracking
   - **Expected:** See 3 users in "Active Now":
     ```
     User A (Teacher) - 5 minutes
     User B (Student) - 2 minutes  
     Admin (Self) - Just logged in
     ```

4. **Close Window 1 (Teacher)** & click User Tracking again
   - Teacher should disappear from "Active Now" after ~30 seconds
   - Only 2 users remain

### Test Case 3: Daily Statistics

1. Open User Tracking dashboard
2. Go to "Daily Activity" tab
3. Select today's date from date picker
4. **Expected:** See all today's session history with:
   - User names
   - Role
   - Exact login time
   - Exact logout time
   - Total session duration

5. **Select past date (when you ran tests)**
   - Should show all sessions from that day
   - Verify dates match expected

---

## 🔍 Step 4: Detailed Verification

### Check API Responses Directly

Open browser console and run:

```javascript
// Get your JWT token
const token = localStorage.getItem("token");
if (!token) {
  console.log("Not logged in! Login first.");
} else {
  // Test 1: Concurrent Users Endpoint
  fetch("https://school-saas-somv.onrender.com/api/tracking/concurrent-users", {
    headers: { "Authorization": `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(data => {
    console.log("✅ Concurrent Users:");
    console.table(data); // Shows as table format
  })
  .catch(e => console.error("❌ Error:", e));
}
```

**Expected Output:**
```
✅ Concurrent Users:
[
  {
    userId: "507f1f77bcf86cd799439011",
    userName: "John Doe",
    role: "admin",
    loginTime: "2024-01-15T14:30:00.000Z",
    durationMinutes: 5
  },
  ...
]
```

### Test Daily Stats Endpoint

```javascript
const token = localStorage.getItem("token");
const today = new Date().toISOString().split('T')[0]; // "2024-01-15"

fetch(`https://school-saas-somv.onrender.com/api/tracking/daily-stats?date=${today}`, {
  headers: { "Authorization": `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log("✅ Daily Stats:");
  console.table(data);
})
.catch(e => console.error("❌ Error:", e));
```

**Expected Output:**
```
✅ Daily Stats:
[
  {
    userId: "507f1f77bcf86cd799439012",
    userName: "Jane Smith",
    role: "teacher",
    loginTime: "2024-01-15T08:00:00.000Z",
    logoutTime: "2024-01-15T16:30:00.000Z",
    durationMinutes: 510
  },
  ...
]
```

---

## 🐛 Troubleshooting

### Issue: "Connection Refused" or "Failed to Fetch"

**Diagnosis:**
```javascript
// In browser console
console.log(import.meta.env.VITE_API_URL);
// If this doesn't show backend URL, config is wrong
```

**Solution:**
1. Check `.env.production` has correct URL
2. Rebuild frontend: `npm run build`
3. Redeploy to Vercel
4. Clear browser cache (Ctrl+Shift+Delete)

---

### Issue: "Unauthorized" 401 Error

**Cause:** JWT token issue

**Diagnosis:**
```javascript
// Check token exists
console.log(localStorage.getItem("token"));

// Check decoded token
const jwt = localStorage.getItem("token");
const parts = jwt.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log("Token expires:", new Date(payload.exp * 1000));
```

**Solution:**
1. Log out completely
2. Clear browser storage: Developer Tools → Application → Clear site data
3. Log back in (gets new token)
4. Check User Tracking again

---

### Issue: Concurrent Users Shows None / Empty List

**Diagnosis:**
1. Are other users actually logged in?
2. Check their login time is recent (< 24 hours)
3. Verify their session tracking ran

**Debug via Backend Logs:**
```bash
# On Render dashboard
# Check Logs tab for your backend service
# Look for log entries like:
# "Received tracking event: login from userId: 12345"
# "Stored session log for user: 12345"
```

**Solution:**
1. Have users log out and log back in
2. Keep windows open to maintain sessions
3. Check backend is running (Render dashboard)
4. Query MongoDB directly to verify data exists

---

### Issue: User Names Show As "Unknown User"

**Cause:** Student/Teacher records not found in database

**Diagnosis:**
1. Check that users actually exist
2. Verify schoolId matches

**Solution:**
```bash
# Connect to MongoDB and check
# Students collection: Find by userId
# Teachers collection: Find by userId

# If users missing, verify:
# 1. Same database as production backend
# 2. Users created in correct school
# 3. Fields: _id, name, schoolId match
```

---

## 📈 Performance Expectations

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Load time (initial) | < 2 seconds | | |
| Refresh concurrent users | < 1 second | | |
| Daily stats query | < 1 second | | |
| Dashboard responsiveness | Smooth | | |
| Mobile view | Works | | |

---

## 📱 Test on Multiple Devices

Concurrent users are most impressive with real devices:

1. **Desktop Browser** - Admin logs in
2. **Mobile Browser** - Student logs in
3. **Tablet Browser** - Teacher logs in
4. **Admin Desktop** - Opens User Tracking
   - Should see all 3 users with different roles
   - Each device gets same session duration timer

**Pro Tip:** Use personal devices + emulators for realistic testing

---

## ✅ Success Checklist

Mark each item after testing:

- [ ] Frontend deployed to Vercel
- [ ] Can access Vercel URL without errors
- [ ] Can log in from Vercel site
- [ ] User Tracking tab visible to admin
- [ ] API URL in console shows Render backend
- [ ] Single user appears in "Active Now"
- [ ] Multiple users appear correctly
- [ ] User names display (not just IDs)
- [ ] Session duration shows correct minutes
- [ ] Logout removes user from "Active Now"
- [ ] Daily stats shows historical data
- [ ] Date picker works and filters data
- [ ] Role filter works correctly
- [ ] API endpoints respond with 200 status
- [ ] No CORS errors in console
- [ ] Works on mobile devices
- [ ] Performance is acceptable

---

## 🎉 Deployment Complete!

When all checks pass:

✅ **Concurrent users are now visible in production!**

Your User Tracking Dashboard is successfully deployed and working:
- Vercel frontend displaying correctly
- Render backend handling all tracking data
- Multiple users visible concurrently
- Session history tracked daily

### Share Your Deployment
```
Frontend URL: https://your-app.vercel.app
Admin User: [your admin email]
Test: Log in and check User Tracking tab!
```

---

## 📞 Support

If issues persist, check:
1. Browser console for JavaScript errors (F12)
2. Network tab for failed API requests
3. Render dashboard logs for server errors
4. MongoDB Atlas for data presence
5. Vercel deployment logs for build issues

---

**Your production User Tracking system is live! 🚀**
