import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles";

// The single home of raw color values (see ui-context.md). Components must
// reference palette slots, never hex.
const light = {
  background: { default: "#FAFAF7", paper: "#FFFFFF" },
  text: { primary: "#1F2328", secondary: "#57606A" },
  primary: { main: "#4A5D8A" },
  success: { main: "#2E7D5B" },
  error: { main: "#B3574D" },
  warning: { main: "#B58A3C" },
  divider: "#E6E4DF",
};

const dark = {
  background: { default: "#16181D", paper: "#1F2229" },
  text: { primary: "#E8E6E1", secondary: "#9AA0A8" },
  primary: { main: "#8C9EC9" },
  success: { main: "#5BAE8C" },
  error: { main: "#C97B72" },
  warning: { main: "#C9A35E" },
  divider: "#2E323A",
};

function buildTheme(mode: "light" | "dark"): Theme {
  const palette = mode === "light" ? light : dark;
  const base = createTheme({ palette: { mode, ...palette } });

  // Calm, flat-ish surfaces: elevations above 2 fall back to the elevation-2 shadow.
  const shadows = base.shadows.map((shadow, i) => (i > 2 ? base.shadows[2] : shadow));

  const options: ThemeOptions = {
    shape: { borderRadius: 8 },
    shadows: shadows as Theme["shadows"],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Rendered card content (markdown/code/KaTeX) reads at a comfortable
          // size; UI chrome stays at MUI defaults.
          ".engram-card-content": {
            fontSize: "1.125rem",
            lineHeight: 1.7,
          },
        },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 12 } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 9999 } },
      },
    },
  };
  return createTheme(base, options);
}

export const lightTheme = buildTheme("light");
export const darkTheme = buildTheme("dark");
