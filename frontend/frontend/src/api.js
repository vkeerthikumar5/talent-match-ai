// src/api.js
import axios from "axios";

// Create an axios instance
const api = axios.create({
  baseURL: "https://talent-match-ai.onrender.com/api", // your backend base URL
});

// Add a request interceptor to attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access"); // assuming you store JWT here
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
