// Builds the first version of a business page from the form answers.
// Output is one self-contained HTML document; images are referenced as sc-img:<id>.
import {
  IMAGE_SCHEME,
  SOCIAL_NETWORKS,
  formatPrice,
  nicheLabel,
  normalizeWhatsapp,
  socialUrl,
  whatsappLink,
  type PageDetails,
  type SocialKey,
} from "./types";

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url: string): string {
  return /^(https?:|mailto:|tel:)/i.test(url) ? esc(url) : "#";
}

interface Theme {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  onAccent: string;
  display: string;
  body: string;
  fontsQuery: string;
  tagline: string;
  catalogTitle: string;
  cta: string;
}

const FONT_SETS = {
  bold: { display: "'Bricolage Grotesque'", body: "'Manrope'", q: "family=Bricolage+Grotesque:wght@600;800&family=Manrope:wght@400;600;700" },
  elegant: { display: "'Playfair Display'", body: "'Inter Tight'", q: "family=Playfair+Display:wght@600;800&family=Inter+Tight:wght@400;600;700" },
  clean: { display: "'Outfit'", body: "'Figtree'", q: "family=Outfit:wght@600;800&family=Figtree:wght@400;600;700" },
};

function theme(niche: string): Theme {
  const n = niche.toLowerCase();
  const make = (
    colors: Pick<Theme, "bg" | "surface" | "text" | "muted" | "accent" | "accent2" | "onAccent">,
    fonts: keyof typeof FONT_SETS,
    copy: Pick<Theme, "tagline" | "catalogTitle" | "cta">,
  ): Theme => ({ ...colors, display: FONT_SETS[fonts].display, body: FONT_SETS[fonts].body, fontsQuery: FONT_SETS[fonts].q, ...copy });

  if (/restaurante|lanchonete|hamburg|pizzaria|padaria|confeitaria|açaí|sorvet|cafeteria/.test(n))
    return make(
      { bg: "#fff8f1", surface: "#ffffff", text: "#2b1a12", muted: "#7a6153", accent: "#e8551d", accent2: "#f4a52b", onAccent: "#ffffff" },
      "bold",
      { tagline: "Sabor de verdade, feito com carinho todos os dias.", catalogTitle: "Cardápio", cta: "Fazer pedido" },
    );
  if (/barbearia/.test(n))
    return make(
      { bg: "#111014", surface: "#1b1a20", text: "#f3efe7", muted: "#a59f93", accent: "#c9a25b", accent2: "#e6c98f", onAccent: "#15130f" },
      "elegant",
      { tagline: "Corte, barba e estilo com quem entende do assunto.", catalogTitle: "Serviços", cta: "Agendar horário" },
    );
  if (/salão|estética|manicure|beleza/.test(n))
    return make(
      { bg: "#fff6f8", surface: "#ffffff", text: "#2e1a23", muted: "#86636f", accent: "#d64b7f", accent2: "#f2a7c0", onAccent: "#ffffff" },
      "elegant",
      { tagline: "Cuidado, beleza e autoestima em cada detalhe.", catalogTitle: "Serviços", cta: "Agendar horário" },
    );
  if (/clínica|saúde|dentista/.test(n))
    return make(
      { bg: "#f3faf9", surface: "#ffffff", text: "#0f2a2c", muted: "#5b7476", accent: "#0f8f8a", accent2: "#5fd0c3", onAccent: "#ffffff" },
      "clean",
      { tagline: "Atendimento humano e profissional para cuidar de você.", catalogTitle: "Tratamentos e serviços", cta: "Agendar consulta" },
    );
  if (/academia|personal/.test(n))
    return make(
      { bg: "#0d0f0c", surface: "#171a15", text: "#f1f5ec", muted: "#9aa393", accent: "#b6f23a", accent2: "#e9ff8a", onAccent: "#111407" },
      "bold",
      { tagline: "Treine com foco, constância e quem te acompanha de perto.", catalogTitle: "Planos e serviços", cta: "Quero começar" },
    );
  if (/pet/.test(n))
    return make(
      { bg: "#f7fbf2", surface: "#ffffff", text: "#1e2a14", muted: "#66755a", accent: "#3f9b3a", accent2: "#f6c344", onAccent: "#ffffff" },
      "clean",
      { tagline: "Tudo para o seu pet ser feliz, com carinho e cuidado.", catalogTitle: "Produtos e serviços", cta: "Falar com a gente" },
    );
  if (/oficina|mecânica|construção|reforma/.test(n))
    return make(
      { bg: "#121417", surface: "#1c1f24", text: "#f2f4f7", muted: "#9aa1ab", accent: "#f2a516", accent2: "#ffd36b", onAccent: "#16130b" },
      "bold",
      { tagline: "Serviço bem feito, preço justo e compromisso com prazo.", catalogTitle: "Serviços", cta: "Pedir orçamento" },
    );
  if (/advocacia|contabilidade|imobiliária/.test(n))
    return make(
      { bg: "#f6f5f1", surface: "#ffffff", text: "#14213d", muted: "#5d6578", accent: "#14213d", accent2: "#b8935a", onAccent: "#ffffff" },
      "elegant",
      { tagline: "Experiência, confiança e atendimento próximo.", catalogTitle: "Áreas de atuação", cta: "Falar com um especialista" },
    );
  if (/escola|curso/.test(n))
    return make(
      { bg: "#f5f8ff", surface: "#ffffff", text: "#13204a", muted: "#5d6a8c", accent: "#2f5bea", accent2: "#ffc53d", onAccent: "#ffffff" },
      "clean",
      { tagline: "Aprender com qualidade muda o seu futuro.", catalogTitle: "Cursos", cta: "Quero me matricular" },
    );
  if (/hotel|pousada/.test(n))
    return make(
      { bg: "#f8f5ef", surface: "#ffffff", text: "#24302b", muted: "#6c7770", accent: "#2f7d6d", accent2: "#d9a65a", onAccent: "#ffffff" },
      "elegant",
      { tagline: "Conforto, tranquilidade e uma estadia inesquecível.", catalogTitle: "Acomodações", cta: "Reservar agora" },
    );
  if (/loja|roupa|acessório/.test(n))
    return make(
      { bg: "#faf7f5", surface: "#ffffff", text: "#1b1716", muted: "#776d69", accent: "#1b1716", accent2: "#e2725b", onAccent: "#ffffff" },
      "bold",
      { tagline: "Peças escolhidas a dedo para o seu estilo.", catalogTitle: "Produtos", cta: "Comprar pelo WhatsApp" },
    );
  return make(
    { bg: "#0f0b16", surface: "#1a1424", text: "#f5f1fb", muted: "#a99bbd", accent: "#9b4dff", accent2: "#d58cff", onAccent: "#ffffff" },
    "clean",
    { tagline: "Qualidade e atendimento que fazem a diferença.", catalogTitle: "Produtos e serviços", cta: "Fale conosco" },
  );
}

