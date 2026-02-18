# Data Seeding Guide

## Overview

This guide explains how to seed realistic test data into your School-SaaS MongoDB database. Two methods are provided:

1. **Seed Script** (`seed.js`) - Run from command line
2. **API Endpoint** (`POST /dev/seed/realistic`) - Call from HTTP client

Both methods create:
- **2 Schools** with realistic names
- **20 Teachers** (10 per school)
- **1,200 Students** (600 per school, ~60 per teacher)
- **2 Admins** (1 per school)

---

## Method 1: Using Seed Script

### Prerequisites

- MongoDB must be running and accessible
- `.env` file configured with `MONGO_URI`
- Node.js dependencies installed

### Steps

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Run the seed script:**
   ```bash
   node seed.js
   ```

3. **Expected Output:**
   ```
   🌱 Starting database seed...

   ✅ School created: Delhi Public Academy
   ✅ School created: Mumbai International School
     👤 Admin created: admin1@delhipublicacademy.com
     👤 Admin created: admin2@mumbaiinternationalschool.com
     ✅ 10 teachers created for Delhi Public Academy
     ✅ 10 teachers created for Mumbai International School
     📚 100/600 students created for Delhi Public Academy...
     📚 200/600 students created for Delhi Public Academy...
     ...
   
   ==================================================
   ✅ SEEDING COMPLETED SUCCESSFULLY
   ==================================================
   📊 Summary:
      Schools created: 2
      Admins created: 2
      Teachers created: 20
      Students created: 1200
   ==================================================

   🔑 Test Credentials:
      Admin Login: admin1@delhipublicacademy.com / Password@123
      Admin Login: admin2@mumbaiinternationalschool.com / Password@123
      Sample Teacher: firstname.lastname###@schoolname.edu.in / Password@123
      Sample Student: firstname.lastname###@gmail.com / Password@123
   ```

---

## Method 2: Using API Endpoint

### Prerequisites

- Backend server must be running on `http://localhost:5000`
- Environment: `NODE_ENV !== "production"` (development only)
- Optional: `DEV_SEED_KEY` in `.env` for additional security

### Steps

1. **Send POST request:**
   ```bash
   curl -X POST http://localhost:5000/dev/seed/realistic \
     -H "Content-Type: application/json"
   ```

2. **With optional dev key (if set in `.env`):**
   ```bash
   curl -X POST http://localhost:5000/dev/seed/realistic \
     -H "Content-Type: application/json" \
     -H "x-dev-key: your-dev-seed-key"
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Realistic data seeding completed",
     "summary": {
       "schools": 2,
       "admins": 2,
       "teachers": 20,
       "students": 1200
     },
     "testCredentials": {
       "admin1": "admin1@delhipublicacademy.edu.in / Password@123",
       "admin2": "admin2@mumbaiinternationalschool.edu.in / Password@123",
       "teachers": "firstname.lastname### @schoolname.edu.in / Password@123",
       "students": "firstname.lastname### @gmail.com / Password@123"
     }
   }
   ```

---

## Generated Test Credentials

### Admin Logins

| Email | Password |
|-------|----------|
| admin1@delhipublicacademy.edu.in | Password@123 |
| admin2@mumbaiinternationalschool.edu.in | Password@123 |

### Teacher Logins

Pattern: `firstname.lastname###@schoolname.edu.in`

Example:
- `rajesh.kumar45@delhipublicacademy.edu.in` / `Password@123`
- `priya.sharma12@mumbaiinternationalschool.edu.in` / `Password@123`

### Student Logins

Pattern: `firstname.lastname###@gmail.com`

Example:
- `arjun.patel23@gmail.com` / `Password@123`
- `neha.gupta87@gmail.com` / `Password@123`

---

## Data Distribution

### Schools

1. **Delhi Public Academy**
   - 10 Teachers across classes 1-3
   - 600 Students distributed across teachers
   - ~60 students per teacher class

2. **Mumbai International School**
   - 10 Teachers across classes 1-3
   - 600 Students distributed across teachers
   - ~60 students per teacher class

### Teacher Classes/Sections

- Classes: 1, 2, 3
- Sections: A, B, C, D
- Subjects: Mathematics, English, Science, Physics, Chemistry, etc.

### Student Distribution

