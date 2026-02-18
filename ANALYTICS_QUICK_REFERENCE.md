# Analytics Dashboard - Quick Reference Guide

## 🚀 Quick Start

### Accessing the Analytics Dashboard

1. **Navigate to Admin Dashboard**
2. **Click "Analytics" in the left sidebar**
3. **Choose your view:**
   - 🏫 **Class-wise Analytics** - Class-level performance
   - 👤 **Student-wise Analytics** - Individual student insights

---

## 📊 Class-wise Analytics

### What You See
```
┌─────────────────────────────────────────┐
│  📊 CLASS PERFORMANCE OVERVIEW           │
├─────────────────────────────────────────┤
│  • Avg Grade: 7.8/10                    │
│  • Avg Attendance: 85%                  │
│  • At-Risk Students: 12                 │
│  • Total Students: 145                  │
└─────────────────────────────────────────┘

📈 Grade vs Attendance Trend (Line Chart)
   Shows how grades correlate with attendance

👥 Class Size Distribution (Bar Chart)
   Shows number of students per class

🎓 Class Details Cards
   - Each class with metrics
   - Risk highlights
   - Expandable insights
```

### How to Use
1. **Sort by different metrics:**
   - "Grade" - Highest to lowest performing classes
   - "Attendance" - Best to worst attendance
   - "Risk" - Most to least at-risk students

2. **Expand class cards:**
   - Shows detailed performance narrative
   - Identifies specific risk factors
   - Provides recommendations

3. **Color coding:**
   - 🟢 Grade A (80+) - Green, Excellent
   - 🔵 Grade B (70-79) - Blue, Good
   - 🟡 Grade C (60-69) - Yellow, Fair
   - 🔴 Grade D (<60) - Red, At-Risk

---

## 👤 Student-wise Analytics

### What You See
```
┌─────────────────────────────────────────┐
│  📊 STUDENT PERFORMANCE METRICS          │
├─────────────────────────────────────────┤
│  • Avg Grade: 7.6/10                    │
│  • Avg Attendance: 83%                  │
│  • Avg Engagement: 76%                  │
│  • At-Risk Students: 28                 │
└─────────────────────────────────────────┘

📈 Attendance vs Grade Scatter Plot
   Shows correlation between attendance and performance

💓 Student Pulse Cards
   Individual student intelligence cards
   Tap to expand for detailed mastery profile
```

### How to Search & Filter
1. **Search by name:**
   - Type student name in search box
   - Instant filtering as you type

2. **Filter by performance:**
   - **All** - Show all students
   - **⭐ Excellent** - Show A-grade students
   - **⚠️ At-Risk** - Show struggling students

3. **Click student card:**
   - Expands to show mastery radar
   - AI-powered recommendations
   - Trend indicators

---

## 💓 Student Pulse Card (Expanded)

### Card Layout
```
┌────────────────────────────────────┐
│ 👤 John Doe | Class 10-A | Roll 5  │
│ Grade: A (92%) - Excellent         │
├────────────────────────────────────┤
│ Attendance: 95% | Grade: 92%       │
│ Engagement: 85% | ⬆ Improving     │
├────────────────────────────────────┤
│ 📈 Attendance Trend (7 days)       │
│ [━━━━━━━]                          │
├────────────────────────────────────┤
│ 💬 Performance Narrative:           │
│ "John is an outstanding performer! │
│  Excellent in all areas with       │
│  great consistency."               │
├────────────────────────────────────┤
│ 🎯 Mastery Profile (Click to see) │
│ • Attendance ████████░░ 95%       │
│ • Test Scores ███████░░░ 92%      │
│ • Engagement ██████░░░░ 85%       │
│ • Participation ███████░░░ 75%    │
│ • Homework ████████░░ 90%         │
├────────────────────────────────────┤
│ 💡 Recommendations:                 │
│ • Challenge with advanced topics   │
│ • Consider peer tutoring role      │
│ • Maintain current momentum        │
└────────────────────────────────────┘
```

### Status Badges
- 🎓 **Excellent** - A grade, 80%+ attendance
- 🟡 **Fair** - C grade, 60-79% range
- ⚠️ **At-Risk** - D grade or <60% attendance
- ⬆️ **Improving** - Upward trend in last 3 days
- ⬇️ **Declining** - Downward trend in last 3 days

---

## 🎨 Design Elements

