import { useState, useRef, useEffect } from "react";
import { SplashScreen } from "./components/splash-screen";
import { Configurator } from "./components/configurator";
import { TestDrive } from "./components/test-drive";

export default function App() {
  const [screen, setScreen] = useState<'splash' | 'configurator' | 'testdrive'>('splash');
  const [kartColor, setKartColor] = useState('#E52521');
  const [kartUrl, setKartUrl] = useState('/mariokartcar.glb');
  const [autoAddToCart, setAutoAddToCart] = useState(false);
  // Discount (%) earned by hitting the crates during the test drive.
  const [discount, setDiscount] = useState(0);
  const [muted, setMuted] = useState(false);

  // Background music: plays from when the site is opened (first interaction)
  // until the purchase is completed, and never past the 10-minute mark.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/audio.mp3');
    audio.loop = true;       // keep playing in the background until it is stopped
    audio.volume = 0.5;
    audioRef.current = audio;

    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    let started = false;

    // Browsers block autoplay until the user interacts, so start the music on
    // the first click/keypress/touch after the site opens, and stop it after
    // 10 minutes of playback.
    const start = () => {
      audio.play().then(() => {
        if (started) return;
        started = true;
        stopTimer = setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 10 * 60 * 1000);
        window.removeEventListener('pointerdown', start);
        window.removeEventListener('keydown', start);
        window.removeEventListener('touchstart', start);
      }).catch(() => { /* blocked - will retry on the next gesture */ });
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    window.addEventListener('touchstart', start);

    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('touchstart', start);
      if (stopTimer) clearTimeout(stopTimer);
      audio.pause();
    };
  }, []);

  const stopMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };

  return (
    <div className="size-full">
      {/* Mute / unmute background music (available on every screen) */}
      <button
        onClick={toggleMute}
        title={muted ? 'Riattiva musica' : 'Muta musica'}
        aria-label={muted ? 'Riattiva musica' : 'Muta musica'}
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 100,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3px solid #1a1a1a',
          background: muted ? '#ffffff' : '#FFD500',
          boxShadow: '0 3px 0 #1a1a1a',
          cursor: 'pointer',
          fontSize: '20px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {screen === 'splash' && (
        <SplashScreen onEnter={() => setScreen('configurator')} />
      )}
      {screen === 'configurator' && (
        <Configurator
          onBackToMenu={() => setScreen('splash')}
          onTestDrive={(color, url) => { setKartColor(color); setKartUrl(url); setDiscount(0); setScreen('testdrive'); }}
          autoAddToCart={autoAddToCart}
          onAutoAddHandled={() => setAutoAddToCart(false)}
          discount={discount}
          onPurchaseComplete={stopMusic}
        />
      )}
      {screen === 'testdrive' && (
        <TestDrive
          kartColor={kartColor}
          kartUrl={kartUrl}
          onExit={() => setScreen('configurator')}
          onDiscountChange={(pct) => setDiscount(pct)}
          onLapComplete={() => {
            setAutoAddToCart(true);
            setScreen('configurator');
          }}
        />
      )}
    </div>
  );
}
