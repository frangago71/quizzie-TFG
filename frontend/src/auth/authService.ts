import {
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
} from "../types";

const API_URL: string =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

export class AuthError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export const authService = {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(`${API_URL}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AuthError(
        errorData.detail || "Error en el registro",
        response.status,
      );
    }
    return response.json();
  },

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
      throw new AuthError(
        errorData.detail || "Error de autenticación",
        response.status,
      );
    }
    const data: LoginResponse = await response.json();
    sessionStorage.setItem("token", data.access_token);
    return data;
  },

  logout(): void {
    sessionStorage.removeItem("token");
  },

  getToken(): string | null {
    return sessionStorage.getItem("token");
  },

  isLoggedIn(): boolean {
    return !!sessionStorage.getItem("token");
  },
};
