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
    const { username, password, currentPassword } = req.body;
    const { id } = req.params;

    const result = await changeUserCredentials(id, username, password, currentPassword);
    res.json(result);
  } catch (error) {
    console.error("Error updating credentials:", error);
    res.status(400).json({ message: error.message || "Error updating credentials" });
  }
};

