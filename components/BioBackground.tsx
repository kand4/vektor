
import React from 'react';

const BioBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-slate-950 pointer-events-none">
      {/* Background Video - Increased Opacity for clarity */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
        src="https://video-previews.elements.envatousercontent.com/6bf1172a-d3f5-4259-88a4-97680db8bffc/watermarked_preview/watermarked_preview.mp4"
      />
      
      {/* Reduced Overlay Opacity so video is clearer */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950/80 pointer-events-none"></div>
      
      {/* Optional: Radial vignette for focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)] pointer-events-none"></div>
    </div>
  );
};

export default BioBackground;
