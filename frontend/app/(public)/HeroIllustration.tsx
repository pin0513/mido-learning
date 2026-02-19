'use client';

/**
 * Decorative SVG illustration for the hero section.
 * Extracted as a separate client-only component to avoid
 * hydration mismatch from floating-point Math.cos/Math.sin
 * computations differing between SSR and CSR.
 */

function gearTeeth(count: number, inner: number, outer: number, w: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const x1 = Math.cos(a - w) * inner, y1 = Math.sin(a - w) * inner;
    const x2 = Math.cos(a - w) * outer, y2 = Math.sin(a - w) * outer;
    const x3 = Math.cos(a + w) * outer, y3 = Math.sin(a + w) * outer;
    const x4 = Math.cos(a + w) * inner, y4 = Math.sin(a + w) * inner;
    return `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
  });
}

function spokes(count: number, r1: number, r2: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return {
      x1: Math.cos(a) * r1,
      y1: Math.sin(a) * r1,
      x2: Math.cos(a) * r2,
      y2: Math.sin(a) * r2,
    };
  });
}

const starPositions: [number, number][] = [
  [100, 60], [220, 35], [490, 30], [600, 55], [680, 90],
  [70, 200], [710, 230], [650, 410], [90, 370], [580, 480],
];

const dotPositions: [number, number][] = [
  [370, 205], [490, 330], [355, 370], [590, 240],
  [260, 315], [700, 430], [160, 440], [500, 470],
];

export default function HeroIllustration() {
  const largeGear = gearTeeth(12, 82, 118, 0.19);
  const mainGear = gearTeeth(10, 66, 98, 0.23);
  const mainSpokes = spokes(6, 11, 24);
  const smallGear = gearTeeth(8, 36, 54, 0.27);
  const tinyGear = gearTeeth(7, 24, 38, 0.29);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-end" aria-hidden="true">
      <svg
        viewBox="0 0 720 520"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-w-[58%] lg:max-w-[54%]"
      >
        <defs>
          <filter id="sketch" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" seed="7" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <filter id="sketchLight" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="2" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#c8c3ba" strokeWidth="0.8"/>
          </pattern>
          <pattern id="hatchDark" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#8a847a" strokeWidth="1"/>
          </pattern>
        </defs>

        {/* ── Large Background Gear ── */}
        <g transform="translate(200, 300)" filter="url(#sketchLight)" opacity="0.22">
          <circle cx="0" cy="0" r="118" fill="none" stroke="#6b6560" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="0" cy="0" r="82" fill="none" stroke="#6b6560" strokeWidth="1.5"/>
          <circle cx="0" cy="0" r="30" fill="url(#hatch)" stroke="#6b6560" strokeWidth="2"/>
          {largeGear.map((pts, i) => (
            <polygon key={i} points={pts} fill="url(#hatch)" stroke="#6b6560" strokeWidth="1.8" strokeLinejoin="round"/>
          ))}
        </g>

        {/* ── Main Gear ── */}
        <g transform="translate(430, 270)" filter="url(#sketch)">
          <circle cx="0" cy="0" r="98" fill="url(#hatch)" stroke="#2a2520" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="0" cy="0" r="66" fill="#faf9f7" stroke="#2a2520" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="0" cy="0" r="26" fill="url(#hatchDark)" stroke="#1a1614" strokeWidth="3"/>
          <circle cx="0" cy="0" r="10" fill="#2a2520"/>
          {mainGear.map((pts, i) => (
            <polygon key={i} points={pts} fill="url(#hatch)" stroke="#2a2520" strokeWidth="2" strokeLinejoin="round"/>
          ))}
          {mainSpokes.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#1a1614" strokeWidth="2.5" strokeLinecap="round"/>
          ))}
        </g>

        {/* ── Small Gear ── */}
        <g transform="translate(558, 158)" filter="url(#sketch)">
          <circle cx="0" cy="0" r="54" fill="#f0ede8" stroke="#3d3830" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="0" cy="0" r="36" fill="#faf9f7" stroke="#3d3830" strokeWidth="1.5"/>
          <circle cx="0" cy="0" r="14" fill="url(#hatch)" stroke="#2a2520" strokeWidth="2.5"/>
          {smallGear.map((pts, i) => (
            <polygon key={i} points={pts} fill="#f0ede8" stroke="#3d3830" strokeWidth="1.5" strokeLinejoin="round"/>
          ))}
        </g>

        {/* ── Tiny Gear ── */}
        <g transform="translate(610, 400)" filter="url(#sketchLight)">
          <circle cx="0" cy="0" r="38" fill="#e8e4de" stroke="#5a534c" strokeWidth="1.8"/>
          <circle cx="0" cy="0" r="24" fill="#faf9f7" stroke="#5a534c" strokeWidth="1.3"/>
          <circle cx="0" cy="0" r="9" fill="url(#hatch)" stroke="#3d3830" strokeWidth="2"/>
          {tinyGear.map((pts, i) => (
            <polygon key={i} points={pts} fill="#e8e4de" stroke="#5a534c" strokeWidth="1.3" strokeLinejoin="round"/>
          ))}
        </g>

        {/* Gear linkage lines */}
        <line x1="332" y1="220" x2="496" y2="215" stroke="#6b6560" strokeWidth="1.2" strokeDasharray="5,5" strokeLinecap="round" filter="url(#sketchLight)" opacity="0.6"/>
        <line x1="484" y1="173" x2="504" y2="215" stroke="#6b6560" strokeWidth="1.2" strokeDasharray="4,4" strokeLinecap="round" filter="url(#sketchLight)" opacity="0.6"/>
        <line x1="528" y1="312" x2="572" y2="362" stroke="#6b6560" strokeWidth="1" strokeDasharray="3,5" strokeLinecap="round" opacity="0.5"/>

        {/* ── Pencil / Pen tool ── */}
        <g transform="translate(290, 145) rotate(-30)" filter="url(#sketchLight)">
          <rect x="-7" y="-48" width="14" height="72" rx="2" fill="#e8e4de" stroke="#2a2520" strokeWidth="2"/>
          <polygon points="-7,24 7,24 0,44" fill="#c8c3ba" stroke="#2a2520" strokeWidth="1.8" strokeLinejoin="round"/>
          <rect x="-7" y="-56" width="14" height="12" rx="2" fill="#c8c3ba" stroke="#2a2520" strokeWidth="1.8"/>
          <rect x="-7" y="-48" width="14" height="5" fill="#8a847a" stroke="#2a2520" strokeWidth="1"/>
          <line x1="0" y1="-42" x2="0" y2="22" stroke="#8a847a" strokeWidth="1" strokeDasharray="3,3" opacity="0.7"/>
        </g>

        {/* ── Floating book ── */}
        <g transform="translate(295, 395) rotate(-10)" filter="url(#sketch)">
          <rect x="-26" y="-20" width="52" height="38" rx="3" fill="#e8e4de" stroke="#2a2520" strokeWidth="2.2" strokeLinejoin="round"/>
          <rect x="-24" y="-18" width="22" height="34" rx="2" fill="#d4cfc8" stroke="#2a2520" strokeWidth="1.5"/>
          <line x1="-24" y1="-18" x2="-24" y2="16" stroke="#2a2520" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="-20" y1="-10" x2="22" y2="-10" stroke="#8a847a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
          <line x1="-20" y1="-4" x2="22" y2="-4" stroke="#8a847a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
          <line x1="-20" y1="2" x2="18" y2="2" stroke="#8a847a" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
          <line x1="-20" y1="8" x2="20" y2="8" stroke="#8a847a" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        </g>

        {/* ── Second floating book ── */}
        <g transform="translate(660, 345) rotate(7)" filter="url(#sketchLight)">
          <rect x="-20" y="-15" width="40" height="30" rx="2" fill="#d4cfc8" stroke="#3d3830" strokeWidth="2" strokeLinejoin="round"/>
          <rect x="-18" y="-13" width="17" height="26" rx="1.5" fill="#c0bab2" stroke="#3d3830" strokeWidth="1.3"/>
          <line x1="-18" y1="-13" x2="-18" y2="13" stroke="#3d3830" strokeWidth="2" strokeLinecap="round"/>
          <line x1="-15" y1="-7" x2="17" y2="-7" stroke="#8a847a" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
          <line x1="-15" y1="-2" x2="17" y2="-2" stroke="#8a847a" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
          <line x1="-15" y1="3" x2="14" y2="3" stroke="#8a847a" strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
        </g>

        {/* ── Sketch stars / sparkles ── */}
        {starPositions.map(([x, y], i) => (
          <g key={i} opacity={0.45 + (i % 3) * 0.15} filter="url(#sketchLight)">
            <line x1={x} y1={y - 7} x2={x} y2={y + 7} stroke="#2a2520" strokeWidth={i % 2 === 0 ? 1.5 : 1} strokeLinecap="round"/>
            <line x1={x - 7} y1={y} x2={x + 7} y2={y} stroke="#2a2520" strokeWidth={i % 2 === 0 ? 1.5 : 1} strokeLinecap="round"/>
            <line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
            <line x1={x + 5} y1={y - 5} x2={x - 5} y2={y + 5} stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
          </g>
        ))}

        {/* ── Orbit / circle sketch lines ── */}
        <ellipse cx="420" cy="275" rx="205" ry="92" fill="none" stroke="#8a847a" strokeWidth="1" strokeDasharray="7,9" strokeLinecap="round" opacity="0.3" transform="rotate(-14 420 275)" filter="url(#sketchLight)"/>
        <ellipse cx="400" cy="300" rx="275" ry="135" fill="none" stroke="#6b6560" strokeWidth="0.7" strokeDasharray="5,14" strokeLinecap="round" opacity="0.2" transform="rotate(-9 400 300)"/>

        {/* ── Childlike figure sitting on gear ── */}
        <g transform="translate(432, 177)" filter="url(#sketch)">
          <ellipse cx="0" cy="8" rx="10" ry="13" fill="#e8e4de" stroke="#1a1614" strokeWidth="2"/>
          <circle cx="0" cy="-12" r="12" fill="#f0ede8" stroke="#1a1614" strokeWidth="2.2"/>
          <circle cx="-4.5" cy="-13" r="2.8" fill="#1a1614"/>
          <circle cx="4.5" cy="-13" r="2.8" fill="#1a1614"/>
          <circle cx="-3.5" cy="-14" r="1" fill="white"/>
          <circle cx="5.5" cy="-14" r="1" fill="white"/>
          <path d="M -4.5 -7 Q 0 -4 4.5 -7" fill="none" stroke="#1a1614" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="-10" y1="3" x2="-20" y2="-6" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="10" y1="3" x2="22" y2="-4" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="-5" y1="21" x2="-9" y2="36" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="5" y1="21" x2="9" y2="36" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
          <ellipse cx="-11" cy="38" rx="6" ry="3.5" fill="#2a2520" stroke="#1a1614" strokeWidth="1.5"/>
          <ellipse cx="11" cy="38" rx="6" ry="3.5" fill="#2a2520" stroke="#1a1614" strokeWidth="1.5"/>
          <line x1="22" y1="-4" x2="38" y2="-18" stroke="#1a1614" strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points="38,-26 40,-18 46,-18 41,-14 43,-6 38,-10 33,-6 35,-14 30,-18 36,-18" fill="#e8e4de" stroke="#1a1614" strokeWidth="1.2"/>
        </g>

        {/* ── Floating small circles/dots ── */}
        {dotPositions.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2.5} fill="none" stroke="#6b6560" strokeWidth="1.2" opacity={0.3 + (i % 3) * 0.1} filter="url(#sketchLight)"/>
        ))}
      </svg>
    </div>
  );
}
