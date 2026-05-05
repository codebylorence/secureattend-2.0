/**
 * One-off script: clears all attendance and schedule data from the database.
 * Run with: node scripts/clearSchedulesAndAttendances.js
 * Requires DATABASE_URL env var (Render) or local DB env vars.
 */

import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT || "mysql",
      logging: false,
    }
  );
}

const TABLES = [
  "Attendances",
  "ScheduleTemplates",
  "EmployeeSchedules",
  "ShiftTemplates",
  "TemplateDrafts",
  "ScheduleNotifications",
];

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    const isPostgres = !!process.env.DATABASE_URL;

    if (!isPostgres) {
      // MySQL: disable FK checks so we can truncate in any order
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    }

    for (const table of TABLES) {
      try {
        if (isPostgres) {
          await sequelize.query(
            `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`
          );
        } else {
          await sequelize.query(`TRUNCATE TABLE \`${table}\``);
        }
        console.log(`🗑️  Cleared: ${table}`);
      } catch (err) {
        if (
          err.message.includes("does not exist") ||
          err.message.includes("doesn't exist")
        ) {
          console.log(`⏭️  Skipped (table not found): ${table}`);
        } else {
          console.error(`❌ Error clearing ${table}:`, err.message);
        }
      }
    }

    if (!isPostgres) {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    console.log("\n✅ Done. All schedule and attendance data has been cleared.");
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();
