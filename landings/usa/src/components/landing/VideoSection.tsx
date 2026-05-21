import { useEffect, useRef, useState } from "react";

export default function VideoSection({ introVideoUrl = "" }: { introVideoUrl?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!introVideoUrl || !videoRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play();
          setPlaying(true);
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [introVideoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <section className="bg-background py-12 md:py-20 px-4 md:px-10">
      <div ref={containerRef} className="max-w-[800px] mx-auto relative rounded-2xl overflow-hidden aspect-video bg-card border border-border">
        {introVideoUrl ? (
          <video
            ref={videoRef}
            src={introVideoUrl}
            muted={muted}
            playsInline
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-body">Video coming soon</span>
          </div>
        )}

        {/* Play button */}
        {!playing && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
            aria-label="Play video"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}

        {/* Mute toggle */}
        {introVideoUrl && (
          <button
            onClick={() => {
              setMuted(!muted);
              if (videoRef.current) videoRef.current.muted = !muted;
            }}
            className="absolute top-3 right-3 md:top-4 md:right-4 w-7 h-7 md:w-8 md:h-8 rounded-full bg-background/60 flex items-center justify-center text-foreground text-xs font-body"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        )}
      </div>

      {/* Trust row */}
      <div className="flex items-center justify-center gap-2 mt-6 md:mt-8 text-[12px] md:text-[13px] text-muted-foreground">
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span>4.8 / 5 · 100+ verified reviews</span>
      </div>
    </section>
  );
}
