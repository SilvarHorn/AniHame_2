import React, { createContext, useContext, useEffect, useState } from 'react';

export type WatchServerType = 'filmu' | 'kozo' | 'tryembed' | 'vidc' | 'anime' | 'animepahe' | 'mal' | 'vidsrc';
export type TitleLanguage = 'english' | 'romaji';

export interface CardBorderPreferences {
  mode: 'default' | 'custom';
  color: string;
  width: number;
}

export const DEFAULT_SERVER_ORDER: WatchServerType[] = [
  'filmu',
  'kozo',
  'tryembed',
  'vidc',
  'anime',
  'animepahe',
  'mal',
  'vidsrc'
];

export const DEFAULT_CARD_BORDER: CardBorderPreferences = {
  mode: 'default',
  color: '#FBF3E5',
  width: 2
};

export interface UserPreferences {
  defaultServer: 'filmu' | 'mal' | 'megaplayz' | 'vidsrc' | 'zhentube' | 'anime' | 'animepahe' | 'tryembed' | 'kozo' | 'vidc';
  defaultAudio: 'sub' | 'dub';
  showEpisodeDate?: boolean;
  titleLanguage?: TitleLanguage;
  serverOrder?: WatchServerType[];
  cardBorder?: CardBorderPreferences;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  previousDisplayName?: string | null;
  photoURL: string | null;
  bio?: string;
  themeColor?: string;
  bgGradient?: string;
  bgImage?: string;
  bgOpacity?: number;
  preferences: UserPreferences;
}

interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  defaultServer: 'filmu',
  defaultAudio: 'sub',
  showEpisodeDate: true,
  titleLanguage: 'english',
  serverOrder: DEFAULT_SERVER_ORDER,
  cardBorder: DEFAULT_CARD_BORDER,
};

const defaultProfile: UserProfile = {
  uid: 'local-user',
  email: null,
  displayName: 'User',
  photoURL: null,
  themeColor: '#FBF3E5',
  preferences: defaultPreferences
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  updatePreferences: async () => {},
  updateProfileData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const SERVER_ORDER_STORAGE_KEY = 'anihame_server_order';
const TITLE_LANGUAGE_STORAGE_KEY = 'anihame_title_language';

export function getPreferredAnimeTitle(
  title?: { english?: string | null; romaji?: string | null; native?: string | null } | null,
  titleLanguage: TitleLanguage = 'english',
  forceRomaji: boolean = false
): string {
  if (!title) return 'Unknown';
  if (forceRomaji || titleLanguage === 'romaji') {
    return title.romaji || title.native || title.english || 'Unknown';
  }
  return title.english || title.romaji || title.native || 'Unknown';
}

export function getPreferredEpisodeTitle(
  ep: { title?: string; jpTitle?: string } | undefined,
  epNum: number,
  titleLanguage: TitleLanguage = 'english'
): string {
  if (!ep) return `Episode ${epNum}`;
  if (titleLanguage === 'romaji') {
    return ep.jpTitle?.trim() || ep.title?.trim() || `Episode ${epNum}`;
  }
  return ep.title?.trim() || ep.jpTitle?.trim() || `Episode ${epNum}`;
}

export function sanitizeServerOrder(raw: unknown): WatchServerType[] {
  const validSet = new Set<string>(DEFAULT_SERVER_ORDER);
  const result: WatchServerType[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && validSet.has(item) && !result.includes(item as WatchServerType)) {
        result.push(item as WatchServerType);
      }
    }
  }
  for (const srv of DEFAULT_SERVER_ORDER) {
    if (!result.includes(srv)) {
      result.push(srv);
    }
  }
  return result;
}

function readPersistedTitleLanguage(): TitleLanguage | null {
  try {
    const dedicated = localStorage.getItem(TITLE_LANGUAGE_STORAGE_KEY);
    if (dedicated === 'english' || dedicated === 'romaji') {
      return dedicated;
    }
  } catch {}
  try {
    const storedProfile = localStorage.getItem('app_user_profile_data');
    if (storedProfile) {
      const parsed = JSON.parse(storedProfile);
      const lang = parsed?.preferences?.titleLanguage;
      if (lang === 'english' || lang === 'romaji') return lang;
    }
  } catch {}
  return null;
}

function readPersistedServerOrder(): WatchServerType[] | null {
  try {
    const dedicated = localStorage.getItem(SERVER_ORDER_STORAGE_KEY);
    if (dedicated) {
      const parsed = JSON.parse(dedicated);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeServerOrder(parsed);
      }
    }
  } catch {}
  try {
    const storedProfile = localStorage.getItem('app_user_profile_data');
    if (storedProfile) {
      const parsed = JSON.parse(storedProfile);
      if (Array.isArray(parsed?.preferences?.serverOrder) && parsed.preferences.serverOrder.length > 0) {
        return sanitizeServerOrder(parsed.preferences.serverOrder);
      }
    }
  } catch {}
  try {
    const navSaved = localStorage.getItem('anime_profile');
    if (navSaved) {
      const parsed = JSON.parse(navSaved);
      if (Array.isArray(parsed?.serverOrder) && parsed.serverOrder.length > 0) {
        return sanitizeServerOrder(parsed.serverOrder);
      }
    }
  } catch {}
  return null;
}