- Each student has:
  - Unique email address (firstname.lastname###@gmail.com)
  - Roll number (1-60 per teacher)
  - Parent information (name and phone)
  - Assigned to a specific teacher's class/section
  - School ID for multi-tenancy

---

## Configuration

### Environment Variables

Add to `.env`:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017
# or MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/school_saas

# JWT Secret (required)
JWT_SECRET=your_secret_key_here

# Optional: Protect dev seeding endpoint
DEV_SEED_KEY=your_optional_dev_key
```

### NODE_ENV Safety

The seeding functionality is **development-only**:

```javascript
if (process.env.NODE_ENV === "production") {
  return res.status(404).json({ error: "Not found" });
}
```

- Production environment: Endpoint returns 404
- Development environment: Endpoint works normally

---

## Data Schema

### Schools Collection
```javascript
{
  _id: ObjectId,
  name: "Delhi Public Academy",
  address: string,
  phone: string,
  email: string,
  createdAt: Date
}
```

### Users Collection
```javascript
{
  _id: ObjectId,
  email: string (unique, lowercase),
  passwordHash: string (bcrypt hashed),
  role: "ADMIN" | "TEACHER" | "STUDENT",
  schoolId: ObjectId (optional for students),
  createdAt: Date
}
```

### Teachers Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  name: string,
  email: string,
  subject: string,
  class: string ("1" | "2" | "3"),
  section: string ("A" | "B" | "C" | "D"),
  schoolId: ObjectId (ref: schools),
  createdAt: Date
}
```

### Students Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  name: string,
  email: string,
  class: string ("1" | "2" | "3"),
  section: string ("A" | "B" | "C" | "D"),
  rollNo: string,
  parentName: string,
  phone: string,
  schoolId: ObjectId (ref: schools),
  createdAt: Date
}
```

---

## Features

✅ **Realistic Data**
- Indian names and naming patterns
- Properly formatted email addresses
- Unique email addresses throughout
- Proper phone number formatting

✅ **Password Security**
- All passwords hashed with bcrypt (salt rounds: 10)
- Same hashing logic as production authentication
- Default password: `Password@123`

✅ **Multi-Tenancy**
- Each school has separate data
- Teachers and students linked to schools via `schoolId`
- Admin accounts associated with specific schools

✅ **Proper Relations**
- Students linked to teachers through class/section
- Teachers linked to schools
- Admins linked to schools
- All ObjectId references properly set

✅ **Error Handling**
- Duplicate email prevention
- Batch processing for performance
- Detailed console logging
- Production safety checks

---

## Troubleshooting

### MongoDB Connection Error

**Error:** `connect ECONNREFUSED 127.0.0.1:27017`

**Solution:** 
- Ensure MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify MongoDB credentials for Atlas

### Seed Script Takes Too Long

This is expected for 1,200 students. The script uses batch processing (50 at a time) for optimal performance.

Expected time: **2-5 minutes**

### Duplicate Email Error

**Error:** `E11000 duplicate key error collection`

**Cause:** Running seed twice on same database

**Solution:** Clear the database first or modify the script to skip duplicates

### Dev Key Not Working

**Error:** `403 Forbidden - invalid dev key`

**Solution:**
- Verify `DEV_SEED_KEY` is set correctly in `.env`
- Pass the correct key in request header: `x-dev-key: your-key`

---

## Testing After Seeding

After seeding, test the application:

1. **Admin Login**
   ```
   URL: http://localhost:5173/admin/login
   Email: admin1@delhipublicacademy.edu.in
   Password: Password@123
   ```

2. **Teacher Login**
   ```
   URL: http://localhost:5173/teacher/login
   Email: (use generated email)
   Password: Password@123
   ```

3. **Student Login**
   ```
   URL: http://localhost:5173/student/login
   Email: (use generated email)
   Password: Password@123
   ```

---

## Advanced: Custom Seeding

To modify the seed data:

1. **Edit `server/seed.js`** or create a new script
2. **Modify constants:**
   - `firstNamesMale`, `firstNamesFemale`
   - `lastNames`
   - `subjects`
   - `schoolNames`
   - `teachersPerSchool`
   - `studentsPerSchool`

3. **Adjust passwords:**
   - Search for `"Password@123"`
   - Change to your desired default

4. **Customize email domains:**
   - Modify `generateEmail()` function
   - Change Gmail domain or school domain patterns

---

## Support

For issues or questions:
1. Check MongoDB logs
2. Verify console output from seed script
3. Ensure all environment variables are set
4. Check file permissions for seed.js

---

## Next Steps

After seeding:
- ✅ Test multi-tenancy isolation
- ✅ Navigate admin dashboard
- ✅ Create attendance records
- ✅ Upload grades/marks
- ✅ Test notifications
- ✅ Generate reports
