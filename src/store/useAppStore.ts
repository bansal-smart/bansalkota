import { create } from 'zustand';

interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  target_exam: string;
  avatar_url?: string;
}

interface AppState {
  user: AppUser | null;
  currentGoal: string;
  notificationCount: number;
  country: 'india' | 'dubai';
  setUser: (user: AppUser | null) => void;
  setCurrentGoal: (goal: string) => void;
  setNotificationCount: (count: number) => void;
  setCountry: (country: 'india' | 'dubai') => void;
}

const savedCountry = (typeof window !== 'undefined' ? localStorage.getItem('arke-country') : null) as 'india' | 'dubai' | null;
const savedGoal = (typeof window !== 'undefined' ? localStorage.getItem('arke-goal') : null) || 'IIT JEE';

export const useAppStore = create<AppState>((set) => ({
  user: null,
  currentGoal: savedGoal,
  notificationCount: 0,
  country: savedCountry || 'india',
  setUser: (user) => set({ user }),
  setCurrentGoal: (currentGoal) => {
    if (typeof window !== 'undefined') localStorage.setItem('arke-goal', currentGoal);
    set({ currentGoal });
  },
  setNotificationCount: (notificationCount) => set({ notificationCount }),
  setCountry: (country) => {
    localStorage.setItem('arke-country', country);
    set({ country });
  },
}));
