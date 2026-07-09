import { useEffect, useRef, useState } from "react";

// Plays toadciao.mp4 once (no loop). When it ends it stays frozen on the last
// frame; a tap continues to the next screen.
export function IntroVideo({ onContinue }: { onContinue: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      // Autoplay with sound can be blocked - retry muted so it still plays.
      v.muted = true;
      v.play().catch(() => { /* ignored */ });
    });
  }, []);

  return (
    <div
      className="size-full"
      style={{
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onContinue}
    >
      <video
        ref={videoRef}
        src="/toadciao.mp4"
        playsInline
        autoPlay
        onEnded={() => setEnded(true)}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      />
      {ended && (
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontSize: '0.9rem',
            opacity: 0.9,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}
        >
          Tocca per continuare
        </div>
      )}
    </div>
  );
}
