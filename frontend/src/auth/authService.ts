import { type LoginRequest, type LoginResponse } from "../types";

const API_URL: string = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Error de autenticación");
    }
    const data: LoginResponse = await response.json();
    localStorage.setItem("token", data.access_token);    
    return data;
  },

  logout(): void {
    localStorage.removeItem("token");
  },

  getToken(): string | null {
    return localStorage.getItem("token");
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem("token");
  }
};