const ICONS: Record<SocialKey | "whatsapp" | "pin" | "clock" | "truck" | "card" | "calendar", string> = {
  whatsapp:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z"/></svg>',
  instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.5 3c.4 2.4 2 4 4.5 4.2v3.3a8 8 0 0 1-4.4-1.4V15a6 6 0 1 1-6-6h.6v3.4a2.7 2.7 0 1 0 2.1 2.6V3h3.2Z"/></svg>',
  youtube:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  site: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  truck:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.5-4.3a1 1 0 0 0-.8-.4H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
  card: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
};

export function buildPageHtml(d: PageDetails): string {
  const t = theme(d.niche === "Outro" ? d.nicheOther : d.niche);
  const name = esc(d.businessName.trim());
  const niche = esc(nicheLabel(d));
  const wa = normalizeWhatsapp(d.whatsapp);
  const products = d.products.filter((p) => p.name.trim());
  const firstImage = products.find((p) => p.imageId)?.imageId;
  const socials = SOCIAL_NETWORKS.map((s) => ({ ...s, url: socialUrl(s.key, d.socials[s.key] ?? "") })).filter(
    (s): s is (typeof s & { url: string }) => Boolean(s.url),
  );
  const address = d.address.trim();
  const hours = d.hours.trim();
  const sched = d.scheduling.enabled ? d.scheduling : null;
  const pay = d.payment.enabled ? d.payment : null;
  const year = new Date().getFullYear();

  const waGeneral = wa ? whatsappLink(wa, `Olá, ${d.businessName.trim()}! Vim pelo site e gostaria de mais informações.`) : null;

  const nav = [
    `<a href="#catalogo">${esc(t.catalogTitle)}</a>`,
    sched ? `<a href="#agendamento">Agendamento</a>` : "",
    address || hours || d.delivery ? `<a href="#informacoes">Informações</a>` : "",
    pay ? `<a href="#pagamento">Pagamento</a>` : "",
    `<a href="#contato">Contato</a>`,
  ].join("");

  const highlights = [
    hours ? `<li>${ICONS.clock}<span>${esc(hours.split("\n")[0] ?? "")}</span></li>` : "",
    d.delivery === "sim" ? `<li>${ICONS.truck}<span>Fazemos entrega</span></li>` : "",
    d.delivery === "nao" ? `<li>${ICONS.pin}<span>Atendimento no local</span></li>` : "",
    address ? `<li>${ICONS.pin}<span>${esc(address)}</span></li>` : "",
  ]
    .filter(Boolean)
    .join("");

  const productCards = products
    .map((p) => {
      const price = formatPrice(p.price);
      const order = wa ? whatsappLink(wa, `Olá! Tenho interesse em: ${p.name.trim()}${price ? ` (${price})` : ""}`) : null;
      return `
      <article class="card">
        ${p.imageId ? `<div class="card-img"><img src="${IMAGE_SCHEME}${esc(p.imageId)}" alt="${esc(p.name.trim())}" loading="lazy"></div>` : ""}
        <div class="card-body">
          <h3>${esc(p.name.trim())}</h3>
          ${p.description.trim() ? `<p class="card-desc">${esc(p.description.trim())}</p>` : ""}
          <div class="card-foot">
            ${price ? `<strong class="price">${esc(price)}</strong>` : "<span></span>"}
            ${order ? `<a class="btn btn-sm" href="${safeUrl(order)}" target="_blank" rel="noopener">${ICONS.whatsapp}Pedir</a>` : ""}
          </div>
        </div>
      </article>`;
    })
    .join("");

  const schedulingSection = !sched
    ? ""
    : sched.link.trim()
      ? `
  <section id="agendamento" class="section band">
    <div class="wrap center">
      <span class="eyebrow">${ICONS.calendar}Agendamento online</span>
      <h2>Reserve o seu horário</h2>
      <p class="lead">Escolha o melhor dia e horário em poucos cliques.</p>
      <a class="btn btn-lg" href="${safeUrl(sched.link.trim())}" target="_blank" rel="noopener">${ICONS.calendar}Agendar agora</a>
    </div>
  </section>`
      : `
  <section id="agendamento" class="section band">
    <div class="wrap">
      <div class="center">
        <span class="eyebrow">${ICONS.calendar}Agendamento online</span>
        <h2>Reserve o seu horário</h2>
        <p class="lead">Preencha os dados e confirme pelo WhatsApp.</p>
      </div>
      <form class="sched" id="sched-form">
        <label>Seu nome<input name="nome" required placeholder="Como podemos te chamar?"></label>
        <label>${esc(t.catalogTitle.split(" ")[0] ?? "Serviço")}
          <select name="servico">${products.map((p) => `<option>${esc(p.name.trim())}</option>`).join("")}</select>
        </label>
        <label>Data<input type="date" name="data" required></label>
        <label>Horário<input type="time" name="hora" required></label>
        <button class="btn btn-lg" type="submit">${ICONS.whatsapp}Confirmar pelo WhatsApp</button>
      </form>
    </div>
  </section>`;

  const infoSection =
    !address && !hours && !d.delivery
      ? ""
      : `
  <section id="informacoes" class="section">
    <div class="wrap info-grid">
      <div>
        <span class="eyebrow">Informações</span>
        <h2>Como nos encontrar</h2>
        <ul class="info-list">
          ${hours ? `<li>${ICONS.clock}<div><strong>Horário de atendimento</strong><p>${esc(hours).replace(/\n/g, "<br>")}</p></div></li>` : ""}
          ${address ? `<li>${ICONS.pin}<div><strong>Endereço</strong><p>${esc(address)}</p><a class="link" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(address)}" target="_blank" rel="noopener">Ver no mapa →</a></div></li>` : ""}
          ${d.delivery === "sim" ? `<li>${ICONS.truck}<div><strong>Entrega</strong><p>Fazemos entrega. Peça pelo ${wa ? "WhatsApp" : "nosso contato"}.</p></div></li>` : ""}
          ${d.delivery === "nao" ? `<li>${ICONS.truck}<div><strong>Entrega</strong><p>No momento não fazemos entrega.</p></div></li>` : ""}
        </ul>
      </div>
      ${address ? `<div class="map"><iframe title="Mapa" loading="lazy" src="https://www.google.com/maps?q=${encodeURIComponent(address)}&amp;output=embed"></iframe></div>` : ""}
    </div>
  </section>`;

  const paymentSection = !pay
    ? ""
    : `
  <section id="pagamento" class="section band">
    <div class="wrap center">
      <span class="eyebrow">${ICONS.card}Pagamento</span>
      <h2>Formas de pagamento</h2>
      <ul class="chips">${pay.methods.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      ${
        pay.pixKey.trim()
          ? `<div class="pix"><span>Chave Pix</span><code id="pix-key">${esc(pay.pixKey.trim())}</code><button class="btn btn-sm" type="button" id="pix-copy">Copiar</button></div>`
          : ""
      }
      ${pay.link.trim() ? `<a class="btn btn-lg" href="${safeUrl(pay.link.trim())}" target="_blank" rel="noopener">${ICONS.card}Pagar online</a>` : ""}
    </div>
  </section>`;

  const socialLinks = socials
    .map((s) => `<a class="social" href="${safeUrl(s.url)}" target="_blank" rel="noopener" aria-label="${s.label}">${ICONS[s.key]}</a>`)
    .join("");

  const description = `${d.businessName.trim()} — ${nicheLabel(d)}${address ? ` em ${address}` : ""}. ${t.tagline}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} | ${niche}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${name}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="${t.accent}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${t.fontsQuery}&display=swap" rel="stylesheet">
