
import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
      // Data Saver check logic
      const connection = (navigator as any).connection;
      const isSlow = connection && (connection.saveData || connection.effectiveType === '2g');
      
      const observer = new IntersectionObserver((entries) => {
          if (entries && entries[0] && entries[0].isIntersecting) {
              setShouldLoad(true);
              observer.disconnect();
          }
      });
      
      const el = document.getElementById(`lazy-${src}`);
      if (el) observer.observe(el);

      return () => observer.disconnect();
  }, [src]);

  // Handle Data Saver
  let finalSrc = src;
  if (settings.dataSaver && src.includes('anilist')) {
      // Try to use medium size instead of large/banner if available in cache or URL manipulation
      // Simple logic: replace 'large' with 'medium' in standard AniList URLs if possible
      finalSrc = src.replace('/large/', '/medium/');
  }

  return (
    <div id={`lazy-${src}`} className={`relative overflow-hidden ${className} bg-dark-700`}>
      {/* Skeleton / Placeholder */}
      <div 
        className={`absolute inset-0 bg-dark-700 animate-pulse transition-opacity duration-500 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`} 
      />
      
      {shouldLoad && (
        <img
            src={finalSrc}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
            {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
