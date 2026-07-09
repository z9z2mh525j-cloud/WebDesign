import imgBg from "../../imports/Frame3/864d2564949aca41f611da6e3e855e672bed9252.png";
import imgFlag from "../../imports/Frame3/5a8120cc4b81074e5d07044f3f23b31074fc6680.png";
import Vector from "../../imports/Vector6";
import { motion } from "motion/react";
import { useState } from "react";

type Variant = "1" | "2" | "3";

interface MenuButtonProps {
  variant: Variant;
  top: number;
  onClick?: () => void;
}

function MenuButton({ variant, top, onClick }: MenuButtonProps) {
  const [hover, setHover] = useState(false);
  const property1 = (hover ? `over${variant}` : `default${variant}`) as
    | "over1"
    | "over2"
    | "over3"
    | "default1"
    | "default2"
    | "default3";

  return (
    <motion.div
      className="absolute left-[95px] drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)] cursor-pointer"
      style={{ top }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileTap={{ scale: 0.97 }}
      animate={{ scale: hover ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 170, damping: 20 }}
      onClick={onClick}
    >
      <Vector property1={property1} />
    </motion.div>
  );
}

interface MarioMenuProps {
  onConfigura: () => void;
}

export function MarioMenu({ onConfigura }: MarioMenuProps) {
  return (
    <div className="bg-white relative size-full overflow-hidden">
      <div className="absolute h-[1183px] left-[-480px] top-[-40px] w-[2366px]">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgBg} />
      </div>
      <div className="absolute h-[1175px] left-[-444px] opacity-50 top-[-32px] w-[1662px]">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgFlag} />
      </div>
      <MenuButton variant="1" top={368} onClick={onConfigura} />
      <MenuButton variant="2" top={483} onClick={() => alert('Sezione Ordini — prossimamente!')} />
      <MenuButton variant="3" top={598} onClick={() => alert('Più venduti — prossimamente!')} />
    </div>
  );
}
