import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Globe, Search, ServerCrash, Star } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/sitefinder";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SiteFinder" },
      { name: "description", content: "Indicadores das suas pesquisas e leads no SiteFinder." },
      { property: "og:title", content: "Dashboard — SiteFinder" },
      { property: "og:description", content: "Indicadores de empresas encontradas, sem site e sites fora do ar." },
    ],
  }),
  component: Dashboard,
});

interface Stats {
  total: number;
  sem_site: number;
  fora_do_ar: number;
  funcionando: number;
  verificar: number;
  favoritos: number;
  buscas: number;
  por_segmento: Array<{ segmento: string; total: number; oportunidades: number }>;
  por_dia: Array<{ dia: string; total: number }>;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
};

function Dashboard() {
  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      await supabase.rpc("purge_stale_leads");
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  const recent = useQuery({
    queryKey: ["dashboard", "recent-searches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("searches").select("*").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const s = stats.data;
  const kpis = [
    { label: "Empresas encontradas", value: s?.total, icon: Building2, tone: "text-primary-glow" },
    { label: "Empresas sem site", value: s?.sem_site, icon: Globe, tone: "text-status-none" },
    { label: "Sites fora do ar", value: s?.fora_do_ar, icon: ServerCrash, tone: "text-status-down" },
    { label: "Sites funcionando", value: s?.funcionando, icon: CheckCircle2, tone: "text-status-ok" },
    { label: "Leads salvos", value: s?.favoritos, icon: Star, tone: "text-primary-glow" },
  ];

  const pieData = s
    ? [
        { name: "Sem site", value: s.sem_site, color: "var(--status-none)" },
        { name: "Fora do ar", value: s.fora_do_ar, color: "var(--status-down)" },
        { name: "Funcionando", value: s.funcionando, color: "var(--status-ok)" },
        { name: "Verificar", value: s.verificar, color: "var(--status-check)" },
      ].filter((d) => d.value > 0)
    : [];

  const days = buildLastDays(s?.por_dia ?? []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral das empresas encontradas e das oportunidades de venda."
        actions={
          <Button asChild variant="hero">
            <Link to="/buscar">
              <Search /> Nova pesquisa
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="surface p-4 md:p-5">
            <k.icon className={`h-5 w-5 ${k.tone}`} />
            <div className="mt-3 font-display text-2xl font-bold md:text-3xl">
              {stats.isLoading ? <Skeleton className="h-8 w-16" /> : (k.value ?? 0).toLocaleString("pt-BR")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground md:text-sm">{k.label}</div>
          </div>
        ))}
      </div>

      {s && s.total === 0 ? (
        <div className="surface mt-6 flex flex-col items-center p-10 text-center">
          <Search className="h-10 w-10 text-primary-glow" />
          <h2 className="mt-4 text-xl font-semibold">Faça sua primeira pesquisa</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Escolha uma cidade e os segmentos de interesse para encontrar empresas reais no Google Maps.
          </p>
          <Button asChild variant="hero" className="mt-5">
            <Link to="/buscar">Encontrar empresas</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="surface p-5">
            <h2 className="text-base font-semibold">Situação dos sites</h2>
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="surface p-5 lg:col-span-2">
            <h2 className="text-base font-semibold">Oportunidades por segmento</h2>
            <p className="text-xs text-muted-foreground">Oportunidades = sem site + site fora do ar</p>
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s?.por_segmento ?? []} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="segmento" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={0} angle={-15} height={50} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name="Empresas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="oportunidades" name="Oportunidades" fill="var(--status-none)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="surface p-5 lg:col-span-2">
            <h2 className="text-base font-semibold">Empresas encontradas nos últimos 14 dias</h2>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days} margin={{ left: -20 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total" name="Empresas" stroke="var(--primary-glow)" fill="url(#areaFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Pesquisas recentes</h2>
              <Link to="/historico" className="text-xs text-primary-glow hover:underline">
                Ver todas
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {(recent.data ?? []).map((r) => (
                <li key={r.id} className="rounded-lg border bg-muted/30 p-3">
                  <p className="line-clamp-1 text-sm font-medium">{r.segments.join(", ")}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {[r.neighborhood, r.city, r.state, r.postal_code].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.results_count} empresas · {formatDateTime(r.created_at)}
                  </p>
                </li>
              ))}
              {recent.data && !recent.data.length && <li className="text-sm text-muted-foreground">Nenhuma pesquisa ainda.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function buildLastDays(rows: Array<{ dia: string; total: number }>) {
  const map = new Map(rows.map((r) => [r.dia, r.total]));
  const out: Array<{ label: string; total: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total: map.get(key) ?? 0 });
  }
  return out;
}
