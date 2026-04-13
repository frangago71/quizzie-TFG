import axios, { type AxiosInstance } from 'axios';

const API_URL: string = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;