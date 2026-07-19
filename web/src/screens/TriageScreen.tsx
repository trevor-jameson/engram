import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import type { CardType } from "@engram/shared";
import { api } from "../api/client.ts";

/**
 * Template copy per card type. Order matters: the four situation-shaped types
 * come first so they are the path of least resistance; definition is last and
 * never preselected.
 */
const TEMPLATES: { type: CardType; label: string; front: string; back: string }[] = [
  { type: "symptom-cause", label: "symptom→cause", front: "Symptom", back: "Cause" },
  { type: "decision-tradeoff", label: "decision→trade-off", front: "Decision", back: "Trade-off" },
  { type: "prediction", label: "prediction", front: "Setup — predict the outcome", back: "What happens" },
  { type: "problem", label: "problem", front: "Problem", back: "Worked solution" },
  { type: "definition", label: "definition", front: "Term / question", back: "Definition" },
];

interface Draft {
  item: string;
  template: (typeof TEMPLATES)[number];
  front: string;
  back: string;
  source: string;
}

/** Session end: convert captured one-liners into cards, or discard them. */
export function TriageScreen({ onRestart }: { onRestart: () => void }) {
  const [items, setItems] = useState<string[] | undefined>();
  const [draft, setDraft] = useState<Draft | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    api
      .getInbox()
      .then((response) => setItems(response.items))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const run = (action: Promise<{ items: string[] } | void>) => {
    setBusy(true);
    setError(undefined);
    action
      .then((response) => {
        if (response !== undefined && "items" in (response as object)) {
          setItems((response as { items: string[] }).items);
        }
        setDraft(undefined);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setBusy(false));
  };

  const convert = (draftToSave: Draft) => {
    run(
      api
        .createCard({
          front: draftToSave.front,
          back: draftToSave.back,
          source: draftToSave.source,
          type: draftToSave.template.type,
          inboxText: draftToSave.item,
        })
        .then(() => api.getInbox()),
    );
  };

  if (items === undefined) {
    return (
      <Frame onRestart={onRestart} done={false}>
        {error !== undefined ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Typography color="text.secondary">Loading inbox…</Typography>
        )}
      </Frame>
    );
  }

  if (items.length === 0) {
    return (
      <Frame onRestart={onRestart} done>
        <Typography color="text.secondary">Inbox is empty — session complete.</Typography>
      </Frame>
    );
  }

  return (
    <Frame onRestart={onRestart} done={false}>
      {error !== undefined && (
        <Alert severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
      )}
      {items.map((item) => (
        <Card key={item} variant="outlined" sx={{ width: "100%" }}>
          <CardContent>
            <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
              <Typography>{item}</Typography>
              {draft?.item === item ? (
                <>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {TEMPLATES.map((template) => (
                      <Chip
                        key={template.type}
                        label={template.label}
                        color={draft.template.type === template.type ? "primary" : undefined}
                        onClick={() => setDraft({ ...draft, template })}
                      />
                    ))}
                  </Stack>
                  <TextField
                    label={draft.template.front}
                    multiline
                    fullWidth
                    value={draft.front}
                    onChange={(event) => setDraft({ ...draft, front: event.target.value })}
                  />
                  <TextField
                    label={draft.template.back}
                    multiline
                    minRows={2}
                    fullWidth
                    value={draft.back}
                    onChange={(event) => setDraft({ ...draft, back: event.target.value })}
                  />
                  <TextField
                    label="Source"
                    required
                    fullWidth
                    value={draft.source}
                    onChange={(event) => setDraft({ ...draft, source: event.target.value })}
                  />
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      disabled={
                        busy ||
                        draft.front.trim() === "" ||
                        draft.back.trim() === "" ||
                        draft.source.trim() === ""
                      }
                      onClick={() => convert(draft)}
                    >
                      Create card
                    </Button>
                    <Button disabled={busy} onClick={() => setDraft(undefined)}>
                      Cancel
                    </Button>
                  </Stack>
                </>
              ) : (
                <Stack direction="row" spacing={1}>
                  {TEMPLATES.map((template) => (
                    <Chip
                      key={template.type}
                      label={template.label}
                      variant="outlined"
                      disabled={busy}
                      onClick={() =>
                        setDraft({ item, template, front: item, back: "", source: "" })
                      }
                    />
                  ))}
                  <Chip
                    label="discard"
                    variant="outlined"
                    disabled={busy}
                    onClick={() => run(api.discardInbox(item))}
                  />
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Frame>
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
        Inbox triage
      </Typography>
      {children}
      <Button variant={done ? "contained" : "outlined"} onClick={onRestart}>
        End session
      </Button>
    </Stack>
  );
}
