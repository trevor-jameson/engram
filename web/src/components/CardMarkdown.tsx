import Box from "@mui/material/Box";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const monospace = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

/**
 * Renders card markdown (front or back) via the unified/remark pipeline with
 * GFM and locally bundled KaTeX. Shared by review now, triage/rewrite later.
 */
export function CardMarkdown({ markdown }: { markdown: string }) {
  return (
    <Box
      className="engram-card-content"
      sx={{
        // Even vertical rhythm with no outer margins, so the card surface hugs
        // the content. Owl selector instead of :first-child/:last-child, which
        // are unsafe under SSR (the renderer tests render to static markup).
        "& > *": { my: 0 },
        "& > * + *": { mt: 2 },
        "& code": { fontFamily: monospace, fontSize: "0.9em" },
        "& pre": {
          fontFamily: monospace,
          bgcolor: "action.hover",
          borderRadius: 1,
          px: 2,
          py: 1.5,
          overflowX: "auto",
        },
        "& pre code": { fontSize: "0.85em" },
        // KaTeX ships at 1.21em; pin it to the surrounding 1.125rem card text
        // so prose and math sit on one visual line.
        "& .katex": { fontSize: "1em" },
        "& .katex-display": { overflowX: "auto", overflowY: "hidden" },
        "& blockquote": {
          borderLeft: 3,
          borderColor: "divider",
          color: "text.secondary",
          ml: 0,
          pl: 2,
        },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {markdown}
      </ReactMarkdown>
    </Box>
  );
}
