import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export function TriageScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <Stack spacing={3} sx={{ alignItems: "flex-start" }}>
      <Typography variant="h5" component="h1">
        Inbox triage
      </Typography>
      <Typography color="text.secondary">
        Placeholder — capture-to-card conversion via type templates arrives in unit 08.
      </Typography>
      <Button variant="outlined" onClick={onRestart}>
        End session
      </Button>
    </Stack>
  );
}
