import { useCallback, useEffect, useReducer, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import type { CardDTO, GradeResult, QueueResponse } from "@engram/shared";
import { api } from "../api/client.ts";
import { CardMarkdown } from "../components/CardMarkdown.tsx";
import { initialReviewState, reviewReducer } from "./reviewMachine.ts";

/**
 * One card at a time through today's queue: front → reveal → pass/lapse.
 * The queue is fetched once at session start and worked through in order.
 */
export function ReviewScreen({ onNext }: { onNext: () => void }) {
  const [queue, setQueue] = useState<QueueResponse | undefined>();
  const [fetchError, setFetchError] = useState<string | undefined>();
  const [state, dispatch] = useReducer(reviewReducer, initialReviewState);

  const fetchQueue = useCallback(() => {
    setFetchError(undefined);
    api
      .getQueue()
      .then(setQueue)
      .catch((cause: unknown) =>
        setFetchError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const grade = (card: CardDTO, result: GradeResult) => {
    dispatch({ type: "grade-start" });
    api.gradeCard(card.id, result).then(
      () => dispatch({ type: "grade-success" }),
      (cause: unknown) =>
        dispatch({
          type: "grade-failure",
          message: cause instanceof Error ? cause.message : String(cause),
        }),
    );
  };

  if (fetchError !== undefined) {
    return (
      <ReviewFrame>
        <Alert severity="error">{fetchError}</Alert>
        <Button variant="outlined" onClick={fetchQueue}>
          Retry
        </Button>
      </ReviewFrame>
    );
  }

  if (queue === undefined) {
    return (
      <ReviewFrame>
        <Typography color="text.secondary">Loading today’s queue…</Typography>
      </ReviewFrame>
    );
  }

  if (queue.cards.length === 0) {
    return (
      <ReviewFrame>
        <Typography color="text.secondary">No reviews today.</Typography>
        <Button variant="contained" onClick={onNext}>
          Continue to triage
        </Button>
      </ReviewFrame>
    );
  }

  const card = queue.cards[state.index];
  if (card === undefined) {
    return (
      <ReviewFrame>
        <Typography color="text.secondary">Review complete.</Typography>
        <Button variant="contained" onClick={onNext}>
          Continue to triage
        </Button>
      </ReviewFrame>
    );
  }

  return (
    <ReviewFrame progress={`${state.index + 1} of ${queue.cards.length}`}>
      <Card variant="outlined" sx={{ width: "100%" }}>
        <CardContent sx={{ p: 3 }}>
          <CardMarkdown markdown={card.front} />
          {state.revealed && (
            <>
              <Divider sx={{ my: 3 }} />
              <CardMarkdown markdown={card.back} />
            </>
          )}
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 3 }}>
            {card.source} · box {card.box} · due {card.due}
          </Typography>
        </CardContent>
      </Card>
      {state.error !== undefined && (
        <Alert severity="error" sx={{ width: "100%" }}>
          {state.error}
        </Alert>
      )}
      {state.revealed ? (
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="success"
            disabled={state.grading}
            onClick={() => grade(card, "pass")}
          >
            Pass
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={state.grading}
            onClick={() => grade(card, "lapse")}
          >
            Lapse
          </Button>
        </Stack>
      ) : (
        <Button variant="contained" onClick={() => dispatch({ type: "reveal" })}>
          Reveal
        </Button>
      )}
    </ReviewFrame>
  );
}

function ReviewFrame({
  progress,
  children,
}: {
  progress?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={3} sx={{ alignItems: "flex-start" }}>
      <Stack
        direction="row"
        sx={{ width: "100%", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <Typography variant="h5" component="h1">
          Review
        </Typography>
        {progress !== undefined && (
          <Typography variant="body2" color="text.secondary">
            {progress}
          </Typography>
        )}
      </Stack>
      {children}
    </Stack>
  );
}
