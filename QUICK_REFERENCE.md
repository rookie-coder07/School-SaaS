# 🔑 Quick Reference Card - Multi-Tenancy Security

## ⚡ For Developers

### New Middleware Pattern
```javascript
router.get('/api/resource', 
  requireAuth,
  requireRole('ROLE'),
  requireTenantId,  // ← NEW: Always add this to protected routes
  async (req, res) => {
    // req.user.schoolIdObj is now available as ObjectId
    const data = await db.collection.find({ schoolId: req.user.schoolIdObj });
  }
);
```

### Database Query Format
```javascript
// ✅ CORRECT - All queries must include schoolId
db.find({ schoolId: req.user.schoolIdObj, identifier: value })

// ❌ WRONG - Missing schoolId filter
db.find({ identifier: value })
db.find({ $or: [{ schoolId: x }, { ... }] })
```

### Login Token Validation
```javascript
// In login endpoint:
const student = db.students.findOne({ email });
if (!student?.schoolId) {
  return res.status(500).json({ error: "Student profile incomplete (missing schoolId)" });
}
const token = jwt.sign({
  userId: student._id.toString(),
  role: 'STUDENT',
  schoolId: student.schoolId.toString(),  // ← Include as string
});
```

### Teacher Class/Section Validation
```javascript
// Before saving marks or attendance:
if (req.user.class !== request.class || req.user.section !== request.section) {
  return res.status(403).json({ error: "You can only enter data for your own class/section" });
}
```

---

## 🧪 Testing Checklist

### Per Route
- [ ] Route has `requireTenantId` middleware
- [ ] All db queries include `schoolId` filter
- [ ] DB query uses `req.user.schoolIdObj` (not string)
- [ ] Teacher routes validate `class` + `section`
- [ ] Student routes exclude `DRAFT` attendance

### Multi-School Test
```bash
# Create 2 test schools
School A: schoolId = 507f1f77bcf86cd799439011
School B: schoolId = 507f1f77bcf86cd799439012

# Create students in each
Student A1 → schoolId = A
Student B1 → schoolId = B

# Login as A1, verify data is A only
# Login as B1, verify data is B only
```

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Right | Why |
|---------|----------|-----|
| `db.find({ userId })` | `db.find({ schoolId, userId })` | Prevents cross-tenant reads |
| `requireAuth, handler` | `requireAuth, requireTenantId, handler` | Missing security gate |
| `$or: [...]` | Single `{ schoolId, field }` | $or bypasses schoolId check |
| String schoolId in DB query | ObjectId schoolId in DB query | Type mismatch causes no matches |

---

## 📝 New Features Summary

| Feature | Who Uses | Behavior |
|---------|----------|----------|
| `requireTenantId` | Middleware | Validates schoolId, converts to ObjectId |
| DRAFT→SUBMITTED | Teachers | Save = DRAFT, Submit = SUBMITTED visibility |
| Class/Section Check | Teachers | Can only modify own class/section (403) |
| Marks Grid | Students | Visual grid display, color-coded scores |
| Attendance Summary | Students | 4-card stats (Total, Present, Absent, %) |

---

## 🔒 Security Rules

1. **Every Query Rule:** All DB queries must include `{ schoolId: ObjectId }`
2. **JWT Rule:** Token must include `schoolId` string value
3. **Teacher Rule:** Can only see/modify own class + own section + own school
4. **Student Rule:** Can only see own schoolId + own studentId + SUBMITTED attendance
5. **Middleware Rule:** All protected routes must chain `requireAuth → requireTenantId`

---

## 🎯 Adding New Routes

```javascript
// Template for new protected route
router.post('/api/new-endpoint', 
  requireAuth,
  requireRole('STUDENT|TEACHER|ADMIN'),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj; // Always use ObjectId version
      
      // Query must include schoolId
      const data = await db.collection.find({ schoolId, ...filters });
      
      // Save must include schoolId
      await db.collection.insertOne({ 
        schoolId,
        ...payload 
      });
      
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
```

---

## 🔍 Verification Checklist Before Deployment

- [ ] All protected routes have `requireTenantId` in middleware chain
- [ ] All DB queries filter by `schoolId`
- [ ] All teacher routes validate `class` + `section`
- [ ] All student attendance queries filter by `submissionStatus: "SUBMITTED"`
- [ ] Login endpoints check `schoolId` exists in user record
- [ ] Frontend stores token in localStorage (not cookie)
- [ ] Logout clears correct token key
- [ ] Database migration script prepared for existing data
- [ ] 2+ schools tested with data isolation confirmed
- [ ] DRAFT→SUBMITTED workflow tested end-to-end

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `/server/server.js` | All endpoints (1389 lines) |
| `/SECURITY_HARDENING_COMPLETE.md` | Detailed change log |
| `/TESTING_GUIDE.md` | Test cases & examples |
| `/DEPLOYMENT_READY.md` | Pre-deployment checklist |

---

**Version:** 1.0 (Production-ready)
**Last Updated:** Today
**Status:** ✅ Ready for multi-school deployment

