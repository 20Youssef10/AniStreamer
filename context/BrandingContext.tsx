
import React, { createContext, useContext, useState, useEffect } from 'react';
import { firebaseService } from '../services/firebase';
import { AppBranding } from '../types';

const DEFAULT_BRANDING: AppBranding = {
    appName: 'AniStream',
    logoUrl: '/logo.png',
    loginBackground: '',
    faviconUrl: '/logo.png'
};

interface BrandingContextProps {
    branding: AppBranding;
    refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextProps>({
    branding: DEFAULT_BRANDING,
    refreshBranding: async () => {}
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [branding, setBranding] = useState<AppBranding>(DEFAULT_BRANDING);

    const refreshBranding = async () => {
        try {
            const config = await firebaseService.getSystemConfig();
            if (config && config.branding) {
                setBranding({ ...DEFAULT_BRANDING, ...config.branding });
            }
        } catch (e) {
            console.error("Failed to load branding", e);
        }
    };

    useEffect(() => {
        refreshBranding();
    }, []);

    // Effect to update document head
    useEffect(() => {
        document.title = branding.appName;
        
        const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) {
            link.type = 'image/png';
            link.rel = 'icon';
            link.href = branding.faviconUrl || branding.logoUrl;
        } else {
            const newLink = document.createElement('link');
            newLink.type = 'image/png';
            newLink.rel = 'icon';
            newLink.href = branding.faviconUrl || branding.logoUrl;
            document.getElementsByTagName('head')[0].appendChild(newLink);
        }
    }, [branding]);

    return (
        <BrandingContext.Provider value={{ branding, refreshBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};
