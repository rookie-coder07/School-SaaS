# Multi-Tenancy Audit & Fix Log

## ✅ CURRENT STATE (What's Working)

1. **JWT Tokens**: Both TEACHER and STUDENT include schoolId (as string)
2. **Admin Token**: Uses `process.env.SCHOOL_ID` (PROBLEMATIC - should use actual schoolId from request)
3. **safeObjectId Helper**: Already defined and working
4. **Core Routes**: Most student/teacher routes have schoolId filtering in place

## ❌ ISSUES FOUND

### 1. **Admin Login Uses process.env.SCHOOL_ID**
   - **Problem**: Hardcodes single schoolId; doesn't work for multi-school
   - **Fix**: Need admin per-school records in DB; lookup admin schoolId from DB

### 2. **Missing schoolId in Collections**
   - Need audit to verify these have schoolId:
     - [ ] users
     - [ ] students
     - [ ] teachers
     - [ ] subjects
     - [ ] marks
     - [ ] attendance
     - [ ] homework
     - [ ] events

### 3. **Attendance DRAFT/SUBMITTED Workflow**
   - **Status**: Not implemented
   - **Need**: 
     - Save as DRAFT by teacher
     - Only SUBMITTED records visible to students
     - Submission endpoint needed

### 4. **Teacher Dashboard Data Isolation**
   - Need to verify: Teachers only see students from:
     - Same schoolId ✓
     - Same class ✓
     - Same section ✓

### 5. **Student Dashboard Queries**
   - `/api/student/marks` - Need to verify only shows student's own marks
   - `/api/student/attendance` - Need to verify only shows SUBMITTED records

### 6. **Logout Feature**
   - [ ] Admin Dashboard - No logout button
   - [ ] Teacher Dashboard - No logout button
   - [ ] Student Dashboard - Already has logout

### 7. **Middleware Validation**
   - Need: Enforce schoolId exists on ALL protected routes
   - Current: Some routes check, some don't

## 📋 FIX PLAN

1. ✅ **Audit Complete Collections** - Map all collections and schoolId presence
2. **Add Tenant Enforcement Middleware** - Check schoolId on every protected route
3. **Fix Admin Login** - Proper per-school admin records
4. **Implement DRAFT/SUBMITTED Workflow** - Attendance submission logic
5. **Add Logout to All Dashboards** - Clear tokens and redirect
6. **Fix Remaining Queries** - Ensure ALL DB queries filter by schoolId
7. **Test Multi-School Isolation** - Verify no cross-school data leaks

## CODE CHANGES NEEDED

### Backend (server.js)
- [ ] Add `requireSchoolId` middleware
- [ ] Fix admin login to use DB-stored schoolId
- [ ] Add attendance submission endpoint
- [ ] Ensure all routes validate schoolId

### Frontend
- [ ] Add logout to Admin/Teacher dashboards
- [ ] Update state management to clear tokens

