import { STATUS_META } from "./sitefinder";
import type { SiteStatus } from "./site-status";

export interface ExportableLead {
  name: string;
  category: string | null;
  city: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  site_status: string;
  last_checked_at: string | null;
  maps_url: string | null;
}

export const EXPORT_HEADERS = [
  "Nome",
  "Categoria",
  "Cidade",
  "Telefone",
  "Endereço",
  "Site",
  "Situação do site",
  "Última verificação",
  "Google Maps",
];

export function leadToRow(l: ExportableLead): string[] {
  return [
    l.name,
    l.category ?? "",
    l.city ?? "",
    l.phone ?? "",
    l.address ?? "",
    l.website ?? "",
    STATUS_META[l.site_status as SiteStatus]?.label ?? l.site_status,
    l.last_checked_at ? new Date(l.last_checked_at).toLocaleString("pt-BR") : "",
    l.maps_url ?? "",
  ];
}

function escapeCsv(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Semicolon-separated CSV (opens correctly in Excel pt-BR), with UTF-8 BOM. */
export function leadsToCsv(leads: ExportableLead[]): string {
  const lines = [EXPORT_HEADERS, ...leads.map(leadToRow)].map((r) => r.map(escapeCsv).join(";"));
  return "\uFEFF" + lines.join("\r\n");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportCsv(leads: ExportableLead[], baseName = "sitefinder-leads") {
  downloadBlob(new Blob([leadsToCsv(leads)], { type: "text/csv;charset=utf-8" }), `${baseName}-${stamp()}.csv`);
}

export async function exportExcel(leads: ExportableLead[], baseName = "sitefinder-leads") {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const header = EXPORT_HEADERS.map((h) => ({ value: h, fontWeight: "bold" as const }));
  const rows = leads.map((l) => leadToRow(l).map((v) => ({ value: v })));
  const blob = await writeXlsxFile([header, ...rows], {
    sheet: "Leads",
    columns: [{ width: 34 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 50 }, { width: 36 }, { width: 18 }, { width: 20 }, { width: 40 }],
    stickyRowsCount: 1,
  }).toBlob();
  downloadBlob(blob, `${baseName}-${stamp()}.xlsx`);
}
