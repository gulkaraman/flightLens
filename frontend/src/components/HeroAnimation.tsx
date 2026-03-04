export function HeroAnimation() {
  return (
    <div className="pointer-events-none relative mx-auto mt-2 flex w-full max-w-2xl items-center justify-center">
      <svg
        viewBox="0 0 400 120"
        className="h-24 w-full text-sky-400/60"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="flight-path-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(56,189,248,0.0)" />
            <stop offset="35%" stopColor="rgba(56,189,248,0.6)" />
            <stop offset="65%" stopColor="rgba(16,185,129,0.7)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.0)" />
          </linearGradient>
        </defs>

        <path
          id="flight-path"
          d="M 10 90 C 80 40 140 40 210 80 C 270 110 320 40 390 30"
          className="flight-path stroke-[3]"
          fill="none"
          stroke="url(#flight-path-gradient)"
        />

        <g className="flight-plane">
          <path
            d="M 0 0 L 10 -4 L 10 4 Z"
            fill="currentColor"
          />
        </g>
      </svg>
    </div>
  );
}

