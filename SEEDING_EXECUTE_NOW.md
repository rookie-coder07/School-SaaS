# 🚀 SEEDING - EXECUTE NOW COMMANDS

Copy and paste these commands directly into your terminal. No interpretation needed.

---

## START HERE: One Command to Seed Everything

### Option A: Via Script (Recommended)
```bash
cd server && node seed.js
```

### Option B: Via API (Requires backend running)
```bash
curl -X POST http://localhost:5000/dev/seed/realistic
```

---

## Full Setup from Scratch

### Step 1: Start Backend
```bash
cd server && npm start
```

### Step 2 (New Terminal): Start Frontend  
```bash
cd client && npm run dev
```

### Step 3 (New Terminal): Run Seed Script
```bash
cd server && node seed.js
```

### Output
```
🌱 Starting database seed...

✅ School created: Delhi Public Academy
✅ School created: Mumbai International School
  👤 Admin created: admin1@delhipublicacademy.edu.in
  👤 Admin created: admin2@mumbaiinternationalschool.edu.in
  ✅ 10 teachers created for Delhi Public Academy
  ✅ 10 teachers created for Mumbai International School
  📚 100/600 students created for Delhi Public Academy...
  📚 200/600 students created for Delhi Public Academy...
  ...continues...

==================================================
✅ SEEDING COMPLETED SUCCESSFULLY
==================================================
📊 Summary:
   Schools created: 2
   Admins created: 2
   Teachers created: 20
   Students created: 1200
==================================================
```

---

## Test Login - Paste These Credentials

### Admin Login 1
```
URL: http://localhost:5173/admin/login
Email: admin1@delhipublicacademy.edu.in
Password: Password@123
```

### Admin Login 2
```
URL: http://localhost:5173/admin/login
Email: admin2@mumbaiinternationalschool.edu.in
Password: Password@123
```

### Teacher Login (Example - find others in MongoDB)
```
URL: http://localhost:5173/teacher/login
Email: rajesh.kumar###@schoolname.edu.in
Password: Password@123
(check console or MongoDB for actual emails)
```

### Student Login (Example - find others in MongoDB)
```
URL: http://localhost:5173/student/login
Email: arjun.patel###@gmail.com
Password: Password@123
(check console or MongoDB for actual emails)
```

---

## Verify Seeding via MongoDB CLI

Paste these into MongoDB shell (one at a time):

```javascript
use school_saas

// Count everything
db.schools.countDocuments()
db.users.countDocuments()
db.teachers.countDocuments()
db.students.countDocuments()

// View schools
db.schools.find({}).pretty()

// View all users
db.users.find({}, {email: 1, role: 1}).limit(10).pretty()

// View one teacher
db.teachers.findOne()

// View one student
db.students.findOne()
```

---

## Use with API Client (Postman/Insomnia)

### Method: POST
### URL: http://localhost:5000/dev/seed/realistic
### Headers: 
```
Content-Type: application/json
```

### Optional Header (if DEV_SEED_KEY set in .env):
```
x-dev-key: your-dev-key
```

### Body: (Leave empty - no body needed)

### Click Send

Expected response:
```json
{
  "success": true,
  "message": "Realistic data seeding completed",
  "summary": {
    "schools": 2,
    "admins": 2,
    "teachers": 20,
    "students": 1200
  }
}
```

---

## Quick Commands Reference

### Check if servers are running
```bash
# Check backend (port 5000)
curl http://localhost:5000/api/health

# Check frontend (port 5173)
curl http://localhost:5173
```

### Check if MongoDB is running
```bash
mongosh
show dbs
exit
```

### Clear database before reseeding
```bash
mongosh
use school_saas
db.dropDatabase()
exit
```

### Check seed.js exists
```bash
ls server/seed.js
```

### Run seed with verbose output
```bash
cd server && DEBUG=* node seed.js
```

---

## Troubleshooting Commands

### MongoDB connection error?
```bash
# Windows - start MongoDB
mongod

# Check if running
netstat -an | findstr 27017
```

### Port 5000 already in use?
```bash
# Find process using port 5000 (Windows)
netstat -ano | findstr :5000

# Kill it (replace PID with actual number)
taskkill /PID <PID> /F
```

### Reset and retry
```bash
# Stop all servers (Ctrl+C in each terminal)

# Clear database
mongosh
use school_saas
db.dropDatabase()
exit

# Start fresh
cd server && npm start        # Terminal 1
cd client && npm run dev      # Terminal 2
cd server && node seed.js     # Terminal 3
```

---

## Environment Variable Setup

Create/edit `.env` in `server/` directory:

```env
MONGO_URI=mongodb://localhost:27017/school_saas
JWT_SECRET=your_secret_key_here
NODE_ENV=development
PORT=5000

# Optional
DEV_SEED_KEY=optional_protection_key
```

---

## One-Liner Commands

### Full Reset and Reseed
```bash
&& mongosh -e "db.dropDatabase()" school_saas && cd server && node seed.js
```

### Check seeding files exist
```bash
ls -la server/seed.js && grep -n "/dev/seed/realistic" server/server.js
```

### View generated emails (after seeding)
```bash
mongosh -e "db.users.find({}, {email: 1}).toArray()" school_saas
```

---

## Common Issues - Quick Fixes

### "Can't find module seed.js"
```bash
# Make sure you're in server directory
cd server
ls seed.js
node seed.js
```

### "MONGO_URI not set"
```bash
# Create .env file in server/
echo MONGO_URI=mongodb://localhost:27017/school_saas > server/.env
echo JWT_SECRET=test_secret >> server/.env
```

### "Port 5000 in use"
```bash
# Use different port
PORT=5001 npm start
```

### "seed.js takes forever"
```bash
# This is normal for 1200+ students. Takes 2-5 minutes.
# Don't interrupt it. Let it finish.

# But if stuck, try:
# 1. Check MongoDB is responsive:
mongosh
db.adminCommand('ping')
exit

# 2. Check disk space:
df -h

# 3. Check MongoDB performance:
mongosh
db.serverStatus()
exit
```

---

## Final Checklist Before Starting

- [ ] MongoDB installed and running (`mongosh` connects)
- [ ] `.env` file exists in `server/` with MONGO_URI and JWT_SECRET
- [ ] `server/seed.js` exists (329 lines)
- [ ] `server/server.js` contains `/dev/seed/realistic` endpoint
- [ ] `npm install` completed in both `server/` and `client/`
- [ ] Port 5000 available (backend)
- [ ] Port 5173 available (frontend)

---

## Go!

```bash
cd server && npm start
```

( Open new terminal )

```bash
cd client && npm run dev
```

( Open new terminal )

```bash
cd server && node seed.js
```

**Wait 3-5 minutes... and you're done!** ✨

---

## After Seeding

1. ✅ Backend runs on: http://localhost:5000
2. ✅ Frontend runs on: http://localhost:5173
3. ✅ Login with admin credentials (see above)
4. ✅ 2 schools created
5. ✅ 20 teachers created
6. ✅ 1200 students created
7. ✅ All passwords hashed securely
8. ✅ Multi-tenancy working

---

## Need Help?

**Quick Start:** Read this file (you're reading it!)
**Full Guide:** `SEEDING_GUIDE.md`
**Credentials:** `SEEDING_QUICK_REFERENCE.md`
**Overview:** `SEEDING_COMPLETE_SUMMARY.md`

All files in workspace root.

---

**Ready? Copy and paste the first command above. You've got this!** 🎓