<style>
  :root{--bg:${t.bg};--surface:${t.surface};--text:${t.text};--muted:${t.muted};--accent:${t.accent};--accent2:${t.accent2};--on-accent:${t.onAccent};--radius:18px}
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:${t.body},system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-family:${t.display},Georgia,serif;line-height:1.1;letter-spacing:-.02em}
  img{max-width:100%;display:block}
  a{color:inherit}
  svg{width:1.15em;height:1.15em;flex-shrink:0}
  .wrap{width:min(1120px,92%);margin:0 auto}
  .center{text-align:center;display:flex;flex-direction:column;align-items:center}
  .btn{display:inline-flex;align-items:center;gap:.5em;background:var(--accent);color:var(--on-accent);text-decoration:none;font-weight:700;border:0;border-radius:999px;padding:.8em 1.4em;cursor:pointer;font:inherit;font-weight:700;transition:transform .15s,box-shadow .15s}
  .btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px -10px var(--accent)}
  .btn-sm{padding:.5em 1em;font-size:.9rem}
  .btn-lg{padding:1em 1.8em;font-size:1.05rem;margin-top:1.4rem}
  .btn-ghost{background:transparent;color:var(--text);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--text) 25%,transparent)}
  .eyebrow{display:inline-flex;align-items:center;gap:.4em;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--accent)}
  .lead{color:var(--muted);font-size:1.1rem;max-width:40ch;margin-top:.6rem}
  header{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid color-mix(in srgb,var(--text) 8%,transparent)}
  .nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;height:68px}
  .brand{font-family:${t.display},serif;font-weight:800;font-size:1.3rem;text-decoration:none}
  .nav-links{display:none;gap:1.6rem;font-weight:600;font-size:.95rem}
  .nav-links a{text-decoration:none;opacity:.8}.nav-links a:hover{opacity:1;color:var(--accent)}
  .hero{padding:4rem 0 3rem}
  .hero-grid{display:grid;gap:2.5rem;align-items:center}
  .hero h1{font-size:clamp(2.4rem,7vw,4.4rem);margin:.8rem 0 1rem}
  .hero h1 span{color:var(--accent)}
  .hero .actions{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.8rem}
  .hero-img{aspect-ratio:4/3;border-radius:28px;overflow:hidden;box-shadow:0 30px 60px -30px color-mix(in srgb,var(--accent) 60%,#000);background:linear-gradient(135deg,var(--accent),var(--accent2))}
  .hero-img img{width:100%;height:100%;object-fit:cover}
  .highlights{list-style:none;display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.6rem}
  .highlights li{display:flex;align-items:center;gap:.45em;background:var(--surface);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:999px;padding:.45em .9em;font-size:.9rem;color:var(--muted)}
  .highlights svg{color:var(--accent)}
  .section{padding:4.5rem 0}
  .section h2{font-size:clamp(1.9rem,4.5vw,2.8rem);margin-top:.5rem}
  .band{background:color-mix(in srgb,var(--accent) 7%,var(--bg))}
  .grid{display:grid;gap:1.4rem;margin-top:2.4rem;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
  .card{background:var(--surface);border-radius:var(--radius);overflow:hidden;border:1px solid color-mix(in srgb,var(--text) 8%,transparent);display:flex;flex-direction:column;transition:transform .2s}
  .card:hover{transform:translateY(-4px)}
  .card-img{aspect-ratio:4/3;overflow:hidden;background:color-mix(in srgb,var(--accent) 15%,var(--bg))}
  .card-img img{width:100%;height:100%;object-fit:cover}
  .card-body{padding:1.2rem;display:flex;flex-direction:column;gap:.5rem;flex:1}
  .card h3{font-size:1.25rem}
  .card-desc{color:var(--muted);font-size:.95rem}
  .card-foot{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:auto;padding-top:.6rem}
  .price{font-size:1.2rem;color:var(--accent)}
  .sched{display:grid;gap:1rem;margin:2.2rem auto 0;max-width:560px;background:var(--surface);padding:1.6rem;border-radius:var(--radius);border:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
  .sched label{display:flex;flex-direction:column;gap:.35rem;font-weight:600;font-size:.9rem}
  .sched input,.sched select{font:inherit;padding:.75em .9em;border-radius:12px;border:1px solid color-mix(in srgb,var(--text) 18%,transparent);background:var(--bg);color:var(--text)}
  .sched .btn-lg{justify-content:center;margin-top:.4rem}
  .info-grid{display:grid;gap:2rem;align-items:start}
  .info-list{list-style:none;display:grid;gap:1.3rem;margin-top:1.6rem}
  .info-list li{display:flex;gap:.9rem}
  .info-list li>svg{color:var(--accent);width:1.5em;height:1.5em;margin-top:.15em}
  .info-list p{color:var(--muted)}
  .link{color:var(--accent);font-weight:700;text-decoration:none}
  .map{border-radius:var(--radius);overflow:hidden;min-height:300px;border:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
  .map iframe{width:100%;height:100%;min-height:300px;border:0}
  .chips{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem;margin-top:1.6rem}
  .chips li{background:var(--surface);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);padding:.55em 1.1em;border-radius:999px;font-weight:600}
  .pix{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.7rem;margin-top:1.6rem;background:var(--surface);padding:.8rem 1rem;border-radius:16px}
  .pix code{font-size:1rem;word-break:break-all}
  .contact{text-align:center}
  .socials{display:flex;justify-content:center;gap:.8rem;margin-top:1.6rem}
  .social{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid color-mix(in srgb,var(--text) 12%,transparent);transition:background .15s,color .15s}
  .social:hover{background:var(--accent);color:var(--on-accent)}
  footer{padding:2rem 0;text-align:center;color:var(--muted);font-size:.85rem;border-top:1px solid color-mix(in srgb,var(--text) 8%,transparent)}
  .wa-float{position:fixed;right:18px;bottom:18px;z-index:30;width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#25d366;color:#fff;box-shadow:0 12px 30px -8px rgba(0,0,0,.45);animation:pulse 2.4s infinite}
  .wa-float svg{width:32px;height:32px}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,.5)}50%{box-shadow:0 0 0 14px rgba(37,211,102,0)}}
  @media (min-width:860px){.nav-links{display:flex}.hero{padding:6rem 0 5rem}.hero-grid{grid-template-columns:1.1fr .9fr}.info-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<header>
  <div class="wrap nav">
    <a class="brand" href="#">${name}</a>
    <nav class="nav-links">${nav}</nav>
    ${waGeneral ? `<a class="btn btn-sm" href="${safeUrl(waGeneral)}" target="_blank" rel="noopener">${ICONS.whatsapp}WhatsApp</a>` : ""}
  </div>
</header>
<main>
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <span class="eyebrow">${niche}</span>
        <h1>${name}<span>.</span></h1>
        <p class="lead">${esc(t.tagline)}</p>
        <div class="actions">
          ${waGeneral ? `<a class="btn" href="${safeUrl(waGeneral)}" target="_blank" rel="noopener">${ICONS.whatsapp}${esc(t.cta)}</a>` : ""}
          <a class="btn btn-ghost" href="#catalogo">Ver ${esc(t.catalogTitle.toLowerCase())}</a>
        </div>
        ${highlights ? `<ul class="highlights">${highlights}</ul>` : ""}
      </div>
      <div class="hero-img">${firstImage ? `<img src="${IMAGE_SCHEME}${esc(firstImage)}" alt="${name}">` : ""}</div>
    </div>
  </section>

  <section id="catalogo" class="section">
    <div class="wrap">
      <div class="center">
        <span class="eyebrow">Nossos destaques</span>
        <h2>${esc(t.catalogTitle)}</h2>
      </div>
      <div class="grid">${productCards}</div>
    </div>
  </section>
${schedulingSection}
${infoSection}
${paymentSection}
  <section id="contato" class="section contact">
    <div class="wrap center">
      <span class="eyebrow">Contato</span>
      <h2>Vamos conversar?</h2>
      <p class="lead">Siga ${name} nas redes sociais${waGeneral ? " ou chame no WhatsApp" : ""}.</p>
      ${waGeneral ? `<a class="btn btn-lg" href="${safeUrl(waGeneral)}" target="_blank" rel="noopener">${ICONS.whatsapp}Chamar no WhatsApp</a>` : ""}
      <div class="socials">${socialLinks}</div>
    </div>
  </section>
</main>
<footer><div class="wrap">© ${year} ${name}. Todos os direitos reservados.</div></footer>
${waGeneral ? `<a class="wa-float" href="${safeUrl(waGeneral)}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ICONS.whatsapp}</a>` : ""}
<script>
(function(){
  var f=document.getElementById('sched-form');
  if(f){f.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(f);
    var dt=String(d.get('data')||'').split('-').reverse().join('/');
    var msg='Olá! Gostaria de agendar.\\nNome: '+d.get('nome')+'\\nServiço: '+d.get('servico')+'\\nData: '+dt+'\\nHorário: '+d.get('hora');
    window.open('https://wa.me/${wa ?? ""}?text='+encodeURIComponent(msg),'_blank');});}
  var b=document.getElementById('pix-copy');
  if(b){b.addEventListener('click',function(){var k=document.getElementById('pix-key').textContent;
    navigator.clipboard&&navigator.clipboard.writeText(k).then(function(){b.textContent='Copiado!';setTimeout(function(){b.textContent='Copiar'},2000)});});}
})();
</script>
</body>
</html>
`;
}
