
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { firebaseService } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  accentColor: '#3B82F6',
  layoutDensity: 'normal',
  language: 'en',
  dataSaver: false,
  customCursor: false,
  privacy: {
    profileVisibility: 'public',
    showActivity: true,
    showStats: true,
  },
  parental: {
    adultContent: false,
    spoilerMode: false,
  },
  dashboard: {
    showTrending: true,
    showSeasonal: true,
    showUpcoming: true,
    showRecommendations: true,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    fontSize: 100,
    textToSpeech: false
  },
  player: {
      defaultQuality: '1080p',
      autoplay: true,
      audioLanguage: 'sub'
  },
  reader: {
      direction: 'ltr',
      fit: 'width',
      brightness: 100,
      background: 'black'
  },
  notifications: {
      airingAlerts: true,
      socialAlerts: true
  },
  quickActions: ['list', 'favorite']
};

interface SettingsContextProps {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => void;
  applyPreset: (presetName: string) => void;
}

const SettingsContext = createContext<SettingsContextProps>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  resetSettings: () => {},
  applyPreset: () => {}
});

export const useSettings = () => useContext(SettingsContext);

export const PRESETS = {
    'Midnight': { theme: 'dark', accentColor: '#3B82F6', backgroundImage: '' },
    'Cyberpunk': { theme: 'dark', accentColor: '#FACC15', backgroundImage: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop' },
    'Sakura': { theme: 'light', accentColor: '#EC4899', backgroundImage: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=2076&auto=format&fit=crop' },
    'Dracula': { theme: 'dark', accentColor: '#FF5555', backgroundImage: '' }
} as const;

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const local = localStorage.getItem('anistream_settings');
    if (local) {
        try {
            const parsed = JSON.parse(local);
            // Merge deeper for new props
            const merged = { 
                ...DEFAULT_SETTINGS, 
                ...parsed, 
                reader: { ...DEFAULT_SETTINGS.reader, ...parsed.reader },
                quickActions: parsed.quickActions || DEFAULT_SETTINGS.quickActions
            };
            setSettings(merged);
        } catch (e) {
            console.error("Failed to parse local settings", e);
        }
    }

    try {
        const auth = firebaseService.getAuthInstance();
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                const profile = await firebaseService.getUserData(user.uid);
                if (profile?.settings) {
                    const merged = { 
                        ...DEFAULT_SETTINGS, 
                        ...profile.settings, 
                        reader: { ...DEFAULT_SETTINGS.reader, ...profile.settings.reader },
                        quickActions: profile.settings.quickActions || DEFAULT_SETTINGS.quickActions
                    };
                    setSettings(merged);
                    localStorage.setItem('anistream_settings', JSON.stringify(merged));
                }
            } else {
                setUserId(null);
            }
        });
    } catch (e) {
        console.warn("Firebase Auth not ready", e);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    if (settings.accessibility?.highContrast) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');

    if (settings.accessibility?.fontSize) root.style.fontSize = `${settings.accessibility.fontSize}%`;

    if (settings.language === 'ar') root.setAttribute('dir', 'rtl');
    else root.setAttribute('dir', 'ltr');

    root.style.setProperty('--color-primary', settings.accentColor);
    
    // Custom Cursor Logic
    if (settings.customCursor) {
        document.body.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${encodeURIComponent(settings.accentColor)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>') 0 0, auto`;
    } else {
        document.body.style.cursor = 'auto';
    }

    if (settings.backgroundImage) {
        document.body.style.backgroundImage = `url(${settings.backgroundImage})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    } else {
        document.body.style.backgroundImage = '';
        if (settings.theme === 'dark') document.body.style.backgroundColor = '#0F172A';
        else document.body.style.backgroundColor = '#F8FAFC';
    }
  }, [settings]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
      const updated = { ...settings, ...newSettings };
      
      if (newSettings.privacy) updated.privacy = { ...settings.privacy, ...newSettings.privacy };
      if (newSettings.parental) updated.parental = { ...settings.parental, ...newSettings.parental };
      if (newSettings.dashboard) updated.dashboard = { ...settings.dashboard, ...newSettings.dashboard };
      if (newSettings.accessibility) updated.accessibility = { ...settings.accessibility, ...newSettings.accessibility };
      if (newSettings.player) updated.player = { ...settings.player, ...newSettings.player };
      if (newSettings.reader) updated.reader = { ...settings.reader, ...newSettings.reader };
      if (newSettings.notifications) updated.notifications = { ...settings.notifications, ...newSettings.notifications };
      // quickActions is a direct array replacement, so it's handled by top-level spread

      setSettings(updated);
      localStorage.setItem('anistream_settings', JSON.stringify(updated));

      if (userId) {
          await firebaseService.updateUserSettings(userId, updated);
      }
  };

  const applyPreset = (presetName: string) => {
      const preset = PRESETS[presetName as keyof typeof PRESETS];
      if (preset) {
          updateSettings({
              theme: preset.theme as 'dark'|'light',
              accentColor: preset.accentColor,
              backgroundImage: preset.backgroundImage
          });
      }
  };

  const resetSettings = () => {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('anistream_settings');
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, applyPreset }}>
      {children}
    </SettingsContext.Provider>
  );
};
