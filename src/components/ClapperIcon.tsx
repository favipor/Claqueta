// Claqueta con la tapa (clap-stick) separada para poder animarla desde CSS.
export function ClapperIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <g className="clap-stick" style={{ transformOrigin: "4px 11px", transformBox: "view-box" }}>
        <path d="m4 11-1.2-3.9a1 1 0 0 1 .7-1.2l14.6-3.9a1 1 0 0 1 1.2.7L20 6.5" />
        <path d="m7.6 9.9 3.4-5.6M13 8.6l3.4-5.6" />
      </g>
    </svg>
  );
}
