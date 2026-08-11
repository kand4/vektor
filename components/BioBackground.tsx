
import React from 'react';
import { useDeviceDetect } from '../utils/deviceDetect';

const BioBackground: React.FC = React.memo(() => {
  const { isMobile } = useDeviceDetect();

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-slate-950 pointer-events-none">
      {/* On desktop: play rich video background. On mobile: lightweight CSS ambient canvas to prevent video lag */}
      {!isMobile ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
          src="https://video-previews.elements.envatousercontent.com/6bf1172a-d3f5-4259-88a4-97680db8bffc/watermarked_preview/watermarked_preview.mp4"
        />
      ) : (
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-slate-950 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>
      )}
      
      {/* Overlay Opacity */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950/80 pointer-events-none"></div>
      
      {/* Radial vignette for focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)] pointer-events-none"></div>
    </div>
  );
});

BioBackground.displayName = 'BioBackground';

export default BioBackground;
