import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Alert from "@mui/material/Alert";
import type { QueueResponse } from "@engram/shared";
import { api } from "../api/client.ts";

/**
 * Placeholder proving the API client: shows today's queue summary.
 * The real one-card-at-a-time review flow arrives in unit 06.
 */
export function ReviewScreen({ onNext }: { onNext: () => void }) {
  const [queue, setQueue] = useState<QueueResponse | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    api
      .getQueue()
      .then(setQueue)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  return (
    <Stack spacing={3} sx={{ alignItems: "flex-start" }}>
      <Typography variant="h5" component="h1">
        Review
      </Typography>
      <Typography color="text.secondary">
        Placeholder — card-at-a-time review with markdown/KaTeX rendering arrives in unit 06.
      </Typography>
      {error !== undefined && <Alert severity="error">{error}</Alert>}
      {queue !== undefined && (
        <>
          <Stack direction="row" spacing={1}>
            <Chip label={`due ${queue.counts.due}`} size="small" />
            <Chip label={`queued ${queue.counts.queued}`} size="small" color="primary" />
          </Stack>
          <List dense sx={{ width: "100%" }}>
            {queue.cards.map((card) => (
              <ListItem key={card.id} disableGutters>
                <ListItemText
                  primary={card.front.split("\n")[0]}
                  secondary={`${card.source} · box ${card.box} · due ${card.due}`}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
      <Button variant="contained" onClick={onNext}>
        Finish review
      </Button>
    </Stack>
  );
}
