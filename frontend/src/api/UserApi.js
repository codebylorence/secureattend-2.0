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

export const fetchUserProfile = async (token) => {
  const res = await api.get(`/auth/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const fetchTeamLeaders = async () => {
  const response = await api.get("/auth/teamleaders");
  return response.data;
};
