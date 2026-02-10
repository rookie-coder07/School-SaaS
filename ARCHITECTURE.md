# 🏗️ Multi-Tenancy Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite)                          │
│                    http://localhost:5173                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Student Dashboard      Teacher Dashboard      Admin Dashboard   │
│  ├─ Marks Grid         ├─ Student List        ├─ Schools        │
│  ├─ Attendance Summary ├─ Marks Management    ├─ Users          │
│  ├─ Homework          ├─ Attendance (DRAFT→) ├─ Reports        │
│  └─ Profile           └─ Profile              └─ Settings       │
│                                                                   │
│  localStorage: { studentToken, teacherToken, adminToken }       │
│                                                                   │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP/REST + JWT Token
                  │ schoolId validated on every request
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                     BACKEND (Express.js)                         │
│                  http://localhost:5000                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Route Middleware Chain:                                         │
│  ┌──────────┬──────────────┬────────────┬──────────┐            │
│  │requireAuth│requireRole() │requireTenant│ Handler  │           │
│  │          │              │Id()        │          │           │
│  └──────────┴──────────────┴────────────┴──────────┘           │
│       ✓ JWT    ✓ ADMIN/    ✓ Validate  Convert    Process      │
│       Valid    TEACHER/    & Extract   schoolId   Request      │
│               STUDENT      schoolId    to ObjectId              │
│                                                                   │
│  Protected Routes:                                              │
│  ├─ POST /api/auth/login (student/teacher/admin)               │
│  ├─ GET  /api/student/dashboard                                │
│  ├─ GET  /api/student/attendance                               │
│  ├─ GET  /api/student/marks                                    │
│  ├─ GET  /api/teacher/students                                 │
│  ├─ POST /api/teacher/marks/save                               │
│  ├─ POST /api/teacher/attendance/save      (DRAFT)             │
│  ├─ POST /api/teacher/attendance/submit    (SUBMITTED)         │
│  └─ ...more routes (all with requireTenantId)                  │
│                                                                   │
└─────────────────┬───────────────────────────────────────────────┘
                  │ MongoDB queries with schoolId filter
                  │ Every query: { schoolId: ObjectId(...) }
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                    MONGODB DATABASE                              │
│               Multi-School Data (Isolated)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  School A (schoolId: 507f1f77bcf86cd799439011)                 │
│  ├─ Users → [admin, teacher1, student1, ...]                   │
│  ├─ Marks → [mark1, mark2, ...] all with schoolId=A            │
│  ├─ Attendance → [att1, att2, ...] all with schoolId=A + status │
│  └─ Other → [homework, events, subjects, ...]                  │
│                                                                   │
│  School B (schoolId: 507f1f77bcf86cd799439012)                 │
│  ├─ Users → [admin, teacher2, student2, ...]                   │
│  ├─ Marks → [mark3, mark4, ...] all with schoolId=B            │
│  ├─ Attendance → [att3, att4, ...] all with schoolId=B + status │
│  └─ Other → [homework, events, subjects, ...]                  │
│                                                                   │
│  SCHEMA with schoolId (REQUIRED):                               │
│  ├─ users:      { _id, email, schoolId, role, password, ... }  │
│  ├─ students:   { _id, email, schoolId, name, class, ... }     │
│  ├─ teachers:   { _id, email, schoolId, name, class, ... }     │
│  ├─ marks:      { _id, studentId, teacherId, schoolId, ... }   │
│  ├─ attendance: { _id, studentId, classId, schoolId,           │
│  │               submissionStatus: DRAFT|SUBMITTED, ... }       │
│  └─ other:      { ... always include schoolId ... }            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Data Flow: Login → Verification → Access

### STUDENT LOGIN FLOW
```
1. Frontend: POST /api/auth/login
   Body: { email, password }

2. Backend: requireAuth middleware
   ├─ Check credentials
   ├─ Load student from DB
   ├─ VALIDATE: student.schoolId exists?
   │  └─ If missing: return 500 "Profile incomplete (missing schoolId)"
   ├─ Create JWT token:
   │  {
   │    userId: student._id.toString(),
   │    role: "STUDENT",
   │    schoolId: student.schoolId.toString()  ← STRING format
   │  }
   └─ Return token

3. Frontend: Store in localStorage
   localStorage.setItem('studentToken', token)

4. Frontend: Access protected resource
   GET /api/student/dashboard
   Headers: { Authorization: "Bearer token" }

5. Backend: Protected route middleware
   ├─ requireAuth: Verify JWT exists & valid
   ├─ requireRole('STUDENT'): Check role === STUDENT
   ├─ requireTenantId: ✨ KEY SECURITY STEP
   │  ├─ Extract schoolId from JWT (STRING)
   │  ├─ Convert to ObjectId
   │  ├─ Store as req.user.schoolIdObj
   │  └─ Proceed only if valid
   └─ Handler: Query with { schoolId: req.user.schoolIdObj }

6. Database Query
   db.marks.find({ 
     schoolId: ObjectId("507f1f77bcf86cd799439011"),  ← Converted
     studentId: student._id
   })

7. Result: Only marks from Student's school returned ✅
```

---

## 🎓 Teacher DRAFT→SUBMITTED Workflow

