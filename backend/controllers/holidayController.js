import Holiday from "../models/holiday.js";
import { Op } from "sequelize";
import { notifyAllUsers } from "../services/notificationService.js";

const formatHolidayDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
};

// GET /api/holidays
export const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const where = {};
    if (year) {
      where.date = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`],
      };
    }
    const holidays = await Holiday.findAll({
      where,
      order: [["date", "ASC"]],
    });
    res.status(200).json(holidays);
  } catch (error) {
    console.error("❌ Error fetching holidays:", error);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
};

// GET /api/holidays/check?date=2026-05-01
export const checkHoliday = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date query param required" });

    const holiday = await Holiday.findOne({ where: { date } });
    if (holiday) {
      return res.status(200).json({ isHoliday: true, holiday });
    }
    res.status(200).json({ isHoliday: false, holiday: null });
  } catch (error) {
    console.error("❌ Error checking holiday:", error);
    res.status(500).json({ message: "Failed to check holiday" });
  }
};

// POST /api/holidays
export const createHoliday = async (req, res) => {
  try {
    const { date, name, type } = req.body;
    if (!date || !name || !type) {
      return res.status(400).json({ message: "date, name, and type are required" });
    }

    const existing = await Holiday.findOne({ where: { date } });
    if (existing) {
      return res.status(409).json({ message: `A holiday already exists on ${date}` });
    }

    const holiday = await Holiday.create({ date, name, type });

    // Notify all users about the new holiday
    try {
      const io = req.app.get('io');
      const adminName = req.user?.username || "Admin";
      await notifyAllUsers(
        `🎌 Holiday: ${name}`,
        `${formatHolidayDate(date)} has been declared a ${type}: "${name}". No work required on this day.`,
        "general",
        holiday.id,
        adminName,
        io
      );
    } catch (notifErr) {
      console.error("⚠️ Failed to send holiday notifications:", notifErr.message);
    }

    res.status(201).json(holiday);
  } catch (error) {
    console.error("❌ Error creating holiday:", error);
    res.status(500).json({ message: "Failed to create holiday" });
  }
};

// PUT /api/holidays/:id
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, type } = req.body;

    const holiday = await Holiday.findByPk(id);
    if (!holiday) return res.status(404).json({ message: "Holiday not found" });

    // Check date conflict with another record
    if (date && date !== holiday.date) {
      const conflict = await Holiday.findOne({ where: { date } });
      if (conflict) {
        return res.status(409).json({ message: `A holiday already exists on ${date}` });
      }
    }

    await holiday.update({ date, name, type });

    // Notify all users about the updated holiday
    try {
      const io = req.app.get('io');
      const adminName = req.user?.username || "Admin";
      const updatedDate = date || holiday.date;
      const updatedName = name || holiday.name;
      const updatedType = type || holiday.type;
      await notifyAllUsers(
        `🎌 Holiday Updated: ${updatedName}`,
        `The holiday on ${formatHolidayDate(updatedDate)} has been updated to "${updatedName}" (${updatedType}).`,
        "general",
        holiday.id,
        adminName,
        io
      );
    } catch (notifErr) {
      console.error("⚠️ Failed to send holiday update notifications:", notifErr.message);
    }

    res.status(200).json(holiday);
  } catch (error) {
    console.error("❌ Error updating holiday:", error);
    res.status(500).json({ message: "Failed to update holiday" });
  }
};

// DELETE /api/holidays/:id
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByPk(id);
    if (!holiday) return res.status(404).json({ message: "Holiday not found" });

    // Notify all users about the removed holiday
    try {
      const io = req.app.get('io');
      const adminName = req.user?.username || "Admin";
      await notifyAllUsers(
        `🗓️ Holiday Removed: ${holiday.name}`,
        `The holiday "${holiday.name}" on ${formatHolidayDate(holiday.date)} has been removed.`,
        "general",
        null,
        adminName,
        io
      );
    } catch (notifErr) {
      console.error("⚠️ Failed to send holiday removal notifications:", notifErr.message);
    }

    await holiday.destroy();
    res.status(200).json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting holiday:", error);
    res.status(500).json({ message: "Failed to delete holiday" });
  }
};
