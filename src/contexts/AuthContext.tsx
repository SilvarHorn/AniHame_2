import React, { createContext, useContext, useEffect, useState } from 'react';

export type WatchServerType = 'mal' | 'anime' | 'animepahe' | 'tryembed' | 'kozo' | 'vidsrc';

export interface CardBorderPreferences {
  mode: 'default' | 'custom';
  color: string;
  width: number;
}

export const DEFAULT_SERVER_ORDER: WatchServerType[] = [
  'mal',
  'anime',
  'animepahe',
  'tryembed',
  'kozo',
  'vidsrc'
];

export const DEFAULT_CARD_BORDER: CardBorderPreferences = {
  mode: 'default',
  color: '#35D5BF',
  width: 2
};

export interface UserPreferences {
  defaultServer: 'mal' | 'megaplayz' | 'vidsrc' | 'zhentube' | 'anime' | 'animepahe' | 'tryembed' | 'kozo';
  defaultAudio: 'sub' | 'dub';
  showEpisodeDate?: boolean;
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
  defaultServer: 'mal',
  defaultAudio: 'sub',
  serverOrder: DEFAULT_SERVER_ORDER,
  cardBorder: DEFAULT_CARD_BORDER,
};

const defaultProfile: UserProfile = {
  uid: 'local-user',
  email: null,
  displayName: 'User',
  photoURL: null,
  preferences: defaultPreferences
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  updatePreferences: async () => {},
  updateProfileData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_user_profile_data');
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        setProfile(defaultProfile);
      }
    } catch (e) {
      setProfile(defaultProfile);
    }
    setLoading(false);
  }, []);

  // Sync basic info to local storage for quick access like Navbar
  useEffect(() => {
    if (profile) {
      try {
        localStorage.setItem('app_user_profile_data', JSON.stringify(profile));
        
        const navData = {
          username: profile.displayName || 'User',
          avatar: profile.photoURL || '',
          themeColor: profile.themeColor || '#8AD7D0',
          bgGradient: profile.bgGradient || '',
          bgImage: profile.bgImage || '',
          bgOpacity: profile.bgOpacity ?? 100,
          serverOrder: profile.preferences?.serverOrder || DEFAULT_SERVER_ORDER,
          cardBorder: profile.preferences?.cardBorder || DEFAULT_CARD_BORDER
        };
        localStorage.setItem('anime_profile', JSON.stringify(navData));
        window.dispatchEvent(new Event('profile-updated'));
      } catch (e) {}
    }
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
      return newData;
    });
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    setProfile(prev => {
      const p = prev || defaultProfile;
      const currentPrefs = p.preferences || defaultPreferences;
      return { 
        ...p, 
        preferences: { ...currentPrefs, ...newPrefs } 
      };
    });
  };

  return (
    <AuthContext.Provider value={{ 
      profile, 
      loading, 
      updatePreferences, 
      updateProfileData 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
