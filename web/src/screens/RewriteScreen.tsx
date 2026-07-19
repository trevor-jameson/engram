import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import type { CardDTO } from "@engram/shared";
import { api } from "../api/client.ts";
import { CardMarkdown } from "../components/CardMarkdown.tsx";

/**
 * End-of-session leech surface: chronically lapsing cards get their front
 * reshaped into a situation-shaped cue, or deleted. A leech is a card-quality
 * signal — warning-flagged, never framed as failure.
 */
export function RewriteScreen({ onRestart }: { onRestart: () => void }) {
  const [leeches, setLeeches] = useState<CardDTO[] | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    api
      .getLeeches()
      .then((response) => setLeeches(response.cards))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const settle = (id: string, action: Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    action
      .then(() => setLeeches((current) => current?.filter((card) => card.id !== id)))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setBusy(false));
  };

  if (leeches === undefined) {
    return (
      <Frame onRestart={onRestart} done={false}>
        {error !== undefined ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Typography color="text.secondary">Checking for cards that need a rewrite…</Typography>
        )}
      </Frame>
    );
  }

  if (leeches.length === 0) {
    return (
      <Frame onRestart={onRestart} done>
        <Typography color="text.secondary">
          No cards need a rewrite — session complete.
        </Typography>
      </Frame>
    );
  }

  return (
    <Frame onRestart={onRestart} done={false}>
      <Typography color="text.secondary">
        These fronts aren’t firing. Reshape each one into the situation where the
        knowledge should surface, or delete the card.
      </Typography>
      {error !== undefined && (
        <Alert severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
      )}
      {leeches.map((leech) => (
        <LeechCard key={leech.id} leech={leech} busy={busy} onSettle={settle} />
      ))}
    </Frame>
  );
}

function LeechCard({
  leech,
  busy,
  onSettle,
}: {
  leech: CardDTO;
  busy: boolean;
  onSettle: (id: string, action: Promise<unknown>) => void;
}) {
  const [front, setFront] = useState(leech.front);
  const [back, setBack] = useState(leech.back);

  return (
    <Card variant="outlined" sx={{ width: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
          <Chip
            label={`${String(leech.lapses)} lapses — this front isn’t firing`}
            size="small"
            sx={{ color: "warning.main", borderColor: "warning.main" }}
            variant="outlined"
          />
          <CardMarkdown markdown={leech.front} />
          <Divider flexItem />
          <CardMarkdown markdown={leech.back} />
          <Typography variant="caption" color="text.secondary">
            {leech.source} · box {leech.box} · due {leech.due}
          </Typography>
          <TextField
            label="Rewritten front"
            multiline
            fullWidth
            value={front}
            onChange={(event) => setFront(event.target.value)}
          />
          {front.trim() !== "" && front !== leech.front && (
            <Stack sx={{ width: "100%" }} spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Preview
              </Typography>
              <CardMarkdown markdown={front} />
            </Stack>
          )}
          <TextField
            label="Back"
            multiline
            minRows={2}
            fullWidth
            value={back}
            onChange={(event) => setBack(event.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              disabled={busy || front.trim() === "" || back.trim() === ""}
              onClick={() => onSettle(leech.id, api.rewriteCard(leech.id, { front, back }))}
            >
              Save rewrite
            </Button>
            <Button disabled={busy} onClick={() => onSettle(leech.id, api.deleteCard(leech.id))}>
              Delete card
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Frame({
  done,
  onRestart,
  children,
}: {
  done: boolean;
  onRestart: () => void;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={3} sx={{ alignItems: "flex-start" }}>
      <Typography variant="h5" component="h1">
        Card rewrites
      </Typography>
      {children}
      <Button variant={done ? "contained" : "outlined"} onClick={onRestart}>
        End session
      </Button>
    </Stack>
  );
}
