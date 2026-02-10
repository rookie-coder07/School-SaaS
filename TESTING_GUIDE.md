# 🔐 Multi-Tenancy Security Hardening - Testing Guide

## ✅ SETUP COMPLETE
- Backend: http://localhost:5000 (running with hardened security)
- Frontend: http://localhost:5173 (React dev server)
- Database: MongoDB connected

---

## 🧪 Quick Testing Instructions

### 1. **Test Admin Login**
```
URL: http://localhost:5173/admin/login
Email: (from .env ADMIN_EMAIL)
Password: (from .env ADMIN_PASSWORD)
Expected: Dashboard loads, schoolId from env variables
```

### 2. **Test Teacher Login (Tenancy Check)**
```
URL: http://localhost:5173/teacher/login
Test Case A - Valid Teacher:
  - Email: teacher1@school.com
  - Check: If teacher has schoolId in DB → Login succeeds
  - Check: Token includes schoolId
  
Test Case B - Teacher Missing schoolId in DB:
  - Create user with role="TEACHER" in DB without schoolId field
  - Try to login
  - Expected: ERROR - "Teacher profile incomplete (missing schoolId)"
```

### 3. **Test Student Login (Tenancy Check)**
```
URL: http://localhost:5173/student/login
Test Case A - Valid Student:
  - Email: student1@school.com
  - Check: If student has schoolId in DB → Login succeeds
  
Test Case B - Student Missing schoolId in DB:
  - Expected: ERROR - "Student profile incomplete (missing schoolId)"
```

### 4. **Test Data Isolation (Multi-School)**
```
SETUP (MongoDB):
  1. Create School A:
     - schoolId: "507f1f77bcf86cd799439011" (ObjectId)
  2. Create School B:
     - schoolId: "507f1f77bcf86cd799439012" (ObjectId)

  3. Add Teacher A to School A (class=1, section=K)
  4. Add Teacher B to School B (class=1, section=K)
  
  5. Add Student A1 to School A
  6. Add Student B1 to School B
  
  7. Add marks for A1 by Teacher A
  8. Add marks for B1 by Teacher B

TEST:
  - Login as Student A1
  - Dashboard should show ONLY A1's marks (not B1's marks)
  - Logout

  - Login as Student B1
  - Dashboard should show ONLY B1's marks (not A1's marks)
  
✅ PASS: Each student only sees their school's data
```

### 5. **Test Attendance DRAFT→SUBMITTED Workflow**
```
1. Teacher Dashboard → Attendance Tab
2. Mark attendance for class
3. Click SAVE → shows "Draft saved"
4. Check backend: attendance records have submissionStatus: "DRAFT"
5. Student tries to view → sees EMPTY (because not SUBMITTED yet)
6. Teacher clicks SUBMIT → shows "Attendance submitted"
7. Check backend: submissionStatus changed to "SUBMITTED"
8. Student view → now sees attendance records
```

### 6. **Test Class/Section Enforcement**
```
Teacher A is assigned to: Class 1, Section K

1. Go to Academics tab
2. Try to enter marks for Class 2, Section A
3. Click Save
4. Expected: ERROR 403 - "You can only enter marks for your own class/section"
```

### 7. **Test Logout**
```
Any Dashboard:
1. Click Logout button
2. Expected: Redirecta to home page, localStorage cleared
3. Go back to dashboard URL
4. Expected: Redirected to login (token gone)
```

---

## 📊 Console Logs to Watch (Backend)

Look for these in server terminal to verify security is working:

### ✅ Good Logs (Security Working)
```
✅ TENANT CHECK: schoolId valid - 507f1f77bcf86cd799439011
✅ STUDENT LOGIN - studentId: ... schoolId: ...
✅ TEACHER LOGIN - teacherId: ... schoolId: ...
✅ TEACHER STUDENTS QUERY - schoolId: ... class: 1, section: K
✅ ATTENDANCE SAVE - schoolId: ... class: 1, section: K
✅ ATTENDANCE SUBMIT - schoolId: ... class: 1, section: K
```

### ❌ Security Alert Logs (Block Attempts)
```
❌ TENANT CHECK FAILED: Missing schoolId in token
❌ STUDENT LOGIN BLOCKED: Student has no schoolId
❌ ATTENDANCE SAVE REJECTED: Teacher class/section mismatch
```

---

## 🔍 Raw API Testing (cURL / Postman)

### Test Missing schoolId

```bash
# Get valid token first
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"123"}' | jq -r '.token')

# Try to access student dashboard WITH TOKEN (should work)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/student/dashboard

# Now test with manually tampered token (removed schoolId)
# Using a JWT token without schoolId should fail with 400
```

---

## 🚨 Known Issues & Fixes

### Issue 1: Syntax Error on Start
**Fix Applied:** Removed duplicate `});` on line 837

### Issue 2: Admin Uses Hardcoded schoolId
**Status:** By design (backward compatible)
**Future:** Store admin records in DB with schoolId

### Issue 3: Existing Data Missing schoolId
**Solution:** Run migration to add schoolId to all documents
```javascript
// Migration example (run once in MongoDB):
db.students.updateMany({ schoolId: { $exists: false } }, 
  { $set: { schoolId: ObjectId("507f1f77bcf86cd799439011") } })
```

---

## ✅ Security Checklist

- [x] JWT tokens include schoolId
- [x] Middleware validates schoolId on protected routes  
- [x] All DB queries filter by schoolId
- [x] Student dashboard only shows own school data
- [x] Teacher dashboard enforces class/section isolation
- [x] Attendance DRAFT/SUBMITTED workflow implemented
- [x] Teacher cannot save marks for other classes (403 error)
- [x] Logout clears tokens on all dashboards
- [x] Login fails if schoolId missing from student/teacher
- [x] Backend logs tenant validation attempts

---

## 🎯 Next Steps

1. **Database Migration** (if you have legacy data)
   - Add schoolId to all existing documents

2. **Multi-Admin Support** (optional)
   - Store admin records in DB instead of env vars
   - Lookup admin schoolId on login

3. **Audit Logging** (recommended for production)
   - Log all tenant access attempts
   - Track data modifications by schoolId

4. **Parent Portal** (future feature)
   - Secure parent access by schoolId
   - Separate login for guardians

---

## 📞 Support

All routes now enforce `requireTenantId` middleware. If you get a 400 error with "Missing schoolId", ensure:
1. Token includes schoolId
2. Database record has schoolId field
3. schoolId format is valid ObjectId

