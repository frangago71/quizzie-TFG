export interface Quiz {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  tags?: string; 
  image_url?: string;
  created_at?: string;  
  active_room_id?: number;
  active_room_status?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
