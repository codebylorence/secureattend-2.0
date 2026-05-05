/**
 * Seed script v3: presentation data Jan–May 2026
 * - One schedule_template row per date per zone (specific_date set)
 * - assigned_employees as [{employee_id, assigned_date, assigned_by}]
 * - Attendance times match Opening/Closing/Graveyard shifts
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
console.log("✅ Connected\n");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateRange(start, end) {
  const dates = [];
  const cur = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function addMinutes(dateStr, timeStr, offsetMin = 0) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(h, m + offsetMin, 0, 0);
  return d.toISOString();
}

function nextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// PH holidays Jan–May 2026
const HOLIDAYS = new Set([
  "2026-01-01","2026-01-25","2026-02-25",
  "2026-04-02","2026-04-03","2026-04-04","2026-04-09","2026-05-01",
]);

// Shifts matching the 3 shift_templates already in DB
const SHIFTS = {
  Opening:   { start: "08:00", end: "16:00", overnight: false },
  Closing:   { start: "16:00", end: "00:00", overnight: true  },
  Graveyard: { start: "00:00", end: "08:00", overnight: false },
};

const ZONE_SHIFT = {
  "Zone A":        "Opening",
  "Zone B":        "Closing",
  "Zone C":        "Opening",
  "Zone D":        "Closing",
  "Zone E":        "Graveyard",
  "Company-wide":  "Opening",
  "No Department": "Opening",
};

// ─── Employees ────────────────────────────────────────────────────────────────
const [empRows] = await sq.query(
  `SELECT employee_id, department FROM "Employees" WHERE status = 'Active' ORDER BY employee_id`
);
console.log(`👥 ${empRows.length} active employees\n`);

// Group by zone
const zoneGroups = {};
for (const emp of empRows) {
  const zone = emp.department || "Company-wide";
  if (!zoneGroups[zone]) zoneGroups[zone] = [];
  zoneGroups[zone].push(emp.employee_id);
}

// Working dates Mon–Sat, skip holidays
const ALL_DATES = dateRange("2026-01-01", "2026-05-05");
const workingDates = ALL_DATES.filter(d => {
  const dow = new Date(d + "T00:00:00Z").getUTCDay();
  return dow !== 0 && !HOLIDAYS.has(d);
});
console.log(`📅 ${workingDates.length} working days\n`);

// ─── Clear ────────────────────────────────────────────────────────────────────
await sq.query(`TRUNCATE TABLE schedule_templates RESTART IDENTITY CASCADE`);
await sq.query(`TRUNCATE TABLE employee_schedules RESTART IDENTITY CASCADE`);
await sq.query(`TRUNCATE TABLE "Attendances" RESTART IDENTITY CASCADE`);
console.log("🗑️  Cleared existing data\n");

// ─── Insert schedule_templates: one row per date per zone ─────────────────────
const now = new Date().toISOString();
let templateCount = 0;

console.log("📋 Inserting schedule templates (1 per date per zone)...");

for (const [zone, empIds] of Object.entries(zoneGroups)) {
  const shiftName = ZONE_SHIFT[zone] || "Opening";
  const shift = SHIFTS[shiftName];

  // Build assigned_employees array in the correct format
  const assignedEmployees = empIds.map(eid => ({
    employee_id: eid,
    assigned_date: "2026-01-01",
    assigned_by: "admin",
  }));

  for (const dateStr of workingDates) {
    await sq.query(
      `INSERT INTO schedule_templates
         (department, shift_name, start_time, end_time,
          specific_date, days, assigned_employees,
          status, created_by, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Active','admin',$8,$8)`,
      {
        bind: [
          zone,
          shiftName,
          shift.start,
          shift.end,
          dateStr,
          JSON.stringify([]),          // days deprecated, empty
          JSON.stringify(assignedEmployees),
          now,
        ],
      }
    );
    templateCount++;
  }
  process.stdout.write(`\r  ${zone}: ${workingDates.length} templates inserted (total ${templateCount})`);
}
console.log(`\n✅ ${templateCount} schedule_template rows inserted\n`);

// ─── Attendance records ───────────────────────────────────────────────────────
console.log("📊 Generating attendance records...");
const attendanceRows = [];

for (const emp of empRows) {
  const zone = emp.department || "Company-wide";
  const shiftName = ZONE_SHIFT[zone] || "Opening";
  const shift = SHIFTS[shiftName];

  for (const dateStr of workingDates) {
    const roll = Math.random() * 100;

    if (roll < 4) {
      // Absent
      attendanceRows.push([emp.employee_id, dateStr, null, null, 0, "Absent", 0, false, false, now, now]);
      continue;
    }

    const outDateStr = shift.overnight ? nextDay(dateStr) : dateStr;

    if (roll < 12) {
      // Late
      const lateMin = Math.floor(Math.random() * 40) + 6;
      const ci = addMinutes(dateStr, shift.start, lateMin);
      const co = addMinutes(outDateStr, shift.end, Math.floor(Math.random() * 20) - 10);
      const hrs = Math.max(0, Math.round(((new Date(co) - new Date(ci)) / 3600000) * 100) / 100);
      attendanceRows.push([emp.employee_id, dateStr, ci, co, hrs, "Late", 0, false, false, now, now]);
      continue;
    }

    if (roll < 14) {
      // Missed Clock-out
      const ci = addMinutes(dateStr, shift.start, Math.floor(Math.random() * 5));
      attendanceRows.push([emp.employee_id, dateStr, ci, null, 0, "Missed Clock-out", 0, false, false, now, now]);
      continue;
    }

    if (roll < 18) {
      // Overtime
      const ci = addMinutes(dateStr, shift.start, Math.floor(Math.random() * 5));
      const otMin = Math.floor(Math.random() * 60) + 30;
      const co = addMinutes(outDateStr, shift.end, otMin);
      const hrs = Math.round(((new Date(co) - new Date(ci)) / 3600000) * 100) / 100;
      attendanceRows.push([emp.employee_id, dateStr, ci, co, hrs, "Overtime",
        Math.round((otMin / 60) * 100) / 100, false, false, now, now]);
      continue;
    }

    // Present
    const ci = addMinutes(dateStr, shift.start, Math.floor(Math.random() * 5));
    const co = addMinutes(outDateStr, shift.end, Math.floor(Math.random() * 10) - 5);
    const hrs = Math.max(0, Math.round(((new Date(co) - new Date(ci)) / 3600000) * 100) / 100);
    attendanceRows.push([emp.employee_id, dateStr, ci, co, hrs, "Present", 0, false, false, now, now]);
  }
}

console.log(`   Generated ${attendanceRows.length} records — inserting...`);

const BATCH = 300;
let inserted = 0;
for (let i = 0; i < attendanceRows.length; i += BATCH) {
  const batch = attendanceRows.slice(i, i + BATCH);
  const cols = 11;
  const ph = batch.map((_, ri) =>
    `(${Array.from({length: cols}, (_, ci) => `$${ri * cols + ci + 1}`).join(",")})`
  ).join(",");

  await sq.query(
    `INSERT INTO "Attendances"
       (employee_id, date, clock_in, clock_out, total_hours, status,
        overtime_hours, is_archived, is_permanently_deleted, "createdAt", "updatedAt")
     VALUES ${ph}`,
    { bind: batch.flat() }
  );
  inserted += batch.length;
  process.stdout.write(`\r  ${inserted}/${attendanceRows.length}`);
}

const counts = attendanceRows.reduce((a, r) => { a[r[5]] = (a[r[5]]||0)+1; return a; }, {});
console.log("\n\n✅ All done!\n");
console.log("Attendance breakdown:");
for (const [s, c] of Object.entries(counts))
  console.log(`  ${s.padEnd(22)} ${c.toLocaleString()}`);
console.log(`\nSchedule templates: ${templateCount}`);
console.log(`Attendance records: ${attendanceRows.length}`);

await sq.close();
