import axios from "axios";

// Vite proxy(/api → :8000) 사용. 배포 시 VITE_API_BASE로 오버라이드 가능.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.includes("/login")) {
      localStorage.removeItem("token");
      location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
