// Helpers for the stored page HTML: image tokens, AI reply parsing and file download.
import { IMAGE_SCHEME, type PageAssets } from "./types";

/** Replaces sc-img:<id> tokens with the stored image data so the file works anywhere. */
export function resolveImages(html: string, assets: PageAssets): string {
  return html.replace(/sc-img:([a-z0-9]+)/gi, (match, id: string) => assets[id] ?? match);
}

const HTML_BLOCK = /```html\s*([\s\S]*?)```/i;

/** Pulls a complete HTML document out of an AI reply, or null when the reply has none. */
export function extractHtml(text: string): string | null {
  const block = HTML_BLOCK.exec(text)?.[1];
  const candidate = (block ?? text).trim();
  const start = candidate.search(/<!doctype html|<html[\s>]/i);
  const end = candidate.toLowerCase().lastIndexOf("</html>");
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + "</html>".length);
}

/** Chat text without the HTML code: what the person should read. */
export function chatText(text: string): { text: string; hasHtml: boolean; writingHtml: boolean } {
  const idx = text.search(/```html/i);
  if (idx === -1) return { text, hasHtml: false, writingHtml: false };
  const closed = HTML_BLOCK.test(text);
  const after = closed ? text.replace(HTML_BLOCK, "").slice(idx) : "";
  return { text: (text.slice(0, idx) + after).trim(), hasHtml: closed, writingHtml: !closed };
}

/** Shortens stored history for the model: previous HTML versions are replaced by a note. */
export function stripHtmlForModel(text: string): string {
  return text.replace(HTML_BLOCK, "[HTML da página atualizado nesta resposta]");
}

export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pagina"
  );
}

export function downloadHtml(html: string, assets: PageAssets, name: string) {
  const blob = new Blob([resolveImages(html, assets)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(name)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { IMAGE_SCHEME };
