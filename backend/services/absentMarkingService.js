import Attendance from '../models/attendance.js';
import Employee from '../models/employee.js';
import ScheduleTemplate from '../models/scheduleTemplate.js';
import { Op } from 'sequelize';

/**
 * Backend service for automatically marking employees as absent and handling missed clock-outs
 * This runs independently of the biometric app and handles two scenarios:
 * 1. Employees who didn't clock in at all (marked as Absent)
 * 2. Employees who clocked in but forgot to clock out (marked as Missed Clock-out)
 */
class AbsentMarkingService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
    }

    /**
     * Start the absent marking and missed clock-out service
     * Runs every 5 minutes to check for absent employees and missed clock-outs
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Absent marking and missed clock-out service is already running');
            return;
        }

        console.log('🔄 Starting absent marking and missed clock-out service...');
        this.isRunning = true;

        // Run immediately on start
        this.markAbsentEmployees();

        // Then run every 5 minutes
        this.intervalId = setInterval(() => {
            this.markAbsentEmployees();
        }, 5 * 60 * 1000); // 5 minutes

        console.log('✅ Absent marking and missed clock-out service started (runs every 5 minutes)');
    }

    /**
     * Stop the absent marking and missed clock-out service
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Absent marking and missed clock-out service is not running');
            return;
        }

        console.log('⏹️ Stopping absent marking and missed clock-out service...');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        console.log('✅ Absent marking and missed clock-out service stopped');
    }

    /**
     * Get current date in Philippines timezone (YYYY-MM-DD format)
     */
    getCurrentDateInTimezone() {
        const now = new Date();
        const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        
        const year = philippinesTime.getFullYear();
        const month = String(philippinesTime.getMonth() + 1).padStart(2, '0');
        const day = String(philippinesTime.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Get current time in Philippines timezone
     */
    getCurrentTimeInTimezone() {
        const now = new Date();
        return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    }

    /**
     * Check if a shift has started
     */
    hasShiftStarted(startTime) {
        try {
            const now = this.getCurrentTimeInTimezone();
            const [hours, minutes] = startTime.split(':').map(Number);
            
            const shiftStart = new Date(now);
            shiftStart.setHours(hours, minutes, 0, 0);
            
            // For overnight shifts, if current time is early morning and shift start is evening,
            // the shift started yesterday
            if (now.getHours() < 6 && hours >= 18) {
                shiftStart.setDate(shiftStart.getDate() - 1);
            }
            
            return now >= shiftStart;
        } catch (error) {
            console.error(`❌ Error checking shift start time ${startTime}:`, error.message);
            return false;
        }
    }

    /**
     * Check if a shift has ended (with grace period)
     */
    hasShiftEnded(endTime, gracePeriodMinutes = 60) {
        try {
            const now = this.getCurrentTimeInTimezone();
            const [hours, minutes] = endTime.split(':').map(Number);
            
            let shiftEnd = new Date(now);
            shiftEnd.setHours(hours, minutes, 0, 0);
            
            // For overnight shifts, if end time is early morning, it ends today
            // If current time is evening and end time is early morning, shift ends tomorrow
            if (hours < 6 && now.getHours() >= 18) {
                shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
            
            // Add grace period
            const shiftEndWithGrace = new Date(shiftEnd.getTime() + (gracePeriodMinutes * 60 * 1000));
            
            return now >= shiftEndWithGrace;
        } catch (error) {
            console.error(`❌ Error checking shift end time ${endTime}:`, error.message);
            return false;
        }
    }

    /**
     * Check if current day matches schedule days
     */
    isScheduledForToday(days, specificDate) {
        const now = this.getCurrentTimeInTimezone();
        const today = now.toLocaleDateString('en-US', { weekday: 'long' });
        const todayDate = this.getCurrentDateInTimezone();

        // Check specific date first
        if (specificDate) {
            return specificDate === todayDate;
        }

        // Check if today is in the days array
        if (Array.isArray(days)) {
            return days.includes(today);
        }

        return false;
    }

    /**
     * Main method to mark absent employees and handle missed clock-outs
     */
    async markAbsentEmployees() {
        try {
            const now = this.getCurrentTimeInTimezone();
            const today = this.getCurrentDateInTimezone();
            
            console.log('🔍 ========== BACKEND ABSENT MARKING & MISSED CLOCK-OUT CHECK ==========');
            console.log(`🔍 Current time: ${now.toISOString()} (Philippines time)`);
            console.log(`📅 Date: ${today}`);

            // Get all active schedule templates with assigned employees
            const scheduleTemplates = await ScheduleTemplate.findAll({
                where: { 
                    status: 'Active',
                    assigned_employees: { [Op.ne]: null }
                }
            });

            console.log(`📋 Found ${scheduleTemplates.length} active schedule templates`);

            let totalScheduledToday = 0;
            let markedAbsent = 0;
            let markedMissedClockOut = 0;

            for (const template of scheduleTemplates) {
                try {
                    // Parse assigned employees
                    let assignedEmployees = [];
                    try {
                        assignedEmployees = template.assigned_employees ? JSON.parse(template.assigned_employees) : [];
                    } catch (e) {
                        console.warn(`⚠️ Failed to parse assigned_employees for template ${template.id}`);
                        continue;
                    }

                    // Check if this template is scheduled for today
                    if (!this.isScheduledForToday(template.days, template.specific_date)) {
                        continue;
                    }

                    console.log(`📅 Template "${template.shift_name}" is scheduled for today`);

                    for (const empAssignment of assignedEmployees) {
                        totalScheduledToday++;
                        const employeeId = empAssignment.employee_id;

                        console.log(`  👤 Checking employee ${employeeId}...`);

                        // Check if employee exists and is active
                        const employee = await Employee.findOne({
                            where: { 
                                employee_id: employeeId, 
                                status: 'Active' 
                            }
                        });

                        if (!employee) {
                            console.log(`    ⚠️ Employee ${employeeId} not found or inactive`);
                            continue;
                        }

                        // Check if shift has started
                        if (!this.hasShiftStarted(template.start_time)) {
                            console.log(`    ⏰ Shift hasn't started yet (${template.start_time})`);
                            continue;
                        }

                        // Check if employee already has attendance record for today
                        const existingAttendance = await Attendance.findOne({
                            where: {
                                employee_id: employeeId,
                                date: today
                            }
                        });

                        // Check if we should mark absent or missed clock-out (shift has ended with grace period)
                        const shouldProcessShiftEnd = this.hasShiftEnded(template.end_time, 60); // 60 minute grace period

                        if (!existingAttendance) {
                            // No attendance record at all - mark as absent if shift has ended
                            if (shouldProcessShiftEnd) {
                                await Attendance.create({
                                    employee_id: employeeId,
                                    date: today,
                                    clock_in: null,
                                    clock_out: null,
                                    total_hours: 0,
                                    status: 'Absent',
                                    overtime_hours: 0
                                });

                                markedAbsent++;
                                console.log(`    ❌ Marked as Absent (shift: ${template.start_time}-${template.end_time})`);
                            } else {
                                console.log(`    ⏳ Shift still active, not marking absent yet`);
                            }
                        } else {
                            // Has attendance record - check for missed clock-out
                            if (existingAttendance.status === 'Absent') {
                                console.log(`    ℹ️ Already marked as absent`);
                            } else if (existingAttendance.status === 'Missed Clock-out') {
                                console.log(`    ℹ️ Already marked as missed clock-out`);
                            } else if (existingAttendance.clock_in && !existingAttendance.clock_out && shouldProcessShiftEnd) {
                                // Employee clocked in but didn't clock out, and shift has ended
                                await existingAttendance.update({
                                    status: 'Missed Clock-out',
                                    total_hours: this.calculateHoursWorked(existingAttendance.clock_in, template.end_time)
                                });

                                markedMissedClockOut++;
                                console.log(`    🕐 Marked as Missed Clock-out (clocked in at ${existingAttendance.clock_in.toLocaleTimeString()}, shift ended at ${template.end_time})`);
                            } else if (existingAttendance.clock_out) {
                                console.log(`    ✅ Has complete attendance record (${existingAttendance.status})`);
                            } else {
                                console.log(`    ⏳ Clocked in but shift still active, waiting for clock-out or shift end`);
                            }
                        }
                    }
                } catch (templateError) {
                    console.error(`❌ Error processing template ${template.id}:`, templateError.message);
                }
            }

            console.log(`📊 Attendance processing summary:`);
            console.log(`   Total scheduled today: ${totalScheduledToday}`);
            console.log(`   Newly marked absent: ${markedAbsent}`);
            console.log(`   Newly marked missed clock-out: ${markedMissedClockOut}`);
            console.log('🔍 ========== END BACKEND ABSENT MARKING & MISSED CLOCK-OUT CHECK ==========');

            return { markedAbsent, markedMissedClockOut };

        } catch (error) {
            console.error('💥 Error in backend absent marking:', error.message);
            console.error('💥 Stack trace:', error.stack);
            return { markedAbsent: 0, markedMissedClockOut: 0 };
        }
    }

    /**
     * Calculate hours worked from clock-in time to shift end time
     */
    calculateHoursWorked(clockInTime, shiftEndTime) {
        try {
            const clockIn = new Date(clockInTime);
            const now = this.getCurrentTimeInTimezone();
            const [hours, minutes] = shiftEndTime.split(':').map(Number);
            
            let shiftEnd = new Date(now);
            shiftEnd.setHours(hours, minutes, 0, 0);
            
            // For overnight shifts, if end time is early morning, it ends today
            // If current time is evening and end time is early morning, shift ends tomorrow
            if (hours < 6 && now.getHours() >= 18) {
                shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
            
            // Calculate hours worked (from clock-in to shift end)
            const hoursWorked = (shiftEnd.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
            
            // Return positive hours, minimum 0
            return Math.max(0, Math.round(hoursWorked * 100) / 100);
        } catch (error) {
            console.error(`❌ Error calculating hours worked:`, error.message);
            return 0;
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            intervalId: this.intervalId !== null
        };
    }
}

// Create singleton instance
const absentMarkingService = new AbsentMarkingService();

export default absentMarkingService;