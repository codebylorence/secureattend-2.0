import api from "./axiosConfig";

// ✅ Login API
export const loginUser = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials);
    return response.data; // Expected: { token, user }
  } catch (error) {
    console.error("Login error:", error);
    throw error.response?.data?.message || "Login failed";
  }
};
