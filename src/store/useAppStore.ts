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

const savedCountry = (typeof window !== 'undefined' ? localStorage.getItem('arambh-country') : null) as 'india' | 'dubai' | null;

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: 'demo-user',
    full_name: 'Aditya Rajan',
    email: 'aditya@example.com',
    role: 'student',
    target_exam: 'jee',
    avatar_url: undefined,
  },
  currentGoal: 'IIT JEE',
  notificationCount: 3,
  country: savedCountry || 'india',
  setUser: (user) => set({ user }),
  setCurrentGoal: (currentGoal) => set({ currentGoal }),
  setNotificationCount: (notificationCount) => set({ notificationCount }),
  setCountry: (country) => {
    localStorage.setItem('arambh-country', country);
    set({ country });
  },
}));
