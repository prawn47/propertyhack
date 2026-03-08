import { useAuth } from '../contexts/AuthContext';

export interface UserPreferences {
  defaultLocation: string | null;
  defaultCategories: string[];
  defaultDateRange: string | null;
}

export function useUserPreferences(): UserPreferences | null {
  const { user } = useAuth();

  if (!user || !user.preferences) return null;

  const { defaultLocation, defaultCategories, defaultDateRange } = user.preferences;

  return {
    defaultLocation: defaultLocation ?? null,
    defaultCategories: defaultCategories ?? [],
    defaultDateRange: defaultDateRange ?? null,
  };
}
