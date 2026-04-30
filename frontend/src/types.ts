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
export interface RoomOption {
  id: number;
  text: string;
}

export interface RoomData {
  id?: number;
  room_code?: string;
  status?: string;
  phase?: string;
  quiz_id?: number;
  question_id?: number;
  text?: string;
  options?: RoomOption[];
  current_question_index?: number;
  total_questions?: number;
  answer_time?: number;
  time_left?: number;
  is_paused?: boolean;
  statistics?: Record<string, number>;
  correct_option_id?: number;
  leaderboard?: { name: string; score: number }[];
}