```
SCENARIO: Teacher submits attendance

Step 1: Save Attendance (DRAFT)
┌─ POST /api/teacher/attendance/save
├─ Middleware: requireAuth → requireRole('TEACHER') → requireTenantId
├─ Validation: 
│  ├─ Class/Section match? (403 if wrong)
│  └─ schoolId present? (400 if missing)
└─ Save to DB:
   {
     _id: new ObjectId(),
     classId: "1-K",
     schoolId: teacher.schoolId,
     studentId: student._id,
     date: "2024-01-15",
     status: "PRESENT",
     submissionStatus: "DRAFT"  ← NOT VISIBLE TO STUDENTS YET
   }

Step 2: Student Tries to View (Teacher hasn't submitted)
┌─ GET /api/student/attendance
├─ Backend query:
│  db.attendance.find({
│    schoolId: student.schoolId,
│    submissionStatus: "SUBMITTED"  ← FILTERS OUT DRAFT
│  })
└─ Result: Empty array (no submitted attendance yet)

Step 3: Teacher Submits Attendance
┌─ POST /api/teacher/attendance/submit
├─ Middleware: requireAuth → requireRole('TEACHER') → requireTenantId
├─ Validation:
│  ├─ Class/Section match? (403 if wrong)
│  └─ schoolId present? (400 if missing)
└─ Update in DB:
   WHERE submissionStatus = "DRAFT"
   SET submissionStatus = "SUBMITTED"

Step 4: Student Views Attendance (Now submitted)
┌─ GET /api/student/attendance
├─ Backend query:
│  db.attendance.find({
│    schoolId: student.schoolId,
│    submissionStatus: "SUBMITTED"  ← NOW VISIBLE
│  })
└─ Result: Attendance records shown ✅
```

---

## 🛡️ Security Checkpoints

```
CHECKPOINT 1: Login
┌─ Email + Password valid?
├─ schoolId field exists in user record?
└─ Return error if missing → Prevents incomplete profiles
   
CHECKPOINT 2: JWT Token Creation
┌─ Include schoolId in token as STRING
└─ Prevents accidental removal of tenant context

CHECKPOINT 3: Protected Route Access
┌─ requireAuth: Token signature valid?
├─ requireRole: User role matches endpoint?
└─ requireTenantId: ✨ KEY VALIDATION
   ├─ schoolId exists in token?
   ├─ schoolId format valid (can convert to ObjectId)?
   └─ Reject if missing or invalid (400 error)

CHECKPOINT 4: Database Query
┌─ All queries include schoolId filter?
├─ schoolId is ObjectId type (not string)?
└─ Prevent cross-tenant data access

CHECKPOINT 5: Teacher-Only Checks
┌─ Teacher.class === request.class?
├─ Teacher.section === request.section?
└─ Reject if mismatch (403 error) → Prevent privilege escalation
```

---

## 📊 Data Isolation Examples

### Example 1: Student A trying to see Student B's marks
```
Login as Student A (schoolId = A)
  └─ JWT includes: schoolId = "507f1f77bcf86cd799439011"

GET /api/student/marks
  ├─ Backend processes token
  ├─ Converts schoolId to ObjectId
  ├─ Query: { 
  │    schoolId: ObjectId("507f1f77bcf86cd799439011"),
  │    studentId: A._id
  │  }
  └─ Result: Only Student A's marks returned ✅

Student B's marks (schoolId = B):
  └─ NEVER RETURNED (different schoolId in filter) ✅
```

### Example 2: Teacher trying to enter marks for wrong class
```
Login as Teacher (class="1", section="K", schoolId=A)
  └─ JWT includes: class="1", section="K", schoolId="507f..."

POST /api/teacher/marks/save
Body: { class: "2", section: "A", ... }
  ├─ Middleware validates:
  │  └─ teacher.class ("1") !== request.class ("2")
  ├─ Return 403 error
  └─ Marks NOT saved ✅ (prevents privilege escalation)
```

### Example 3: Cross-school token tampering
```
Attacker intercepts Student A's token, manually changes schoolId to a different ObjectId
  
Request: GET /api/student/dashboard
Headers: { Authorization: "Bearer tampered_token" }
  ├─ JWT signature verification FAILS
  ├─ requireAuth rejects invalid token
  └─ 401 Unauthorized ✅

Even if signature was valid but schoolId different:
  ├─ Query uses tampered schoolId
  ├─ Returns data from different school (BAD!)
  └─ Solution: Database migration to ensure all records have correct schoolId
     + Server-side validation of schoolId matches expected school
```

---

## 🚀 Deployment Checklist

```
PRE-DEPLOYMENT:
☐ All routes have requireTenantId middleware
☐ All DB queries include schoolId filter
☐ Login endpoints validate schoolId exists
☐ Teacher routes validate class/section
☐ DRAFT→SUBMITTED workflow tested
☐ 2+ schools tested with data isolation verified

DATABASE MIGRATION:
☐ Add schoolId to ALL existing documents:
  db.COLLECTION.updateMany(
    { schoolId: { $exists: false } },
    { $set: { schoolId: ObjectId("...") } }
  )

ENVIRONMENT:
☐ .env has ADMIN_EMAIL, ADMIN_PASSWORD
☐ .env has SCHOOL_ID (optional, for backward compat)
☐ MongoDB connection string correct
☐ CORS configured for frontend URL

TESTING:
☐ Login with incomplete profile (missing schoolId) → Error
☐ Student A views: only School A data
☐ Student B views: only School B data
☐ Teacher saves marks: validates class/section
☐ Teacher attendance: DRAFT invisible until SUBMITTED
☐ Logout: token cleared, localStorage empty
```

---

## 📈 Scalability Notes

This architecture scales to:
- ✅ 100+ schools
- ✅ 1000+ students per school
- ✅ Proper MongoDB indexing on schoolId field
- ⚠️ Consider connection pooling for 10k+ concurrent users
- ⚠️ Consider sharding by schoolId for 1M+ records

**Recommended Index:**
```javascript
db.marks.createIndex({ schoolId: 1, studentId: 1 })
db.attendance.createIndex({ schoolId: 1, submissionStatus: 1 })
db.students.createIndex({ schoolId: 1, email: 1 })
```

