import { useEffect, useState } from "react";
import { motion } from "motion/react";
import nintendoLogo from "../../../Nintendologo.png";

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => !p), 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative size-full overflow-hidden flex flex-col items-center justify-center cursor-pointer select-none"
      style={{ backgroundColor: "#E52521" }}
      onClick={onEnter}
    >
      {/* Decorative diagonal stripes */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 40px, transparent 40px, transparent 80px)",
        }}
      />

      <img
        src={nintendoLogo}
        alt="Nintendo"
        className="w-[180px] mb-6 drop-shadow-[0px_4px_4px_rgba(0,0,0,0.35)]"
      />

      <motion.h1
        className="text-white font-['Outfit',sans-serif] font-black text-center tracking-tight leading-none drop-shadow-[0px_6px_8px_rgba(0,0,0,0.35)]"
        style={{ fontSize: "clamp(48px, 12vw, 110px)" }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
      >
        MARIO KART
        <br />
        SHOP
      </motion.h1>

      <motion.p
        className="mt-10 text-white font-['Montserrat',sans-serif] font-semibold uppercase tracking-[0.3em] text-sm md:text-base"
        animate={{ opacity: pulse ? 1 : 0.35 }}
        transition={{ duration: 0.6 }}
      >
        Tocca per iniziare
      </motion.p>
    </div>
  );
}
