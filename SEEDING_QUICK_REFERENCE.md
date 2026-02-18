# Seeding Quick Reference

## Quick Start - Two Methods

### Method 1: Script (Recommended for development)
```bash
cd server
node seed.js
```

### Method 2: API Endpoint
```bash
curl -X POST http://localhost:5000/dev/seed/realistic
```

---

## Test Credentials After Seeding

### Admin
**School 1 - Delhi Public Academy:**
- Email: `admin1@delhipublicacademy.edu.in`
- Password: `Password@123`

**School 2 - Mumbai International School:**
- Email: `admin2@mumbaiinternationalschool.edu.in`
- Password: `Password@123`

### Teachers (Examples)
Find in MongoDB or from console output after seeding:
- Pattern: `firstname.lastname###@schoolname.edu.in`
- Password: `Password@123`
- Example: `rajesh.kumar45@delhipublicacademy.edu.in`

### Students (Examples)
Find in MongoDB or from console output after seeding:
- Pattern: `firstname.lastname###@gmail.com`
- Password: `Password@123`
- Example: `arjun.patel23@gmail.com`

---

## What Gets Created

| Entity | Count | Details |
|--------|-------|---------|
| Schools | 2 | Delhi Public Academy, Mumbai International School |
| Admins | 2 | 1 per school |
| Teachers | 20 | 10 per school, across classes 1-3 |
| Students | 1,200 | 600 per school, ~60 per teacher |
| **Total Users** | **1,222** | Admins + Teachers + Students |

---

## Useful MongoDB Queries

Connect to MongoDB and run these to verify:

```javascript
// Count schools
db.schools.countDocuments() // Should be 2

// Count users by role
db.users.countDocuments({ role: "ADMIN" }) // Should be 2
db.users.countDocuments({ role: "TEACHER" }) // Should be 20
db.users.countDocuments({ role: "STUDENT" }) // Should be 1200

// Find all teachers
db.teachers.find({})

// Find students for a specific teacher
db.students.find({ class: "1", section: "A" })

// Find all users with email
db.users.find({}, { email: 1, role: 1 })

// Check for duplicate emails
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

---

## Environment Setup (.env)

```env
# Required
MONGO_URI=mongodb://localhost:27017/school_saas
JWT_SECRET=your_secret_key

# Optional - Protect seeding endpoint
DEV_SEED_KEY=your_optional_key
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection error | Ensure MongoDB is running: `mongod` |
| Seed fails with 500 error | Check `.env` file exists and MONGO_URI is correct |
| Duplicate email error | Clear database or use fresh seeding |
| Takes very long time | Normal - seeding 1200+ records takes 2-5 minutes |
| Endpoint returns 404 | NODE_ENV must not be "production" |

---

## Login Flow After Seeding

1. **Start both servers:**
   ```bash
   # Terminal 1 - Backend
   cd server && npm start

   # Terminal 2 - Frontend
   cd client && npm run dev
   ```

2. **Navigate to:**
   - Admin: `http://localhost:5173/admin/login`
   - Teacher: `http://localhost:5173/teacher/login`
   - Student: `http://localhost:5173/student/login`

3. **Use seeded credentials:**
   - Email: (from table above)
   - Password: `Password@123`

---

## Seeding Details

**Data Seeded Per School:**
- ✅ School record
- ✅ 1 Admin user + account
- ✅ 10 Teachers with:
  - Classes: 1, 2, 3 (rotating across 10 teachers)
  - Sections: A, B, C, D (mixed assignments)
  - Subjects: Various (Math, English, Science, etc.)
  - Unique emails following pattern
  - Hashed passwords (bcrypt, 10 rounds)

- ✅ 600 Students with:
  - ~60 students per teacher (class/section)
  - Unique emails (firstname.lastname###)
  - Parent information
  - Roll numbers (1-60 per class)
  - Hashed passwords matching teacher auth

**Email Patterns:**
- Admins: `admin[N]@[schoolname].edu.in`
- Teachers: `firstname.lastname[###]@[schoolname].edu.in`
- Students: `firstname.lastname[###]@gmail.com`

**Password Policy:**
- Algorithm: bcrypt with 10 salt rounds
- Default: `Password@123`
- Used across all roles (Admin, Teacher, Student)

---

## Features

✅ Realistic Indian names (no random strings)
✅ Proper email formats and uniqueness
✅ Secure password hashing (bcrypt)
✅ Multi-tenancy support (separate schools)
✅ Teacher-student class/section associations
✅ Parent/contact information for students
✅ Development-only protection (NODE_ENV check)
✅ Batch processing for performance
✅ Comprehensive console logging

---

## Performance

Expected execution times with default settings:

- **Script Method:** 2-5 minutes (depending on MongoDB speed)
- **API Method:** 2-5 minutes (same backend process)
- **Bottleneck:** Student insertion (1200 records in batches of 50)
- **Network:** Negligible if MongoDB is local

---

## Next: Test Case Ideas

After seeding, test these scenarios:

1. ✅ Admin can view all teachers and students
2. ✅ Teachers can access their assigned students only
3. ✅ Students cannot access other students' data
4. ✅ Multi-tenancy: School 1 staff can't see School 2 data
5. ✅ Create attendance for a class
6. ✅ Upload marks for students
7. ✅ Generate student reports
8. ✅ Send notifications to all students

---

## Development Notes

- **Realistic Names:** 22 male + 20 female Indian first names, 22 last names
- **Subjects:** 11 subjects (Math, English, Science, Physics, Chemistry, Biology, History, Geography, Computer Science, Physical Education, Arts)
- **Classes:** 1, 2, 3 (primary school level)
- **Sections:** A, B, C, D (4 sections per class)
- **Batch Size:** 50 students per batch (optimized for performance)

---

## Cleanup

To reset and reseed:

```bash
# In MongoDB
db.schools.deleteMany({})
db.users.deleteMany({})
db.teachers.deleteMany({})
db.students.deleteMany({})
db.subjects.deleteMany({})
db.attendance.deleteMany({})
db.marks.deleteMany({})

# Then run seed again
node seed.js
```

Or if using a development database, you can drop the entire database and recreate.

---

Files:
- **Script:** `server/seed.js` (standalone script)
- **Endpoint:** `POST /dev/seed/realistic` (in `server/server.js`)
- **Guide:** `SEEDING_GUIDE.md` (this directory, comprehensive)
- **Quick Ref:** This file

For full details, see `SEEDING_GUIDE.md`