function persistServerOrder(order: WatchServerType[]): void {
  try {
    localStorage.setItem(SERVER_ORDER_STORAGE_KEY, JSON.stringify(sanitizeServerOrder(order)));
  } catch {}
}

function persistTitleLanguage(lang: TitleLanguage): void {
  try {
    localStorage.setItem(TITLE_LANGUAGE_STORAGE_KEY, lang);
  } catch {}
}

function persistProfileToStorage(profile: UserProfile): void {
  const sanitizedOrder = sanitizeServerOrder(profile.preferences?.serverOrder);
  const titleLanguage: TitleLanguage = profile.preferences?.titleLanguage === 'romaji' ? 'romaji' : 'english';
  persistServerOrder(sanitizedOrder);
  persistTitleLanguage(titleLanguage);

  try {
    localStorage.setItem('app_user_profile_data', JSON.stringify(profile));
  } catch {
    // If base64 bgImage/photoURL exceeds localStorage quota, still persist lightweight profile fields
    try {
      const compactProfile = {
        ...profile,
        bgImage: profile.bgImage && profile.bgImage.length > 200000 ? '' : profile.bgImage,
        photoURL: profile.photoURL && profile.photoURL.length > 200000 ? '' : profile.photoURL,
      };
      localStorage.setItem('app_user_profile_data', JSON.stringify(compactProfile));
    } catch {}
  }

  try {
    const navData = {
      username: profile.displayName || 'User',
      avatar: profile.photoURL || '',
      themeColor: profile.themeColor || '#FBF3E5',
      bgGradient: profile.bgGradient || '',
      bgImage: profile.bgImage || '',
      bgOpacity: profile.bgOpacity ?? 100,
      serverOrder: sanitizedOrder,
      titleLanguage,
      cardBorder: profile.preferences?.cardBorder || DEFAULT_CARD_BORDER
    };
    localStorage.setItem('anime_profile', JSON.stringify(navData));
  } catch {}

  try {
    window.dispatchEvent(new Event('profile-updated'));
  } catch {}
}

function loadInitialProfile(): UserProfile {
  const persistedOrder = readPersistedServerOrder();
  const persistedTitleLanguage = readPersistedTitleLanguage();
  try {
    const stored = localStorage.getItem('app_user_profile_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.themeColor || parsed.themeColor === '#8AD7D0') {
        parsed.themeColor = '#FBF3E5';
      }
      if (parsed.preferences?.cardBorder?.color === '#35D5BF' || parsed.preferences?.cardBorder?.color === '#8AD7D0') {
        parsed.preferences.cardBorder.color = '#FBF3E5';
      }

      const validServers = new Set<string>([...DEFAULT_SERVER_ORDER, 'zhentube']);
      let resolvedDefault = parsed.preferences?.defaultServer;
      if (resolvedDefault === 'megaplayz') {
        resolvedDefault = 'mal';
      }
      if (!resolvedDefault || !validServers.has(resolvedDefault)) {
        resolvedDefault = 'filmu';
      }

      const resolvedOrder = persistedOrder || sanitizeServerOrder(parsed.preferences?.serverOrder);
      const resolvedTitleLanguage: TitleLanguage =
        persistedTitleLanguage ||
        (parsed.preferences?.titleLanguage === 'romaji' ? 'romaji' : 'english');

      return {
        ...defaultProfile,
        ...parsed,
        preferences: {
          ...defaultPreferences,
          ...(parsed.preferences || {}),
          defaultServer: resolvedDefault,
          titleLanguage: resolvedTitleLanguage,
          serverOrder: resolvedOrder,
        },
      };
    }
  } catch {}

  return {
    ...defaultProfile,
    preferences: {
      ...defaultPreferences,
      titleLanguage: persistedTitleLanguage || 'english',
      serverOrder: persistedOrder || [...DEFAULT_SERVER_ORDER],
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => loadInitialProfile());
  const loading = false;

  // Keep localStorage in sync whenever profile changes
  useEffect(() => {
    persistProfileToStorage(profile);
  }, [profile]);

  const updateProfileData = async (data: Partial<UserProfile>) => {
    setProfile(prev => {
      const p = prev || defaultProfile;
      const newData = { ...p, ...data };
      
      if (data.displayName !== undefined && data.displayName !== p.displayName) {
        if (data.displayName === 'hanime' || data.displayName === 'nhentai') {
          if (p.displayName !== 'hanime' && p.displayName !== 'nhentai') {
            newData.previousDisplayName = p.displayName;
          } else {
            newData.previousDisplayName = p.previousDisplayName;
          }
        } else {
          newData.previousDisplayName = null;
        }
      }
      persistProfileToStorage(newData);
      return newData;
    });
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    setProfile(prev => {
      const p = prev || defaultProfile;
      const currentPrefs = p.preferences || defaultPreferences;
      const mergedPrefs: UserPreferences = {
        ...currentPrefs,
        ...newPrefs,
        ...(newPrefs.serverOrder ? { serverOrder: sanitizeServerOrder(newPrefs.serverOrder) } : {}),
      };
      const updated: UserProfile = {
        ...p,
        preferences: mergedPrefs,
      };
      persistProfileToStorage(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      profile, 
      loading, 
      updatePreferences, 
      updateProfileData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
