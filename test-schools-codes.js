import axios from 'axios';

(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/dev/login', {
      email: 'dev@school.local',
      accessCode: 'supersecretdevkey'
    });
    const token = loginRes.data.token;
    
    const schoolsRes = await axios.get('http://localhost:5000/api/dev/schools', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('\n📚 Schools Data:\n');
    schoolsRes.data.data.forEach(school => {
      console.log(`  • ${school.name}`);
      console.log(`    Code: ${school.code}`);
      console.log(`    Students: ${school.totalStudents}, Teachers: ${school.totalTeachers}`);
      console.log(`    Status: ${school.isEnabled ? '✅ Active' : '❌ Inactive'}`);
      console.log('');
    });
  } catch(err) {
    console.error('Error:', err.message);
  }
})();
