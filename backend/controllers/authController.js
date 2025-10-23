import { verifyLogin, changeUserCredentials } from "../services/authService.js";

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await verifyLogin(username, password);
    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ message: error.message });
  }
};

export const updateCredentials = async (req, res) => {
  try {
    const { username, password } = req.body;
    const { id } = req.params;

    const result = await changeUserCredentials(id, username, password);
    res.json(result);
  } catch (error) {
    console.error("Error updating credentials:", error);
    res.status(500).json({ message: "Error updating credentials" });
  }
};
