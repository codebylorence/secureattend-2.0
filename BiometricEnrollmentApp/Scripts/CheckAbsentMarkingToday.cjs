const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the local SQLite database
const dbPath = path.join(process.env.LOCALAPPDATA, 'BiometricEnrollmentApp', 'attendance.db');

console.log('📍 Database path:', dbPath);
console.log('📅 Checking absent marking for today...\n');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to local database\n');
});

// Get today's date in Manila timezone
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD format
console.log(`🗓️  Today's date (Manila): ${today}\n`);

// Check schedules for today
db.all(`
    SELECT 
        employee_id,
        shift_name,
        shift_start,
        shift_end,
        schedule_dates,
        days
    FROM employee_schedules
    WHERE schedule_dates LIKE '%${today}%'
    ORDER BY employee_id
`, [], (err, schedules) => {
    if (err) {
        console.error('❌ Error fetching schedules:', err.message);
        db.close();
        return;
    }

    console.log(`📋 Found ${schedules.length} schedule(s) for today:\n`);
    
    if (schedules.length === 0) {
        console.log('⚠️  No schedules found for today!');
        console.log('   This might be why absent marking is not working.\n');
    } else {
        schedules.forEach((schedule, index) => {
            console.log(`${index + 1}. Employee: ${schedule.employee_id}`);
            console.log(`   Shift: ${schedule.shift_name}`);
            console.log(`   Time: ${schedule.shift_start} - ${schedule.shift_end}`);
            console.log(`   Schedule Dates: ${schedule.schedule_dates}`);
            console.log(`   Days: ${schedule.days}\n`);
        });
    }

    // Check attendance sessions for today
    db.all(`
        SELECT 
            id,
            employee_id,
            date,
            clock_in,
            clock_out,
            status,
            total_hours
        FROM attendance_sessions
        WHERE date = ?
        ORDER BY employee_id, clock_in
    `, [today], (err, sessions) => {
        if (err) {
            console.error('❌ Error fetching sessions:', err.message);
            db.close();
            return;
        }

        console.log(`\n📊 Found ${sessions.length} attendance session(s) for today:\n`);
        
        if (sessions.length === 0) {
            console.log('⚠️  No attendance sessions found for today!');
        } else {
            sessions.forEach((session, index) => {
                console.log(`${index + 1}. Employee: ${session.employee_id}`);
                console.log(`   Status: ${session.status}`);
                console.log(`   Clock In: ${session.clock_in || 'N/A'}`);
                console.log(`   Clock Out: ${session.clock_out || 'N/A'}`);
                console.log(`   Hours: ${session.total_hours || 'N/A'}\n`);
            });
        }

        // Check for absent employees (scheduled but no session)
        const scheduledEmployees = schedules.map(s => s.employee_id);
        const attendedEmployees = sessions.map(s => s.employee_id);
        const absentEmployees = scheduledEmployees.filter(empId => !attendedEmployees.includes(empId));

        console.log(`\n🔍 Analysis:`);
        console.log(`   Scheduled employees: ${scheduledEmployees.length}`);
        console.log(`   Attended employees: ${attendedEmployees.length}`);
        console.log(`   Absent employees: ${absentEmployees.length}\n`);

        if (absentEmployees.length > 0) {
            console.log(`❌ Employees marked as absent (should have sessions):`);
            absentEmployees.forEach(empId => {
                const schedule = schedules.find(s => s.employee_id === empId);
                console.log(`   - ${empId} (${schedule.shift_name}: ${schedule.shift_start})`);
            });
            console.log('\n⚠️  These employees should have "Absent" status sessions created!');
        } else {
            console.log(`✅ All scheduled employees have attendance sessions.`);
        }

        // Check current time vs shift start times
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { 
            timeZone: 'Asia/Manila', 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        
        console.log(`\n⏰ Current time (Manila): ${currentTime}`);
        console.log(`\n📌 Shift Status Check:`);
        
        schedules.forEach(schedule => {
            const shiftStart = schedule.shift_start;
            const isPastShiftStart = currentTime > shiftStart;
            const hasSession = sessions.some(s => s.employee_id === schedule.employee_id);
            
            console.log(`   ${schedule.employee_id} - ${schedule.shift_name} (${shiftStart}):`);
            console.log(`      Past shift start: ${isPastShiftStart ? 'YES' : 'NO'}`);
            console.log(`      Has session: ${hasSession ? 'YES' : 'NO'}`);
            console.log(`      Should be marked absent: ${isPastShiftStart && !hasSession ? 'YES ❌' : 'NO ✅'}`);
        });

        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('\n✅ Database connection closed');
            }
        });
    });
});
