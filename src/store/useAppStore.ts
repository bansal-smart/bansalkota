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
  setUser: (user: AppUser | null) => void;
  setCurrentGoal: (goal: string) => void;
  setNotificationCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: 'demo-user',
    full_name: 'Arjun Verma',
    email: 'arjun@example.com',
    role: 'student',
    target_exam: 'jee',
    avatar_url: undefined,
  },
  currentGoal: 'IIT JEE',
  notificationCount: 3,
  setUser: (user) => set({ user }),
  setCurrentGoal: (currentGoal) => set({ currentGoal }),
  setNotificationCount: (notificationCount) => set({ notificationCount }),
}));
