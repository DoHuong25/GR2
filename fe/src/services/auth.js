// src/services/auth.js
import { http } from "./http";

export const Auth = {
  async register({ email, password, username }) {
    const name = username?.trim() || email.split("@")[0];
    const r = await http.post("/auth/register", { email, password, username: name });
    return r.data;
  },

  async login({ email, password }) {
    const r = await http.post("/auth/login", { identifier: email, password });
    const { token, user } = r.data || {};
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
    }
    return r.data; // trả về để Login.jsx đọc role
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
  },
};
