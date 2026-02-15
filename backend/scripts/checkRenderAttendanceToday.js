import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Employee from '../models/employee.js';
import Attendance from '../models/attendance.js';

async function checkRenderData() {
  try {
    console.log('🔍 Checking Render database for today\'s attendance...\n');
    
    const today = '2026-02-15';
    
    // Get all attendance records for today
    const todayAttendances = await Attendance.findAll({
      where: {
        date: today
      },
      order: [['clock_in', 'ASC']]
    });
    
    console.log(`📅 Date: ${today}`);
    console.log(`📊 Total attendance records: ${todayAttendances.length}\n`);
    
    if (todayAttendances.length === 0) {
      console.log('❌ NO ATTENDANCE RECORDS FOR TODAY!');
      console.log('This is why overtime assignment is not working.\n');
      
      // Check what dates DO have attendance
      const recentAttendances = await Attendance.findAll({
        attributes: ['date'],
        group: ['date'],
        order: [['date', 'DESC']],
        limit: 10
      });
      
      console.log('📅 Recent dates with attendance records:');
      recentAttendances.forEach(a => {
        console.log(`   - ${a.date}`);
      });
      
      return;
    }
    
    console.log('📋 All attendance records for today:\n');
    
    for (const att of todayAttendances) {
      const employee = await Employee.findOne({
        where: { employee_id: att.employee_id }
      });
      
      const name = employee ? `${employee.firstname} ${employee.lastname}` : 'Unknown';
      
      console.log(`👤 ${att.employee_id} - ${name}`);
      console.log(`   Status: ${att.status}`);
      console.log(`   Clock In: ${att.clock_in || 'N/A'}`);
      console.log(`   Clock Out: ${att.clock_out || 'Not yet'}`);
      console.log('');
    }
    
    // Check specifically for Present/Late status
    const eligibleStatuses = todayAttendances.filter(a => 
      ['Present', 'Late'].includes(a.status) && a.clock_in
    );
    
    console.log(`\n✅ Employees with Present/Late status (eligible for overtime): ${eligibleStatuses.length}`);
    eligibleStatuses.forEach(a => {
      console.log(`   - ${a.employee_id}: ${a.status}`);
    });
    
    // Check for Clarenz specifically
    const clarenz = todayAttendances.find(a => a.employee_id === 'TSI00061');
    console.log(`\n🎯 Clarenz (TSI00061): ${clarenz ? `✅ Found - Status: ${clarenz.status}` : '❌ NOT FOUND'}`);
    
    // Check for overtime records
    const overtimeRecords = todayAttendances.filter(a => a.status === 'Overtime');
    console.log(`\n⏰ Overtime records: ${overtimeRecords.length}`);
    if (overtimeRecords.length > 0) {
      overtimeRecords.forEach(a => {
        console.log(`   - ${a.employee_id}: Overtime`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

checkRenderData();
