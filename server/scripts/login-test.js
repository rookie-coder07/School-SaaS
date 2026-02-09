'use strict';

'use strict';

async function test() {
  try {
    const tRes = await fetch('http://localhost:5000/api/auth/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo2_teacher@example.com', password: 'teacher123' }),
    });
    const tJson = await tRes.json();
    console.log('TEACHER:', tRes.status, JSON.stringify(tJson, null, 2));

    const token = tJson.token;
    if (token) {
      const sRes = await fetch('http://localhost:5000/api/teacher/students', { headers: { Authorization: `Bearer ${token}` } });
      const sJson = await sRes.json();
      console.log('TEACHER STUDENTS:', sRes.status, JSON.stringify(sJson, null, 2));
    }

    const stRes = await fetch('http://localhost:5000/api/auth/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo2_student1@example.com', password: 'student123' }),
    });
    const stJson = await stRes.json();
    console.log('STUDENT:', stRes.status, JSON.stringify(stJson, null, 2));

  } catch (e) {
    console.error('ERR', e);
    process.exitCode = 1;
  }
}

test();
