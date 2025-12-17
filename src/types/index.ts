// types/index.ts

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'coach' | 'player';
  team_id?: string; // NEW: Direct team reference
  jersey_number?: string; // NEW: Player jersey number
  position?: string; // NEW: Player position
  created_at: string;
  updated_at: string;
  team?: Team; // Optional: Joined team data
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  sport_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  team_id: string;
  title: string;
  content: string;
  author_id: string;  // This might be called user_id in your database
  created_at: string;
  author?: {          // UPDATED: Changed from UserProfile to just first_name/last_name
    first_name: string;
    last_name: string;
  };
  team?: Team;
}

// The rest of your types remain the same...
export interface Schedule {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  schedule_type: 'practice' | 'game' | 'meeting' | 'other';
  start_time: string;
  end_time: string;
  location: string | null;
  created_by: string;
  created_at: string;
  team?: Team;
}

export interface PracticeSchedule {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  practice_type: 'regular' | 'scrimmage' | 'conditioning' | 'skills' | 'other';
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  equipment_needed: string[];
  focus_areas: string[];
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  team?: Team;
  author?: UserProfile;
}