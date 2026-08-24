import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderArticle } from "../../src/lib/article/render";

describe("article rendering", () => {
  it("keeps explicit heading labels and shares ids with the toc index", async () => {
    const report = await renderArticle("# Methods {#sec:methods}\n\n## Setup", {
      base: "/JCORE",
    });

    expect(report.headings.map((heading) => heading.id)).toEqual([
      "sec-methods",
      "setup",
    ]);
    expect(report.html).toContain('<h1 id="sec-methods">Methods</h1>');
    expect(report.html).toContain('<h2 id="setup">Setup</h2>');
  });

  it("deduplicates repeated explicit labels deterministically", async () => {
    const report = await renderArticle(
      "# Results {#sec:results}\n\n## Results {#sec:results}\n\nSee [first](#sec:results).",
    );

    expect(report.headings.map((heading) => heading.id)).toEqual([
      "sec-results",
      "sec-results-2",
    ]);
    expect(report.html).toContain('href="#sec-results"');
  });

  it("does not emit Pandoc fences, KaTeX error markup, or broken internal hrefs", async () => {
    const report = await renderArticle(
      "::: algorithmic\n\n## Algorithm {#alg:one}\n\n$$\n\\begin{equation*}x=1\\end{equation*}\n$$\n\nSee [Algorithm](#alg:missing).\n\n:::",
    );

    expect(report.html).not.toContain(":::");
    expect(report.html).not.toContain("katex-error");
    expect(report.html).not.toContain('href="#alg:missing"');
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "unresolved-reference",
    );
  });

  it("wraps a bare display environment before KaTeX processing", async () => {
    const report = await renderArticle("\\begin{equation*}x=1\\end{equation*}");

    expect(report.html).not.toContain("katex-error");
    expect(report.html).toContain("katex-display");
  });

  it("does not leak duplicate dollar paragraphs around already wrapped display math", async () => {
    const report = await renderArticle(
      "$$\n\\begin{equation*}x=1\\end{equation*}\n$$",
    );

    expect(report.html).not.toContain("<p>$</p>");
    expect(report.html.match(/katex-display/g)).toHaveLength(1);
  });

  it("keeps headings after display math that starts inline in a paragraph", async () => {
    const report = await renderArticle(
      [
        "The task is defined by the following objective: $$\\begin{align*}",
        "x &= y",
        "\\end{align*}$$",
        "",
        "## Pre-training Procedure",
      ].join("\n"),
    );

    expect(report.html).not.toContain("katex-error");
    expect(report.html).toContain(
      '<h2 id="pre-training-procedure">Pre-training Procedure</h2>',
    );
  });

  it("keeps prose and headings after a display math block closes inline", async () => {
    const report = await renderArticle(
      [
        "The task is defined as follows: $$\\begin{align*}",
        "x &= y",
        "\\end{align*}$$ where the balance factor is small.",
        "",
        "## Next Section",
      ].join("\n"),
    );

    expect(report.html).not.toContain("katex-error");
    expect(report.html).toContain("where the balance factor is small.");
    expect(report.html).toContain(
      '<h2 id="next-section">Next Section</h2>',
    );
  });

  it("converts simple whitespace tables and records media references", async () => {
    const report = await renderArticle(
      "Name  Score\n-----  -----\nAlice  9\n\n![Latency](/figures/paper/chart.pdf)",
      { base: "/JCORE" },
    );

    expect(report.html).toMatch(/<table\b/);
    expect(report.html).toContain("/JCORE/figures/paper/chart.pdf");
    expect(report.media).toEqual([
      { src: "/JCORE/figures/paper/chart.pdf", kind: "image" },
    ]);
  });

  it("assigns explicit figure ids so figure references resolve", async () => {
    const report = await renderArticle(
      "![Chart](/figures/paper/chart.png){#fig:chart}\n\nSee [Figure](#fig:chart).",
      { base: "/JCORE" },
    );

    expect(report.html).toContain('id="fig-chart"');
    expect(report.html).toContain('href="#fig-chart"');
  });

  it("converts Pandoc grid tables and preserves caption targets", async () => {
    const report = await renderArticle(
      [
        "::: center",
        "+-------+-------+",
        "| Model | Score |",
        "+=======+=======+",
        "| Alpha | $1$   |",
        "+-------+-------+",
        ": Results from the grid table. {#tab:grid-results}",
        ":::",
      ].join("\n"),
    );

    expect(report.html).toMatch(/<table\b/);
    expect(report.html).toContain("<th>Model</th>");
    expect(report.html).toContain("<td>Alpha</td>");
    expect(report.html).toContain('id="tab-grid-results"');
    expect(report.html).not.toContain("+-------+");
    expect(report.html).not.toContain(": Results from the grid table.");
    expect(report.html).toContain("Results from the grid table.");
  });

  it("attaches simple-table captions to the table instead of the caption paragraph", async () => {
    const report = await renderArticle(
      [
        "Name  Score",
        "-----  -----",
        "Alice  9",
        "",
        ": Results from the simple table. {#tab:simple-results}",
      ].join("\n"),
    );

    expect(report.html).toContain('<table id="tab-simple-results">');
    expect(report.html).toContain(
      "<em>Results from the simple table.</em>",
    );
    expect(report.html).not.toContain("<p id=\"tab-simple-results\">");
    expect(report.html).not.toContain(": Results from the simple table.");
  });

  it("renders Attention Is All You Need tables, equations, and PDF figures as structured content", async () => {
    const body = readFileSync(
      "content/external-articles/attention-is-all-you-need/body.md",
      "utf8",
    );
    const report = await renderArticle(body, { base: "/JCORE" });

    expect(report.html.match(/<table\b[^>]*>/g)).toHaveLength(4);
    expect(report.html).not.toMatch(/<p>\$<\/p>/);
    expect(report.html).not.toMatch(/^\+[-=:+]+/m);
    expect(report.html).toContain("<th>Training Cost (FLOPs)</th>");
    expect(report.html).toContain("<td>ByteNet</td>");
    expect(report.html).toContain("class=\"katex\"");
    expect(report.html).not.toContain("$1.0\\cdot10^{20}$");
    expect(report.html).toContain("<th><span class=\"katex\">");
    expect(report.html).toContain("<td>Transformer (big)</td>");
    expect(report.html).not.toMatch(/[+][-=:+]+[+]/);
    expect(report.html).toContain('<table id="tab-wmt-results">');
    expect(report.html).toContain('<table id="tab-variations">');
    expect(report.html).toContain('class="article-pdf-figure"');
    expect(report.html).toContain('type="application/pdf"');
    expect(report.html).toContain("Open PDF figure");
    expect(report.media.filter((media) => media.kind === "embed")).toHaveLength(
      5,
    );
  });

  it("keeps DeepSeek table captions attached to their table targets", async () => {
    const body = readFileSync(
      "content/external-articles/deepseek-v3-technical-report/body.md",
      "utf8",
    );
    const report = await renderArticle(body, { base: "/JCORE" });

    expect(report.html).toContain('<table id="tab-cost">');
    expect(report.html).toContain(
      "Training costs of DeepSeek-V3, assuming the rental price of H800 is",
    );
    expect(report.html).not.toContain('<p id="tab-cost">');
  });

  it("makes wide table scroll regions keyboard accessible", async () => {
    const report = await renderArticle(
      "| Name | Score |\n| --- | --- |\n| Alice | 9 |",
    );

    expect(report.html).toContain(
      '<div class="article-table-scroll" tabindex="0" role="region" aria-label="Scrollable table">',
    );
  });
});
