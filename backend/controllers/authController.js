import { verifyLogin, changeUserCredentials, requestPasswordReset, resetPassword, verifyResetToken } from "../services/authService.js";

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

export const updateProfile = async (req, res) => {
  try {
    console.log("🔍 updateProfile called for user ID:", req.user.id);
    
    const { username, currentPassword, newPassword, firstname, lastname } = req.body;
    const userId = req.user.id;

    const result = await changeUserCredentials(userId, username, newPassword, currentPassword, firstname, lastname);
    console.log("✅ Profile updated successfully for user:", userId);
    res.json(result);
  } catch (error) {
    console.error("❌ Error updating profile for user", req.user.id, ":", error.message);
    res.status(400).json({ message: error.message || "Error updating profile" });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await requestPasswordReset(email);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const result = await resetPassword(token, newPassword);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(400).json({ error: error.message || "Failed to reset password" });
  }
};

export const verifyResetTokenController = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const result = await verifyResetToken(token);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Verify token error:", error);
    res.status(500).json({ error: "Failed to verify token" });
  }
};
