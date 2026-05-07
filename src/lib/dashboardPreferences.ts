/**
 * Préférences du tableau de bord (stockées en localStorage)
 */

const STORAGE_KEY = "dashboard_preferences";

export interface DashboardPreferences {
  showStats: boolean;
  showQuickActions: boolean;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  showStats: true,
  showQuickActions: true,
};

export function getDashboardPreferences(): DashboardPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<DashboardPreferences>;
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (e) {
    console.warn("Erreur lecture préférences dashboard:", e);
  }
  return DEFAULT_PREFERENCES;
}

export function setDashboardPreferences(prefs: Partial<DashboardPreferences>): void {
  if (typeof window === "undefined") return;
  try {
    const current = getDashboardPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Erreur sauvegarde préférences dashboard:", e);
  }
}
