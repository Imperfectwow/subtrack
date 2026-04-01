// סוגי נתונים תואמים לסכמת מסד הנתונים

export type UserRole = 'super_admin' | 'admin' | 'coordinator' | 'assistant'

export type AbsenceStatus = 'open' | 'matching' | 'pending' | 'confirmed' | 'cancelled' | 'no_show'

export type AssignmentStatus = 'offered' | 'accepted' | 'confirmed' | 'declined' | 'expired' | 'cancelled'

export interface Municipality {
  id: string
  name: string
  slug: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface School {
  id: string
  municipality_id: string
  name: string
  address?: string
  principal_name?: string
  principal_phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  municipality_id?: string
  role: UserRole
  full_name: string
  phone?: string
  whatsapp_phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Assistant {
  id: string
  municipality_id: string
  subjects: string[]
  grades: string[]
  rating: number
  total_assignments: number
  is_available: boolean
  notes?: string
  created_at: string
  updated_at: string
  // joined fields
  profile?: Profile
}

export interface Absence {
  id: string
  municipality_id: string
  school_id: string
  reported_by?: string
  teacher_name: string
  teacher_phone?: string
  subject: string
  grade: string
  absence_date: string
  start_time: string
  end_time?: string
  status: AbsenceStatus
  reported_via: string
  notes?: string
  created_at: string
  updated_at: string
  // joined fields
  school?: School
  assignments?: Assignment[]
}

export interface Assignment {
  id: string
  absence_id: string
  assistant_id: string
  municipality_id: string
  status: AssignmentStatus
  offered_at: string
  responded_at?: string
  expires_at: string
  offer_rank: number
  match_score?: number
  distance_km?: number
  decline_reason?: string
  created_at: string
  // joined fields
  assistant?: Assistant & { profile: Profile }
  absence?: Absence
}

export interface Invitation {
  id: string
  token: string
  email: string
  municipality_id: string
  role: UserRole
  created_by: string
  expires_at: string
  used_at?: string
  created_at: string
}

export interface Rating {
  id: string
  assignment_id: string
  assistant_id: string
  rated_by?: string
  score: number
  comment?: string
  created_at: string
}

// תוצאת פונקציית find_available_assistants
export interface AvailableAssistant {
  assistant_id: string
  full_name: string
  phone?: string
  whatsapp_phone?: string
  rating: number
  distance_km: number
  subjects: string[]
  match_score: number
}
