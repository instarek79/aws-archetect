import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8805';
const runtimeDefaultFallback = (() => {
  if (typeof window === 'undefined') return 'http://localhost:8805';
  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:8805`;
})();
const API_FALLBACK_URL = import.meta.env.VITE_API_FALLBACK_URL || runtimeDefaultFallback;

const normalizeBaseUrl = (url) => (url || '').replace(/\/+$/, '');
const isApiRequest = (url) => String(url || '').includes('/api/');

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;

        // Store new token
        localStorage.setItem('access_token', access_token);

        // Update the failed request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Process queued requests
        processQueue(null, access_token);

        isRefreshing = false;

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    // Fallback for misconfigured API base URL (common in Docker/local setups)
    if (
      error.response?.status === 404 &&
      originalRequest &&
      !originalRequest._fallbackRetry &&
      isApiRequest(originalRequest.url)
    ) {
      const currentBase = normalizeBaseUrl(originalRequest.baseURL || axiosInstance.defaults.baseURL);
      const fallbackBase = normalizeBaseUrl(API_FALLBACK_URL);

      if (fallbackBase && currentBase !== fallbackBase) {
        originalRequest._fallbackRetry = true;
        originalRequest.baseURL = fallbackBase;
        return axiosInstance(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
