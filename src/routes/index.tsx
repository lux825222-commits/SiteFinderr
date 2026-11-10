import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Globe2, SearchCheck, ServerCrash, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, LOGO_URL } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SiteFinder — Encontre empresas que precisam de um site" },
      {
        name: "description",
        content:
          "Encontre empresas do Google Maps sem site, com site fora do ar ou desatualizado. Prospecção comercial para agências de criação de sites.",
      },
      { property: "og:title", content: "SiteFinder — Prospecção para agências de sites" },
      {
        property: "og:description",
        content: "Busque por cidade, bairro, CEP e segmento e descubra quem precisa de um site profissional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: SearchCheck, title: "Busca no Google Maps", text: "Cidade, estado, bairro, CEP e vários segmentos de uma vez." },
  { icon: ServerCrash, title: "Verificação de sites", text: "Detecta sites fora do ar com novas tentativas antes de concluir." },
  { icon: Globe2, title: "Leads prontos", text: "Favoritos, histórico e exportação em CSV e Excel." },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo withText />
        <Button asChild variant="soft" size="sm">
          <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Abrir painel" : "Entrar"}</Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-2 md:pt-16">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" /> Prospecção para agências de sites
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Encontre empresas que <span className="text-gradient">precisam de um site.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            O SiteFinder busca empresas no Google Maps e verifica se elas têm site, se ele está no ar e se parece
            desatualizado — e entrega uma lista pronta de potenciais clientes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to={signedIn ? "/dashboard" : "/auth"}>
                {signedIn ? "Ir para o painel" : "Acessar plataforma"} <ArrowRight />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Acesso exclusivo para clientes com login.</p>
        </section>
        <div className="flex justify-center">
          <img src={LOGO_URL} alt="SiteFinder" className="animate-glow w-64 rounded-full md:w-96" />
        </div>
      </main>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-4 px-5 pb-20 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="surface p-5">
            <f.icon className="h-6 w-6 text-primary-glow" />
            <h2 className="mt-3 text-lg font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
