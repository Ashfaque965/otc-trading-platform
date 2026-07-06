import { create } from "zustand";

interface AuthUser {
  id: string;
  walletAddress: string;
  role: "USER" | "ADMIN";
  kycStatus: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    if (typeof window !== "undefined") localStorage.setItem("otc_token", token);
    set({ user, token });
  },
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("otc_token");
    set({ user: null, token: null });
  },
}));
