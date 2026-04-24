import axios, { type AxiosInstance } from 'axios';

const API_URL: string = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const wsProtocol = API_URL.includes("https") ? "wss" : "ws";
const wsHost = API_URL.replace(/^https?:\/\//, "");
const WS_BASE_URL = `${wsProtocol}://${wsHost}`;

export default api;
export { WS_BASE_URL };

