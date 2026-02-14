export type Theme = "white" | "black" | "yellow" | "coral";

export interface ThemeColors {
  background: string;
  text: string;
  headerBg: string;
  headerText: string;
  mondayHighlight: string;
  separatorLine: string;
  hoverBg: string;
  legendBg: string;
}

export const themes: Record<Theme, ThemeColors> = {
  white: {
    background: "#ffffff",
    text: "#000000",
    headerBg: "#000000",
    headerText: "#ffffff",
    mondayHighlight: "#00c0e8",
    separatorLine: "#d1d5db",
    hoverBg: "#f3f4f6",
    legendBg: "rgba(255, 255, 255, 0.95)",
  },
  black: {
    background: "#000000",
    text: "#ffffff",
    headerBg: "#000000",
    headerText: "#ffffff",
    mondayHighlight: "#00c0e8",
    separatorLine: "#333333",
    hoverBg: "#1a1a1a",
    legendBg: "rgba(0, 0, 0, 0.95)",
  },
  yellow: {
    background: "#f5b547",
    text: "#000000",
    headerBg: "#000000",
    headerText: "#ffffff",
    mondayHighlight: "#ffffff",
    separatorLine: "#d99d2e",
    hoverBg: "#f0a830",
    legendBg: "rgba(245, 181, 71, 0.95)",
  },
  coral: {
    background: "#e8724d",
    text: "#000000",
    headerBg: "#000000",
    headerText: "#ffffff",
    mondayHighlight: "#ffffff",
    separatorLine: "#d65d3b",
    hoverBg: "#dd5f3d",
    legendBg: "rgba(232, 114, 77, 0.95)",
  },
};

interface ThemeSwitcherProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  const themeOptions: { theme: Theme; label: string; color: string }[] = [
    { theme: "white", label: "White", color: "#ffffff" },
    { theme: "black", label: "Black", color: "#000000" },
    { theme: "yellow", label: "Yellow", color: "#f5b547" },
    { theme: "coral", label: "Coral", color: "#e8724d" },
  ];

  return (
    <div className="fixed bottom-4 md:bottom-8 right-4 md:right-8 z-20 rounded-lg shadow-lg group hover:p-4 p-2 transition-all cursor-pointer" style={{ backgroundColor: themes[currentTheme].legendBg }}>
      <h3 className="font-semibold mb-2 group-hover:block hidden text-xs md:text-base" style={{ color: themes[currentTheme].text }}>
        Themes
      </h3>
      <div className="group-hover:flex group-hover:gap-2 hidden">
        {themeOptions.map(({ theme, label, color }) => (
          <button
            key={theme}
            onClick={() => onThemeChange(theme)}
            className={`w-8 h-8 md:w-10 md:h-10 rounded-lg border-2 transition-all ${
              currentTheme === theme ? "border-cyan-400 scale-110" : "border-gray-400"
            }`}
            style={{ backgroundColor: color }}
            title={label}
          />
        ))}
      </div>
      <div className="flex gap-2 group-hover:hidden">
        {themeOptions.map(({ theme, color }) => (
          <span
            key={theme}
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
              currentTheme === theme ? "ring-2 ring-cyan-400" : ""
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}