import { useState } from "react";
import Box from "@mui/material/Box";
import { Header } from "./Header.tsx";
import { RecallScreen } from "./screens/RecallScreen.tsx";
import { ReviewScreen } from "./screens/ReviewScreen.tsx";
import { TriageScreen } from "./screens/TriageScreen.tsx";

/** Linear one-thing-at-a-time session flow: recall → review → triage. */
type Screen = "recall" | "review" | "triage";

export function App() {
  const [screen, setScreen] = useState<Screen>("recall");

  return (
    <>
      <Header />
      <Box component="main" sx={{ maxWidth: 720, mx: "auto", px: 3, py: 5 }}>
        {screen === "recall" && <RecallScreen onNext={() => setScreen("review")} />}
        {screen === "review" && <ReviewScreen onNext={() => setScreen("triage")} />}
        {screen === "triage" && <TriageScreen onRestart={() => setScreen("recall")} />}
      </Box>
    </>
  );
}
