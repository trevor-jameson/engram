import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import InboxIcon from "@mui/icons-material/Inbox";

/**
 * Persistent minimal header: only the always-available inbox-capture field.
 * Rendered but inert this unit — capture is wired to the API in unit 08.
 */
export function Header() {
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
          sx={{ width: "100%", maxWidth: 720 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <InboxIcon fontSize="small" color="disabled" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Toolbar>
    </AppBar>
  );
}
