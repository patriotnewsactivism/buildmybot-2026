import { useState, useEffect, useCallback } from 'react';
import type { User } from '../shared/schema';

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  const login = useCallback(() => {
    window.location.href = "/api/login";
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    login,
  };
}
