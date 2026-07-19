import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import type { RecallContextResponse } from "@engram/shared";
import { api } from "../api/client.ts";

/**
 * Session opener: delayed free recall. Names the previous session's sources,
 * takes a plain brain dump, persists it, and moves on. Ungraded by design —
 * an empty dump is a permitted skip, never a problem.
 */
export function RecallScreen({ onNext }: { onNext: () => void }) {
  const [context, setContext] = useState<RecallContextResponse | undefined>();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    api
      .getRecallContext()
      .then(setContext)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const submit = () => {
    setSubmitting(true);
    setError(undefined);
    api.postRecall(text).then(
      () => onNext(),
      (cause: unknown) => {
        setSubmitting(false);
        setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
  };

  const prompt =
    context === undefined
      ? undefined
      : context.lastSources === null
        ? "First session — brain dump anything you want to remember before reviewing."
        : `Last session: ${context.lastSources.join(", ")} — brain dump before reviewing.`;

  return (
    <Stack spacing={3} sx={{ alignItems: "flex-start" }}>
      <Typography variant="h5" component="h1">
        Free recall
      </Typography>
      {prompt !== undefined && <Typography color="text.secondary">{prompt}</Typography>}
      <TextField
        multiline
        minRows={8}
        fullWidth
        placeholder="Everything you can pull from memory — fragments welcome."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error !== undefined && (
        <Alert severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
      )}
      <Button variant="contained" disabled={submitting} onClick={submit}>
        Continue to review
      </Button>
    </Stack>
  );
}
