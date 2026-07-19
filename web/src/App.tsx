import { useState } from "react";
import Box from "@mui/material/Box";
import { Header } from "./Header.tsx";
import { RecallScreen } from "./screens/RecallScreen.tsx";
import { ReviewScreen } from "./screens/ReviewScreen.tsx";
import { TriageScreen } from "./screens/TriageScreen.tsx";
import { RewriteScreen } from "./screens/RewriteScreen.tsx";

/** Linear one-thing-at-a-time session flow: recall → review → triage (+ leech rewrites). */
type Screen = "recall" | "review" | "triage" | "rewrite";

export function App() {
  const [screen, setScreen] = useState<Screen>("recall");

  return (
    <>
      <Header />
      <Box component="main" sx={{ maxWidth: 720, mx: "auto", px: 3, py: 5 }}>
        {screen === "recall" && <RecallScreen onNext={() => setScreen("review")} />}
        {screen === "review" && <ReviewScreen onNext={() => setScreen("triage")} />}
        {screen === "triage" && <TriageScreen onNext={() => setScreen("rewrite")} />}
        {screen === "rewrite" && <RewriteScreen onRestart={() => setScreen("recall")} />}
      </Box>
    </>
  );
}
