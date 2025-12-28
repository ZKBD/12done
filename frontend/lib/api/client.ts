import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach access token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only access store on client side
    if (typeof window !== 'undefined') {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401, refresh token
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Only attempt refresh on client side
      if (typeof window !== 'undefined') {
        const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();

        if (refreshToken) {
          try {
            // Call refresh endpoint directly (not through intercepted instance)
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            // Update tokens in store
            setTokens(data.accessToken, data.refreshToken);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            }
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear auth and redirect to login
            clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token - clear auth
          clearAuth();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// API client wrapper with typed methods
export const apiClient = {
  get: <T>(url: string, params?: object) =>
    axiosInstance.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: object) =>
    axiosInstance.post<T>(url, data).then((res) => res.data),

  patch: <T>(url: string, data?: object) =>
    axiosInstance.patch<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data?: object) =>
    axiosInstance.put<T>(url, data).then((res) => res.data),

  delete: <T>(url: string) =>
    axiosInstance.delete<T>(url).then((res) => res.data),

  // File upload with multipart/form-data
  upload: <T>(url: string, formData: FormData) =>
    axiosInstance
      .post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((res) => res.data),
};

export default apiClient;
