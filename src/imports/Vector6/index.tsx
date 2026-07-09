import svgPaths from "./svg-gidi5qqffd";
type VectorProps = {
  className?: string;
  property1?: "over1" | "over2" | "over3" | "default1" | "default2" | "default3";
};

export default function Vector({ className, property1 = "over1" }: VectorProps) {
  const isDefault1 = property1 === "default1";
  const isDefault1OrDefault2OrDefault3 = ["default1", "default2", "default3"].includes(property1);
  const isOver1OrOver2OrOver3 = ["over1", "over2", "over3"].includes(property1);
  const isOver2 = property1 === "over2";
  return (
    <div className={className || `relative ${isDefault1OrDefault2OrDefault3 ? "h-[75px] w-[444px]" : "h-[86px] w-[778px]"}`}>
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox={isDefault1OrDefault2OrDefault3 ? "0 0 444 75" : "0 0 778 86"}>
        <path d={isDefault1OrDefault2OrDefault3 ? svgPaths.p351e900 : svgPaths.p14967300} fill={isDefault1OrDefault2OrDefault3 ? "url(#paint0_linear_1_60)" : "url(#paint0_linear_1_54)"} id="Vector 5" />
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id={isDefault1OrDefault2OrDefault3 ? "paint0_linear_1_60" : "paint0_linear_1_54"} x1="0" x2={isDefault1OrDefault2OrDefault3 ? "444" : "778"} y1={isDefault1OrDefault2OrDefault3 ? "37.5" : "43"} y2={isDefault1OrDefault2OrDefault3 ? "37.5" : "43"}>
            <stop offset={isOver1OrOver2OrOver3 ? "0.490385" : undefined} stopColor={isDefault1OrDefault2OrDefault3 ? "#DADADA" : "#FEE34E"} />
            <stop offset={isDefault1OrDefault2OrDefault3 ? "0.841346" : "0.923077"} stopColor="white" />
          </linearGradient>
        </defs>
      </svg>
      <p className={`[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] absolute font-["CubeWeb-ExpanLightW03-Rg:Regular",sans-serif] leading-[normal] not-italic text-[53px] text-black ${["default2", "default3"].includes(property1) ? "inset-[25.33%_13.51%_25.33%_16.22%]" : isDefault1 ? "inset-[25.33%_12.84%_25.33%_16.89%]" : property1 === "over3" ? "inset-[27.91%_52.7%_29.07%_9.38%]" : isOver2 ? "inset-[27.91%_61.18%_29.07%_9.25%]" : "inset-[27.91%_57.84%_29.07%_9.25%]"}`}>{property1 === "default2" ? "Ordini" : ["over3", "default3"].includes(property1) ? "Più venduti" : isOver2 ? "Ordini " : isDefault1 ? "Configura" : "Configura"}</p>
      {isOver1OrOver2OrOver3 && (
        <>
          <div className="absolute inset-[0_98.41%_58.14%_-3.26%]">
            <div className="absolute inset-[-2.78%_-10.76%_-25%_-10.57%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45.7064 46">
                <g filter="url(#filter0_d_1_56)" id="Vector 7">
                  <path d={svgPaths.p199b3700} fill="var(--fill-0, #FEE34E)" />
                  <path d={svgPaths.p199b3700} stroke="var(--stroke-0, white)" strokeWidth="2" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="46" id="filter0_d_1_56" width="45.7064" x="-3.91155e-08" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_56" />
                    <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_56" mode="normal" result="shape" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
          <div className="absolute flex inset-[58.14%_-3.04%_0_98.2%] items-center justify-center" style={{ containerType: "size" }}>
            <div className="flex-none h-[100cqh] rotate-180 w-[100cqw]">
              <div className="relative size-full">
                <div className="absolute inset-[-5.56%_-13.42%_-27.78%_-13.23%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 47.7094 48">
                    <g filter="url(#filter0_d_1_58)" id="Vector 9">
                      <path d={svgPaths.p24575f80} fill="var(--fill-0, #FEE34E)" shapeRendering="crispEdges" />
                      <path d={svgPaths.p24575f80} shapeRendering="crispEdges" stroke="var(--stroke-0, #FFED8A)" strokeOpacity="0.64" strokeWidth="4" />
                    </g>
                    <defs>
                      <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="48" id="filter0_d_1_58" width="47.7094" x="-1.19209e-07" y="0">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dy="4" />
                        <feGaussianBlur stdDeviation="2" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                        <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_58" />
                        <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_58" mode="normal" result="shape" />
                      </filter>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute flex inset-[0_-3.04%_58.14%_98.2%] items-center justify-center" style={{ containerType: "size" }}>
            <div className="-rotate-180 -scale-x-100 flex-none h-[100cqh] w-[100cqw]">
              <div className="relative size-full">
                <div className="absolute inset-[-5.56%_-13.42%_-27.78%_-13.23%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 47.7094 48">
                    <g filter="url(#filter0_d_1_52)" id="Vector 10">
                      <path d={svgPaths.p24575f80} fill="var(--fill-0, #FEE34E)" shapeRendering="crispEdges" />
                      <path d={svgPaths.p24575f80} shapeRendering="crispEdges" stroke="url(#paint0_linear_1_52)" strokeOpacity="0.64" strokeWidth="4" />
                    </g>
                    <defs>
                      <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="48" id="filter0_d_1_52" width="47.7094" x="-1.19209e-07" y="0">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dy="4" />
                        <feGaussianBlur stdDeviation="2" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                        <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_52" />
                        <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_52" mode="normal" result="shape" />
                      </filter>
                      <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_52" x1="23.8194" x2="23.8194" y1="38" y2="2">
                        <stop stopColor="#FFED8A" />
                        <stop offset="1" stopColor="#998E53" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute flex inset-[58.14%_98.37%_0_-3.21%] items-center justify-center" style={{ containerType: "size" }}>
            <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
              <div className="relative size-full">
                <div className="absolute inset-[-2.78%_-10.76%_-25%_-10.57%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45.7064 46">
                    <g filter="url(#filter0_d_1_50)" id="Vector 8">
                      <path d={svgPaths.p199b3700} fill="var(--fill-0, #FEE34E)" shapeRendering="crispEdges" />
                      <path d={svgPaths.p199b3700} shapeRendering="crispEdges" stroke="url(#paint0_linear_1_50)" strokeWidth="2" />
                    </g>
                    <defs>
                      <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="46" id="filter0_d_1_50" width="45.7064" x="-3.91155e-08" y="0">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dy="4" />
                        <feGaussianBlur stdDeviation="2" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                        <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_50" />
                        <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_50" mode="normal" result="shape" />
                      </filter>
                      <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_50" x1="22.8179" x2="22.8179" y1="1" y2="37">
                        <stop stopColor="white" />
                        <stop offset="1" stopColor="#999999" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}