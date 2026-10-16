// Foto de perfil. Si la persona no ha subido ninguna, se muestra una silueta por defecto.
export function Avatar({
  url,
  size = 40,
  className = "",
}: {
  url: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full bg-neutral-200 object-cover dark:bg-neutral-800 ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-teal-400 text-white ${className}`}
    >
      <svg viewBox="0 0 24 24" style={{ width: size * 0.62, height: size * 0.62 }} className="fill-current">
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
      </svg>
    </span>
  );
}
