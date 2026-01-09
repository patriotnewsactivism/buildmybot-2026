import { useState, useEffect, useCallback } from 'react';
import type { User } from '../shared/schema';
import { buildApiUrl, safeParseJson } from '../services/apiConfig';

async function fetchUser(): Promise<User | null> {
  const response = await fetch(buildApiUrl('/auth/user'), {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return safeParseJson<User>(response);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(buildApiUrl('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout failed:', error);
    }
    window.location.href = '/';
  }, []);

  const login = useCallback(() => {
    window.location.href = '/?auth=login';
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    login,
  };
}
