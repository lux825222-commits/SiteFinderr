// Shared Site Creator data model, used by the form, the HTML template and the AI chat.

export const NICHES = [
  "Restaurante",
  "Lanchonete e hamburgueria",
  "Pizzaria",
  "Padaria e confeitaria",
  "Açaí e sorveteria",
  "Cafeteria",
  "Barbearia",
  "Salão de beleza",
  "Estética e manicure",
  "Clínica e saúde",
  "Dentista",
  "Academia e personal",
  "Pet shop",
  "Loja de roupas e acessórios",
  "Loja em geral",
  "Oficina mecânica",
  "Advocacia",
  "Contabilidade",
  "Imobiliária",
  "Construção e reformas",
  "Escola e cursos",
  "Hotel e pousada",
  "Outro",
] as const;

export const PAYMENT_METHODS = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Boleto",
  "Vale-refeição",
] as const;

export const SOCIAL_NETWORKS = [
  { key: "instagram", label: "Instagram", placeholder: "@suaempresa ou link" },
  { key: "facebook", label: "Facebook", placeholder: "Link da página" },
  { key: "tiktok", label: "TikTok", placeholder: "@suaempresa ou link" },
  { key: "youtube", label: "YouTube", placeholder: "Link do canal" },
  { key: "linkedin", label: "LinkedIn", placeholder: "Link da página" },
  { key: "site", label: "Outro link", placeholder: "https://..." },
] as const;

export type SocialKey = (typeof SOCIAL_NETWORKS)[number]["key"];

export interface PageProduct {
  id: string;
  name: string;
  price: string;
  description: string;
  imageId: string | null;
}

export interface PageDetails {
  businessName: string;
  niche: string;
  nicheOther: string;
  address: string;
  hours: string;
  delivery: "" | "sim" | "nao";
  socials: Record<SocialKey, string>;
  scheduling: { enabled: boolean; link: string };
  payment: { enabled: boolean; methods: string[]; pixKey: string; link: string };
  products: PageProduct[];
  whatsapp: string;
}

/** Image id -> compressed data URL. HTML references images as `sc-img:<id>`. */
export type PageAssets = Record<string, string>;

export const IMAGE_SCHEME = "sc-img:";

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function emptyProduct(): PageProduct {
  return { id: newId(), name: "", price: "", description: "", imageId: null };
}

export function emptyDetails(): PageDetails {
  return {
    businessName: "",
    niche: "",
    nicheOther: "",
    address: "",
    hours: "",
    delivery: "",
    socials: { instagram: "", facebook: "", tiktok: "", youtube: "", linkedin: "", site: "" },
    scheduling: { enabled: false, link: "" },
    payment: { enabled: false, methods: [], pixKey: "", link: "" },
    products: [emptyProduct()],
    whatsapp: "",
  };
}

/** Fills missing keys so older or partial rows are always safe to render. */
export function normalizeDetails(raw: unknown): PageDetails {
  const base = emptyDetails();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<PageDetails>;
  return {
    ...base,
    ...r,
    socials: { ...base.socials, ...(r.socials ?? {}) },
    scheduling: { ...base.scheduling, ...(r.scheduling ?? {}) },
    payment: { ...base.payment, ...(r.payment ?? {}) },
    products: Array.isArray(r.products) && r.products.length ? r.products.map((p) => ({ ...emptyProduct(), ...p })) : base.products,
  };
}

export function nicheLabel(d: Pick<PageDetails, "niche" | "nicheOther">): string {
  return d.niche === "Outro" ? d.nicheOther.trim() || "Negócio local" : d.niche;
}

/**
 * Brazilian phone -> wa.me number (country code included). Returns null when it
 * cannot be a valid number. Accepts "(11) 98888-7777", "11988887777", "+55 11 ...".
 */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (!digits) return null;
  digits = digits.replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13) return null;
  return digits;
}

export function whatsappLink(number: string, message?: string): string {
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** "25" / "25,9" / "R$ 1.250,00" -> "R$ 1.250,00". Free text ("a partir de 30") is kept as typed. */
export function formatPrice(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const cleaned = raw.replace(/^R\$\s*/i, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(cleaned)) return raw;
  let normalized = cleaned;
  if (/,\d{1,2}$/.test(cleaned)) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return raw;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
}

const SOCIAL_BASE: Partial<Record<SocialKey, string>> = {
  instagram: "https://instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  facebook: "https://facebook.com/",
  youtube: "https://youtube.com/@",
};

/** Turns "@handle", "instagram.com/x" or a full URL into a full https URL. */
export function socialUrl(key: SocialKey, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`;
  const base = SOCIAL_BASE[key];
  if (!base) return null;
  return base + v.replace(/^@/, "");
}

export type ValidationErrors = Record<string, string>;

/** Required by the user: name, niche, at least one social network, products with name and image. */
export function validateDetails(d: PageDetails): ValidationErrors {
  const e: ValidationErrors = {};
  if (!d.businessName.trim()) e["businessName"] = "Informe o nome da empresa.";
  if (!d.niche) e["niche"] = "Escolha o nicho da empresa.";
  else if (d.niche === "Outro" && !d.nicheOther.trim()) e["niche"] = "Descreva o nicho da empresa.";
  const hasSocial = Object.entries(d.socials).some(([k, v]) => socialUrl(k as SocialKey, v));
  if (!hasSocial) e["socials"] = "Informe pelo menos uma rede social.";
  if (!d.products.length) e["products"] = "Adicione pelo menos um produto ou serviço.";
  d.products.forEach((p, i) => {
    if (!p.name.trim()) e[`products.${i}.name`] = "Informe o nome.";
    if (!p.imageId) e[`products.${i}.image`] = "Adicione uma imagem.";
  });
  if (d.whatsapp.trim() && !normalizeWhatsapp(d.whatsapp)) e["whatsapp"] = "Número inválido. Use DDD + número.";
  if (d.scheduling.enabled && !d.scheduling.link.trim() && !normalizeWhatsapp(d.whatsapp)) {
    e["scheduling"] = "Para o agendamento, informe o WhatsApp ou um link de agendamento.";
  }
  if (d.payment.enabled && d.payment.methods.length === 0) e["payment"] = "Escolha pelo menos uma forma de pagamento.";
  return e;
}
