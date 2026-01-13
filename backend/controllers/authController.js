import { verifyLogin, changeUserCredentials } from "../services/authService.js";

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Call the service to verify credentials
    const { message, token, user } = await verifyLogin(username, password);

    res.status(200).json({
      message,
      token,
      user,
    });
  } catch (error) {
    console.error(" Login error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const updateCredentials = async (req, res) => {
  try {
    console.log("🔍 updateCredentials called for user ID:", req.params.id);
    
    const { username, password, currentPassword, firstname, lastname } = req.body;
    const { id } = req.params;

    const result = await changeUserCredentials(id, username, password, currentPassword, firstname, lastname);
    console.log("✅ Credentials updated successfully for user:", id);
    res.json(result);
  } catch (error) {
    console.error("❌ Error updating credentials for user", req.params.id, ":", error.message);
    res.status(400).json({ message: error.message || "Error updating credentials" });
  }
};

