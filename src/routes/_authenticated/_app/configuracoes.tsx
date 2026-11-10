import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Database, Loader2, MapPinned, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { IntegrationSetup } from "@/components/IntegrationSetup";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { getIntegrationStatus } from "@/lib/leads.functions";
import { CACHE_DAYS } from "@/lib/sitefinder";

export const Route = createFileRoute("/_authenticated/_app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — SiteFinder" },
      { name: "description", content: "Conta, senha e integrações do SiteFinder." },
      { property: "og:title", content: "Configurações — SiteFinder" },
      { property: "og:description", content: "Gerencie sua conta e integrações." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const integration = useServerFn(getIntegrationStatus);
  const status = useQuery({ queryKey: ["integration-status"], queryFn: () => integration() });

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name ?? "");
  }, [profile]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const value = displayName.trim().slice(0, 60);
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: value || null }).eq("id", profile.id);
    setSavingName(false);
    if (error) { toast.error("Não foi possível salvar."); return; }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Nome atualizado");
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) { toast.error("A nova senha precisa ter ao menos 8 caracteres."); return; }
    if (next !== confirm) { toast.error("As senhas não conferem."); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as never);
    setSavingPw(false);
    if (error) { toast.error("Não foi possível alterar a senha. Confira a senha atual."); return; }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Senha alterada com sucesso");
  }

  const mapsOk = status.data?.googleMaps;

  return (
    <div>
      <PageHeader title="Configurações" description="Sua conta, segurança e integrações." />
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveName} className="surface space-y-4 p-5">
          <h2 className="text-lg font-semibold">Conta</h2>
          <div className="space-y-2">
            <Label>Login</Label>
            <Input value={profile?.username ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dn">Nome de exibição</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} placeholder="Ex.: Agência Pixel" />
          </div>
          <Button type="submit" variant="hero" disabled={savingName}>
            {savingName && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </form>

        <form onSubmit={savePassword} className="surface space-y-4 p-5">
          <h2 className="text-lg font-semibold">Alterar senha</h2>
          <div className="space-y-2">
            <Label htmlFor="cur">Senha atual</Label>
            <Input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new">Nova senha</Label>
              <Input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">Confirmar</Label>
              <Input id="conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" variant="hero" disabled={savingPw}>
            {savingPw && <Loader2 className="animate-spin" />} Alterar senha
          </Button>
        </form>

        <div className="surface space-y-3 p-5">
          <h2 className="text-lg font-semibold">Integrações</h2>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <span className="flex items-center gap-2 text-sm">
              <MapPinned className="h-4 w-4 text-primary-glow" /> Google Maps Places API
            </span>
            {status.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mapsOk ? (
              <span className="flex items-center gap-1 text-sm text-status-ok">
                <CheckCircle2 className="h-4 w-4" /> Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-status-down">
                <XCircle className="h-4 w-4" /> Não configurado
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <span className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-primary-glow" /> Banco de dados e login
            </span>
            <span className="flex items-center gap-1 text-sm text-status-ok">
              <CheckCircle2 className="h-4 w-4" /> Ativo
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <span className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary-glow" /> Verificação HTTP de sites
            </span>
            <span className="flex items-center gap-1 text-sm text-status-ok">
              <CheckCircle2 className="h-4 w-4" /> Ativo
            </span>
          </div>
        </div>

        <div className="surface space-y-3 p-5 text-sm">
          <h2 className="text-lg font-semibold">Uso e políticas do Google Maps</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Os dados vêm exclusivamente da Google Maps Places API oficial — nenhuma empresa é inventada.</li>
            <li>
              Informações das empresas ficam armazenadas por até {CACHE_DAYS} dias. Após esse prazo, leads não favoritos são removidos e
              favoritos podem ser atualizados com um clique.
            </li>
            <li>Cada pesquisa consome cota da sua conta do Google Maps Platform. Limite de 5 segmentos por pesquisa.</li>
            <li>Um site só é marcado como "fora do ar" após 3 tentativas com falha; respostas inconclusivas ficam como "Verificar".</li>
          </ul>
        </div>
      </div>

      {status.data && !mapsOk && (
        <div className="mt-6">
          <IntegrationSetup />
        </div>
      )}
    </div>
  );
}
