import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { darkTheme, lightTheme } from "./theme.ts";
import { App } from "./App.tsx";

/** Theme follows the system light/dark preference; there is no manual toggle. */
function Root() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => (prefersDark ? darkTheme : lightTheme), [prefersDark]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

const container = document.getElementById("root");
if (container === null) throw new Error("missing #root element");
createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
