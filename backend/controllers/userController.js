import User from "../models/user.js";
import Employee from "../models/employee.js";

// 👤 GET USER PROFILE (using verifyToken middleware)
export const getUserProfile = async (req, res) => {
  try {
    // req.user is populated by your verifyToken middleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: "Invalid or missing token" });
    }

    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "role", "createdAt"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: [
            "employee_id",
            "fullname",
            "department",
            "position",
            "email",
            "contact_number",
            "status",
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to load user profile" });
  }
};