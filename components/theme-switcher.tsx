"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Palette, Sun } from "lucide-react";

type Theme = "dark" | "light" | "system";
const choices: { value: Theme; label: string; description: string; Icon: typeof Moon }[] = [
  { value: "dark", label: "Dark", description: "Signature navy", Icon: Moon },
  { value: "light", label: "Warm Slate", description: "Soft grey-blue", Icon: Sun },
  { value: "system", label: "System", description: "Follow device setting", Icon: Monitor },
];
function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}
export default function ThemeSwitcher() {
  const [preference, setPreference] = useState<Theme>("dark");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("ais-theme");
    const initial: Theme = stored === "light" || stored === "system" || stored === "dark" ? stored : "dark";
    setPreference(initial);
    applyTheme(initial);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = () => { if (initial === "system") applyTheme("system"); };
    media.addEventListener?.("change", updateSystem);
    return () => media.removeEventListener?.("change", updateSystem);
  }, []);
  function choose(theme: Theme) {
    setPreference(theme);
    window.localStorage.setItem("ais-theme", theme);
    applyTheme(theme);
    setOpen(false);
  }
  const active = choices.find((choice) => choice.value === preference) ?? choices[0];
  return (
    <div className="ais-theme-switcher">
      {open && <div className="ais-theme-popover" role="dialog" aria-label="Choose appearance">
        <div className="ais-theme-popover-heading"><span>Appearance</span><span className="ais-theme-current">{active.label}</span></div>
        {choices.map(({ value, label, description, Icon }) => <button key={value} type="button" className={`ais-theme-option ${preference === value ? "is-selected" : ""}`} onClick={() => choose(value)} aria-pressed={preference === value}>
          <span className="ais-theme-option-icon"><Icon size={17} /></span><span className="ais-theme-option-copy"><strong>{label}</strong><small>{description}</small></span>{preference === value && <span className="ais-theme-check" aria-hidden="true">✓</span>}
        </button>)}
        <p className="ais-theme-note">Your choice is saved on this device.</p>
      </div>}
      <button type="button" className="ais-theme-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Change appearance">
        <Palette size={16} /><span>Appearance</span><span className="ais-theme-trigger-value">{active.label}</span>
      </button>
    </div>
  );
}
