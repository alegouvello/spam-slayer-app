import { useRef, useEffect, useState } from 'react';
import heroVideo from '@/assets/hero-video.mp4';

export const SeamlessVideo = () => {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<1 | 2>(1);

  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    if (!video1 || !video2) return;

    const handleTimeUpdate = () => {
      const active = activeVideo === 1 ? video1 : video2;
      const inactive = activeVideo === 1 ? video2 : video1;
      
      // Start crossfade 1.5 seconds before end
      if (active.duration - active.currentTime < 1.5) {
        inactive.currentTime = 0;
        inactive.play().catch(() => {});
        setActiveVideo(activeVideo === 1 ? 2 : 1);
      }
    };

    video1.addEventListener('timeupdate', handleTimeUpdate);
    video2.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video1.removeEventListener('timeupdate', handleTimeUpdate);
      video2.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [activeVideo]);

  return (
    <>
      <video
        ref={video1Ref}
        autoPlay
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        className={`seamless-video fixed inset-0 w-full h-full object-cover z-0 transition-opacity duration-1500 pointer-events-none ${
          activeVideo === 1 ? 'opacity-40' : 'opacity-0'
        }`}
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
      <video
        ref={video2Ref}
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        className={`seamless-video fixed inset-0 w-full h-full object-cover z-0 transition-opacity duration-1500 pointer-events-none ${
          activeVideo === 2 ? 'opacity-40' : 'opacity-0'
        }`}
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
    </>
  );
};
