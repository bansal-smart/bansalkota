import { create } from 'zustand';

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  target_exam: string;
  avatar_url?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface CartItem {
  type: 'book' | 'pack';
  id: string;
  title: string;
  price: number;
  cover_url?: string | null;
  quantity: number;
}

interface AppState {
  user: AppUser | null;
  currentGoal: string;
  notifications: AppNotification[];
  unreadCount: number;
  cart: CartItem[];
  setUser: (user: AppUser | null) => void;
  setCurrentGoal: (goal: string) => void;
  setNotifications: (n: AppNotification[]) => void;
  addNotification: (n: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  archiveNotification: (id: string) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  updateCartQty: (type: CartItem['type'], id: string, quantity: number) => void;
  removeFromCart: (type: CartItem['type'], id: string) => void;
  clearCart: () => void;
}

const USER_CACHE_KEY = 'bansal-user-cache';
const CART_CACHE_KEY = 'bansal-cart-v1';

const loadCachedUser = (): AppUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
};

const loadCachedCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const persistCart = (cart: CartItem[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cart));
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  user: loadCachedUser(),
  currentGoal: 'IIT JEE',
  notifications: [],
  unreadCount: 0,
  cart: loadCachedCart(),
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_CACHE_KEY);
    }
    set({ user });
  },
  setCurrentGoal: (currentGoal) => set({ currentGoal }),
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.read_at).length }),
  addNotification: (n) => {
    const next = [n, ...get().notifications];
    set({ notifications: next, unreadCount: next.filter((x) => !x.read_at).length });
  },
  markRead: (id) => {
    const next = get().notifications.map((n) =>
      n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
    );
    set({ notifications: next, unreadCount: next.filter((x) => !x.read_at).length });
  },
  markAllRead: () => {
    const now = new Date().toISOString();
    const next = get().notifications.map((n) => (n.read_at ? n : { ...n, read_at: now }));
    set({ notifications: next, unreadCount: 0 });
  },
  archiveNotification: (id) => {
    const next = get().notifications.filter((n) => n.id !== id);
    set({ notifications: next, unreadCount: next.filter((x) => !x.read_at).length });
  },
  addToCart: (item, qty = 1) => {
    const existing = get().cart.find((c) => c.type === item.type && c.id === item.id);
    const next = existing
      ? get().cart.map((c) =>
          c.type === item.type && c.id === item.id ? { ...c, quantity: c.quantity + qty } : c,
        )
      : [...get().cart, { ...item, quantity: qty }];
    persistCart(next);
    set({ cart: next });
  },
  updateCartQty: (type, id, quantity) => {
    const next = get()
      .cart.map((c) => (c.type === type && c.id === id ? { ...c, quantity: Math.max(1, quantity) } : c));
    persistCart(next);
    set({ cart: next });
  },
  removeFromCart: (type, id) => {
    const next = get().cart.filter((c) => !(c.type === type && c.id === id));
    persistCart(next);
    set({ cart: next });
  },
  clearCart: () => {
    persistCart([]);
    set({ cart: [] });
  },
}));
