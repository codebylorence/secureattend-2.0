/**
 * Seed script: realistic schedule + attendance data Jan–May 2026
 * for all active employees on Render.
 * Run: node scripts/seedPresentationData.js  (with DATABASE_URL set)
 */

import dotenv from "dotenv";
import { Sequelize } from "sequelize";
dotenv.config();

const sq = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

await sq.authenticate();
console.log("✅ Connected to Render database\n");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateRange(start, end) {
  const dates = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function addMinutes(dateStr, timeStr, offsetMinutes = 0) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(h, m + offsetMinutes, 0, 0);
  return d.toISOString();
}

function nextDayStr(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Philippine public holidays Jan–May 2026
const HOLIDAYS = new Set([
  "2026-01-01",
  "2026-01-25",
  "2026-02-25",
  "2026-04-02",
  "2026-04-03",
  "2026-04-04",
  "2026-04-09",
  "2026-05-01",
]);

// ─── Shifts ───────────────────────────────────────────────────────────────────
const SHIFTS = {
  morning:   { name: "Morning Shift",   start: "06:00", end: "14:00" },
  afternoon: { name: "Afternoon Shift", start: "14:00", end: "22:00" },
  night:     { name: "Night Shift",     start: "22:00", end: "06:00" },
};

const ZONE_SHIFT = {
  "Zone A":       SHIFTS.morning,
  "Zone B":       SHIFTS.afternoon,
  "Zone C":       SHIFTS.morning,
  "Zone D":       SHIFTS.afternoon,
  "Zone E":       SHIFTS.night,
  "Company-wide": SHIFTS.morning,
  "No Department":SHIFTS.morning,
};

// ─── Employees ────────────────────────────────────────────────────────────────
const [empRows] = await sq.query(
  `SELECT employee_id, firstname, lastname, department FROM "Employees" WHERE status = 'Active' ORDER BY employee_id`
);
console.log(`👥 ${empRows.length} active employees found\n`);

// ─── Working dates ────────────────────────────────────────────────────────────
const ALL_DATES = dateRange("2026-01-01", "2026-05-05");
const workingDates = ALL_DATES.filter((d) => {
  const dow = new Date(d + "T00:00:00Z").getUTCDay(); // 0=Sun
  return dow !== 0 && !HOLIDAYS.has(d);
});
console.log(`📅 ${workingDates.length} working days (Mon–Sat, excl. holidays)\n`);

// ─── Clear existing data ──────────────────────────────────────────────────────
await sq.query(`TRUNCATE TABLE "schedule_templates" RESTART IDENTITY CASCADE`);
await sq.query(`TRUNCATE TABLE "employee_schedules" RESTART IDENTITY CASCADE`);
await sq.query(`TRUNCATE TABLE "Attendances" RESTART IDENTITY CASCADE`);
console.log("🗑️  Cleared existing data\n");

// ─── schedule_templates — one per zone ───────────────────────────────────────
const zoneGroups = {};
for (const emp of empRows) {
  const zone = emp.department || "Company-wide";
  if (!zoneGroups[zone]) zoneGroups[zone] = [];
  zoneGroups[zone].push(emp.employee_id);
}

const templateIdMap = {};
const now = new Date().toISOString();

for (const [zone, empIds] of Object.entries(zoneGroups)) {
  const shift = ZONE_SHIFT[zone] || SHIFTS.morning;

  const [rows] = await sq.query(
    `INSERT INTO schedule_templates
       (department, shift_name, start_time, end_time, days, specific_date,
        assigned_employees, status, created_by, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,NULL,$6,'Active','admin',$7,$7)
     RETURNING id`,
    {
      bind: [
        zone,
        shift.name,
        shift.start,
        shift.end,
        JSON.stringify(workingDates),   // days column = working date list
        JSON.stringify(empIds),
        now,
      ],
    }
  );
  templateIdMap[zone] = rows[0].id;
  console.log(`📋 Template: ${zone} → ${shift.name} (id=${rows[0].id}, ${empIds.length} employees)`);
}

// ─── employee_schedules — one row per employee ────────────────────────────────
let schedCount = 0;
for (const emp of empRows) {
  const zone = emp.department || "Company-wide";
  const templateId = templateIdMap[zone];

  await sq.query(
    `INSERT INTO employee_schedules
       (employee_id, template_id, days, schedule_dates,
        start_date, end_date, assigned_by, status, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,'admin','Active',$7,$7)`,
    {
      bind: [
        emp.employee_id,
        templateId,
        JSON.stringify(workingDates),
        JSON.stringify(workingDates),
        "2026-01-01",
        "2026-05-05",
        now,
      ],
    }
  );
  schedCount++;
}
console.log(`\n✅ ${schedCount} employee_schedules rows inserted\n`);

// ─── Attendance records ───────────────────────────────────────────────────────
// Distribution: Present 82%, Late 8%, Absent 4%, Overtime 4%, Missed Clock-out 2%
const attendanceRows = [];

for (const emp of empRows) {
  const zone = emp.department || "Company-wide";
  const shift = ZONE_SHIFT[zone] || SHIFTS.morning;
  const isOvernight = shift.end < shift.start; // e.g. 22:00–06:00

  for (const dateStr of workingDates) {
    const roll = Math.random() * 100;

    // ── ABSENT ──
    if (roll < 4) {
      attendanceRows.push([
        emp.employee_id, dateStr, null, null, 0, "Absent", 0, false, false, now, now,
      ]);
      continue;
    }

    // ── LATE ──
    if (roll < 12) {
      const lateMin = Math.floor(Math.random() * 40) + 6;
      const clockIn = addMinutes(dateStr, shift.start, lateMin);
      const outDate = isOvernight ? nextDayStr(dateStr) : dateStr;
      const earlyOut = Math.floor(Math.random() * 20) - 10;
      const clockOut = addMinutes(outDate, shift.end, earlyOut);
      const hours = Math.max(0, Math.round(((new Date(clockOut) - new Date(clockIn)) / 3600000) * 100) / 100);
      attendanceRows.push([
        emp.employee_id, dateStr, clockIn, clockOut, hours, "Late", 0, false, false, now, now,
      ]);
      continue;
    }

    // ── MISSED CLOCK-OUT ──
    if (roll < 14) {
      const earlyIn = Math.floor(Math.random() * 5);
      const clockIn = addMinutes(dateStr, shift.start, earlyIn);
      attendanceRows.push([
        emp.employee_id, dateStr, clockIn, null, 0, "Missed Clock-out", 0, false, false, now, now,
      ]);
      continue;
    }

    // ── OVERTIME ──
    if (roll < 18) {
      const earlyIn = Math.floor(Math.random() * 5);
      const clockIn = addMinutes(dateStr, shift.start, earlyIn);
      const outDate = isOvernight ? nextDayStr(dateStr) : dateStr;
      const otMin = Math.floor(Math.random() * 60) + 30;
      const clockOut = addMinutes(outDate, shift.end, otMin);
      const hours = Math.round(((new Date(clockOut) - new Date(clockIn)) / 3600000) * 100) / 100;
      const otHours = Math.round((otMin / 60) * 100) / 100;
      attendanceRows.push([
        emp.employee_id, dateStr, clockIn, clockOut, hours, "Overtime", otHours, false, false, now, now,
      ]);
      continue;
    }

    // ── PRESENT ──
    const earlyIn = Math.floor(Math.random() * 5);
    const clockIn = addMinutes(dateStr, shift.start, earlyIn);
    const outDate = isOvernight ? nextDayStr(dateStr) : dateStr;
    const earlyOut = Math.floor(Math.random() * 10) - 5;
    const clockOut = addMinutes(outDate, shift.end, earlyOut);
    const hours = Math.max(0, Math.round(((new Date(clockOut) - new Date(clockIn)) / 3600000) * 100) / 100);
    attendanceRows.push([
      emp.employee_id, dateStr, clockIn, clockOut, hours, "Present", 0, false, false, now, now,
    ]);
  }
}

console.log(`📊 ${attendanceRows.length} attendance records — inserting in batches...`);

// Batch insert 300 rows at a time
const BATCH = 300;
let inserted = 0;

for (let i = 0; i < attendanceRows.length; i += BATCH) {
  const batch = attendanceRows.slice(i, i + BATCH);
  const cols = 11;
  const placeholders = batch
    .map((_, ri) => `(${Array.from({ length: cols }, (_, ci) => `$${ri * cols + ci + 1}`).join(",")})`)
    .join(",");

  await sq.query(
    `INSERT INTO "Attendances"
       (employee_id, date, clock_in, clock_out, total_hours, status,
        overtime_hours, is_archived, is_permanently_deleted, "createdAt", "updatedAt")
     VALUES ${placeholders}`,
    { bind: batch.flat() }
  );

  inserted += batch.length;
  process.stdout.write(`\r  ${inserted}/${attendanceRows.length}`);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n");
const counts = attendanceRows.reduce((a, r) => { a[r[5]] = (a[r[5]] || 0) + 1; return a; }, {});
console.log("✅ Done!\n");
console.log("Status breakdown:");
for (const [s, c] of Object.entries(counts))
  console.log(`  ${s.padEnd(22)} ${c.toLocaleString()}`);

await sq.close();
