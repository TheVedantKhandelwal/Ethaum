"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getMe } from "./api";
import { isAuthenticated, clearTokens } from "./auth";

const DEMO_BUYER = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Demo User",
  company: "Acme Corp",
  role: "buyer" as const,
};

const DEMO_VENDOR = {
  id: "00000000-0000-0000-0000-000000000002",
  name: "Alice Chen",
  company: "Vortex AI",
  role: "vendor" as const,
};

type Role = "buyer" | "vendor" | "admin";

interface UserData {
  id: string;
  name: string;
  company: string | null;
  role: Role;
  email?: string;
  avatar_url?: string | null;
}

interface UserContextValue {
  role: Role;
  setRole: (role: Role) => void;
  currentUser: UserData;
  isLoggedIn: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  role: "buyer",
  setRole: () => {},
  currentUser: DEMO_BUYER,
  isLoggedIn: false,
  logout: () => {},
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("buyer");
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const refreshUser = async () => {
    if (isAuthenticated()) {
      try {
        const me = await getMe();
        setUser(me);
        setRole(me.role);
        setIsLoggedIn(true);
      } catch {
        clearTokens();
        setUser(null);
        setIsLoggedIn(false);
      }
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
    setIsLoggedIn(false);
    setRole("buyer");
  };

  // Fall back to demo users when not authenticated
  const currentUser: UserData = user || (role === "vendor" ? DEMO_VENDOR : DEMO_BUYER);

  return (
    <UserContext.Provider value={{ role, setRole, currentUser, isLoggedIn, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
