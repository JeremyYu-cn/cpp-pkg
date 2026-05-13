type Theme = "dark" | "light";

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" focusable="false" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" focusable="false" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

type ThemeToggleProps = {
  isDark: boolean;
  onToggle: () => void;
  lightLabel: string;
  darkLabel: string;
  switchLabel: string;
};

export function ThemeToggle({ isDark, onToggle, lightLabel, darkLabel, switchLabel }: ThemeToggleProps) {
  return (
    <button
      aria-checked={isDark}
      aria-label={switchLabel}
      className={`theme-switch ${isDark ? "is-dark" : "is-light"}`}
      onClick={onToggle}
      role="switch"
      title={isDark ? lightLabel : darkLabel}
      type="button"
    >
      <span className="theme-switch-track">
        <span className="theme-switch-icon light"><SunIcon /></span>
        <span className="theme-switch-icon dark"><MoonIcon /></span>
        <span className="theme-switch-thumb">
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
    </button>
  );
}
