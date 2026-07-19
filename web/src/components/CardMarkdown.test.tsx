import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardMarkdown } from "./CardMarkdown.tsx";

function render(markdown: string): string {
  return renderToStaticMarkup(<CardMarkdown markdown={markdown} />);
}

describe("CardMarkdown", () => {
  it("renders plain prose as paragraphs with emphasis", () => {
    const html = render("A hash table maps keys to values.\n\nLookups are *amortized* O(1).");
    expect(html).toContain("<p>A hash table maps keys to values.</p>");
    expect(html).toContain("<em>amortized</em>");
  });

  it("renders fenced code blocks with the language class", () => {
    const html = render("```ts\nconst x: number = 1;\n```");
    expect(html).toMatch(/<pre[^>]*><code class="language-ts">/);
    expect(html).toContain("const x: number = 1;");
  });

  it("renders inline $...$ math via KaTeX", () => {
    const html = render("Euler: $e^{i\\pi} + 1 = 0$ in one line.");
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("$e^{i\\pi}");
  });

  it("renders block $$...$$ math in KaTeX display mode", () => {
    const html = render("$$\n\\int_0^1 x^2\\,dx = \\tfrac{1}{3}\n$$");
    expect(html).toContain('class="katex-display"');
  });

  it("renders a mixed card: prose, code, and math together", () => {
    const html = render(
      "Variance is $\\sigma^2$.\n\n```py\nsum((x - m) ** 2 for x in xs) / len(xs)\n```\n\n$$\n\\sigma^2 = E[(X - \\mu)^2]\n$$",
    );
    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-display"');
    expect(html).toMatch(/<code class="language-py">/);
    expect(html).toContain("Variance is");
  });

  it("renders GFM the way Obsidian does (strikethrough)", () => {
    const html = render("~~wrong~~ right");
    expect(html).toContain("<del>wrong</del>");
  });

  it("marks output with the card-content class the theme sizes", () => {
    expect(render("hi")).toContain("engram-card-content");
  });
});
