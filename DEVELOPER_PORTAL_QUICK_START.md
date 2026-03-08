# 🚀 Developer Portal - Quick Start

## Access Developer Portal

### URL
```
http://localhost:5000/system-core/dev-access
```

### Credentials
```
Email: any@email.com (example, not validated)
Access Code: supersecretdevkey
```

---

## Login Flow

1. Go to `/system-core/dev-access`
2. Enter any email address
3. Enter access code (from `.env` DEV_ACCESS_CODE)
4. Click "Access Developer Console"
5. Redirected to `/system-core/dev-dashboard`

---

## Dashboard Features

| Metric | Shows |
|--------|-------|
| 📊 System Uptime | Days + Hours online |
| 👥 Active Users | Concurrent users |
| 📈 API Requests | Last 24 hour count |
| 🔴 Errors Today | Error logs count |
| 🏫 Schools | Total school accounts |
| 💾 Memory Usage | Heap memory gauge |
| ⚙️ CPU Usage | CPU load percentage |
| 🗄️ MongoDB | Connection status |

---

## Tools Available

```
🏫 Schools Management       /system-core/schools
📝 System Logs             /system-core/logs
⚠️ Error Tracking          /system-core/errors
📊 API Usage              /system-core/api-usage
🔴 Live Activity          /system-core/live-activity
🛠️ Developer Tools        /system-core/tools
```

---

## API Endpoints (For Testing)

### Login
```bash
curl -X POST http://localhost:5000/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "accessCode": "supersecretdevkey"
  }'
```

### Get Dashboard
```bash
curl -X GET http://localhost:5000/api/dev/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get System Health
```bash
curl -X GET http://localhost:5000/api/dev/system-health \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Logs
```bash
curl -X GET "http://localhost:5000/api/dev/logs?limit=20&skip=0" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Errors
```bash
curl -X GET http://localhost:5000/api/dev/errors \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get API Usage
```bash
curl -X GET http://localhost:5000/api/dev/api-usage \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Environment Variables

```dotenv
# Change these for production!
DEV_ACCESS_CODE=supersecretdevkey
JWT_SECRET=your-secret-key-change-in-production
VITE_API_URL=http://127.0.0.1:5000

# Keep these
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/school-saas
```

---

## Mobile Access

✅ Works on all phones  
✅ Responsive design (320px - 2560px)  
✅ Works as PWA (install to home screen)  
✅ Works as APK (when converted)  
✅ Optimized for 2GB RAM devices  

---

## Security Notes

🔐 **Hidden** - Not in navigation menu  
🔐 **Access Code** - Only with DEV_ACCESS_CODE  
🔐 **JWT Protected** - All endpoints require valid token  
🔐 **Rate Limited** - Login attempts are throttled  
🔐 **Logged** - All activity tracked in systemLogs  

---

## Troubleshooting

### Can't login?
- Check `.env` DEV_ACCESS_CODE value
- Restart server after changing .env
- Check browser console for errors

### No data showing?
- Verify MongoDB is running
- Check MongoDB connection in logs
- Try refreshing manually (refresh button)

### Token expired?
- Logout and re-login
- Tokens valid for 7 days
- Check browser localStorage

---

## Files Modified

```
✅ client/src/App.jsx                    (routes)
✅ client/src/pages/DevLogin.jsx         (new)
✅ client/src/pages/DevDashboard.jsx     (updated)
✅ client/src/components/ProtectedRoute  (redirect)
✅ server/server.js                      (endpoints)
✅ .env                                  (config)
```

---

**Ready to monitor your system! 🚀**
