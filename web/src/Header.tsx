import { useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Fade from "@mui/material/Fade";
import InboxIcon from "@mui/icons-material/Inbox";
import CheckIcon from "@mui/icons-material/Check";
import { api } from "./api/client.ts";

/**
 * Persistent minimal header: the always-available inbox capture. Enter appends
 * the line to the vault's inbox.md, clears the field, and confirms quietly.
 */
export function Header() {
  const [text, setText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const capture = () => {
    if (text.trim() === "") return;
    api.captureInbox(text).then(
      () => {
        setText("");
        setError(undefined);
        setConfirmed(true);
        clearTimeout(confirmTimer.current);
        confirmTimer.current = setTimeout(() => setConfirmed(false), 1500);
      },
      (cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)),
    );
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{ bgcolor: "background.default", borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar variant="dense" sx={{ justifyContent: "center" }}>
        <TextField
          size="small"
          placeholder="Capture to inbox…"
          aria-label="Capture to inbox"
          value={text}
          error={error !== undefined}
          helperText={error}
          onChange={(event) => {
            setText(event.target.value);
            setError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") capture();
          }}
          sx={{ width: "100%", maxWidth: 720 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <InboxIcon fontSize="small" color="disabled" />
                </InputAdornment>
              ),
              endAdornment: (
                <Fade in={confirmed}>
                  <InputAdornment position="end">
                    <CheckIcon fontSize="small" color="success" />
                  </InputAdornment>
                </Fade>
              ),
            },
          }}
        />
      </Toolbar>
    </AppBar>
  );
}
