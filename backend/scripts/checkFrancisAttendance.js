import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function checkFrancisAttendance() {
  try {
    console.log('🔍 Checking Francis attendance records...');
    
    // Check recent attendance records for Francis
    const attendances = await sequelize.query(
      `SELECT * FROM Attendances 
       WHERE employee_id LIKE '%francis%' OR employee_id LIKE '%Francis%' 
       ORDER BY date DESC LIMIT 10`,
      { type: QueryTypes.SELECT }
    );
    
    console.log('📊 Recent attendance records for Francis:');
    console.log(JSON.stringify(attendances, null, 2));
    
    // Check if Francis exists in Employee table
    const employee = await sequelize.query(
      `SELECT employee_id, fullname, firstname, lastname, status 
       FROM Employees 
       WHERE employee_id LIKE '%francis%' OR fullname LIKE '%Francis%' OR firstname LIKE '%Francis%'`,
      { type: QueryTypes.SELECT }
    );
    
    console.log('👤 Francis employee record:');
    console.log(JSON.stringify(employee, null, 2));
    
    // Check for any incomplete sessions (clock_in without clock_out)
    const incompleteSessions = await sequelize.query(
      `SELECT * FROM Attendances 
       WHERE (employee_id LIKE '%francis%' OR employee_id LIKE '%Francis%') 
       AND clock_in IS NOT NULL AND clock_out IS NULL 
       ORDER BY date DESC`,
      { type: QueryTypes.SELECT }
    );
    
    console.log('⏰ Incomplete sessions for Francis:');
    console.log(JSON.stringify(incompleteSessions, null, 2));
    
    // Check today's date in configured timezone
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's date: ${today}`);
    
    // Check if Francis has any attendance for today
    const todayAttendance = await sequelize.query(
      `SELECT * FROM Attendances 
       WHERE (employee_id LIKE '%francis%' OR employee_id LIKE '%Francis%') 
       AND date = '${today}'`,
      { type: QueryTypes.SELECT }
    );
    
    console.log('📅 Today\'s attendance for Francis:');
    console.log(JSON.stringify(todayAttendance, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFrancisAttendance();