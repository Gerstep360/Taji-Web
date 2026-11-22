export interface UserVehicle {
  id: number;
  plate: string;
  description: string;
  user: number | null;
  user_name: string;
  user_email: string;
  user_phone: string;
  unit_info: string;
  created_at: string;
}

export interface CondoMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}
