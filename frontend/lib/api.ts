import axios from "axios";
import { useEditorStore } from "@/store/editorStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global Axios response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail ?? "Something went wrong.";
    if (status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    } else if (status === 429) {
      useEditorStore.getState().addToast(
        "Too many requests. Please wait a moment.", "error"
      );
    } else if (status === 422) {
      useEditorStore.getState().addToast(
        `Validation error: ${detail}`, "error"
      );
    } else if (status && status >= 500) {
      useEditorStore.getState().addToast(
        "Server error. Please try again.", "error"
      );
    }
    return Promise.reject(error);
  }
);

export default api;
