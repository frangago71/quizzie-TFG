export interface Quiz {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  tags?: string; 
  image_url?: string;
  created_at?: string;  
}