### Colors & Meanings
| Color | Meaning | Usage |
|-------|---------|-------|
| 🔵 Cyan | Positive, Excellent | Attendance, Progress |
| 🟣 Magenta | Secondary, Important | Grades, Highlights |
| 🟢 Green | Success, Good | A grades, On-track |
| 🟡 Yellow | Warning | C grades, Caution |
| 🔴 Red | Danger, Risk | D grades, At-risk |

### Visual Effects
- **Glassmorphism Cards:** Frosted glass appearance with subtle blur
- **Neon Glow:** Cyan/Magenta borders with soft glow effect
- **Smooth Animations:** Cards fade in, expand/collapse smoothly
- **Dark Theme:** Easy on eyes, professional look

---

## 📈 Understanding the Metrics

### Grade Calculation
- Based on recent performance data
- A = 80+, B = 70-79, C = 60-69, D = <60
- Displayed as percentage for precision

### Attendance Percentage
- Days present / Total school days
- Must be 70%+ for good standing
- <70% triggers at-risk flag

### Risk Student Count
- Students with attendance <70% OR grade <60
- Shown per class for easy identification
- Highlighted in red if >20% of class

### Engagement Percentage
- Composite of:
  - Class participation
  - Assignment completion
  - Quiz performance
- Higher is better (75%+ excellent)

---

## 🎯 Common Tasks

### Find At-Risk Students
1. Go to Student-wise Analytics
2. Click "⚠️ At-Risk" filter button
3. View high-risk students at top
4. Click any card to see detailed analysis
5. Check recommendations tab

### Identify Top-Performing Classes
1. Go to Class-wise Analytics
2. Click "Sort by Grade"
3. Top classes appear first
4. Click to expand and see details
5. Use insights for recognition/incentives

### Monitor Attendance Trends
1. Class-wise Analytics shows avg attendance per class
2. Compare with grade performance
3. Low attendance = lower grades (visible in correlation)
4. Address attendance issues first for grade improvement

### Track Individual Student Progress
1. Student-wise Analytics > Search by name
2. View attendance trend sparkline
3. Check mastery radar for strengths/weaknesses
4. Read AI-generated recommendations
5. Use status indicators (improving/declining)

---

## 💡 Key Insights

### What High A-Grade Classes Have in Common
- ✅ 90%+ average attendance
- ✅ Consistent engagement (75%+)
- ✅ <5% at-risk students
- ✅ Upward trending in last week

### What At-Risk Students Struggle With
- ❌ Attendance <70%
- ❌ Recent grade decline
- ❌ Low engagement (<50%)
- ❌ Inconsistent homework completion
- ❌ Low participation

### Quick Fix Strategies
1. **Attendance Issue:** Follow up on absences, encourage regularity
2. **Grade Issue:** Additional tutoring, peer learning
3. **Engagement Issue:** Increase participation opportunities
4. **Homework Issue:** Extend deadline, provide extra support

---

## 🚀 Tips & Tricks

### Speed Navigation
- Use **Search box** for instant student lookup
- Click **Filter buttons** to exclude irrelevant data
- Use **Sort dropdowns** to reorganize quickly

### Deep Dives
- **StudentPulse card** → Click to expand for 360° view
- **Class cards** → Click to reveal performance narrative
- **Charts** → Hover to see exact values
- **Radar chart** → Visual skill profile at glance

### Mobile Usage
- **Scroll horizontally** on charts if needed
- **Tap cards** to expand (same as click)
- **Use portraits** for single-column layout
- **All filters work** on mobile too

---

## ❓ FAQ

**Q: Why is a student showing as "At-Risk" despite high grades?**
A: Likely due to low attendance. Both metrics matter for success.

**Q: How often does data update?**
A: Real-time. Data refreshes when you reload dashboard.

**Q: Can I export this data?**
A: Current version shows data only. Export coming in future updates.

**Q: Why are narratives generic?**
A: AI narratives are templated for security/privacy. Future: personalized insights.

**Q: Can I modify the analytics display?**
A: Not yet. Customization options planned for future releases.

**Q: What if charts don't load?**
A: Refresh page or clear browser cache. Report if persists.

---

## 🔐 Data Privacy Note

- Only aggregated metrics displayed (no personal details)
- Risk indicators are school-wide, not individual
- All data scoped to your school only
- No external data sharing

---

## 📞 Support

For issues or feature requests:
1. Check this guide first
2. Verify data looks reasonable
3. Refresh browser and try again
4. Report bugs with specific details

---

**Happy Analyzing! 📊🎓**
