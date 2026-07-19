import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export function RecallScreen({ onNext }: { onNext: () => void }) {
  return (
    <Stack spacing={3} sx={{ alignItems: "flex-start" }}>
      <Typography variant="h5" component="h1">
        Free recall
      </Typography>
      <Typography color="text.secondary">
        Placeholder — the delayed free-recall prompt and brain-dump textarea arrive in unit 07.
      </Typography>
      <Button variant="contained" onClick={onNext}>
        Start review
      </Button>
    </Stack>
  );
}
