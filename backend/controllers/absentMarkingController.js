import { markAbsentEmployees, markAbsentEmployeesForDate } from "../services/absentMarkingService.js";

/**
 * POST /api/absent-marking/mark-today
 * Mark absent employees for today
 */
export const markTodayAbsent = async (req, res) => {
  try {
    const result = await markAbsentEmployees();
    res.status(200).json({
      message: "Absent marking completed",
      ...result
    });
  } catch (error) {
    console.error("Error marking today's absences:", error);
    res.status(500).json({ 
      message: "Failed to mark absences",
      error: error.message 
    });
  }
};

/**
 * POST /api/absent-marking/mark-date
 * Mark absent employees for a specific date
 * Body: { date: "YYYY-MM-DD" }
 */
export const markDateAbsent = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    
    const result = await markAbsentEmployeesForDate(date);
    res.status(200).json({
      message: `Absent marking completed for ${date}`,
      ...result
    });
  } catch (error) {
    console.error("Error marking absences for date:", error);
    res.status(500).json({ 
      message: "Failed to mark absences",
      error: error.message 
    });
  }
};
