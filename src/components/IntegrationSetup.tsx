import { KeyRound, MapPinned, ShieldCheck } from "lucide-react";

export function IntegrationSetup() {
  return (
    <div className="surface p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary-glow">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Configure a integração com o Google Maps</h2>
          <p className="text-sm text-muted-foreground">
            A busca de empresas usa a Google Maps Places API oficial. Sem ela, nenhuma empresa pode ser encontrada.
          </p>
        </div>
      </div>
      <ol className="mt-6 space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
          <div>
            <p className="font-medium">Abra os Conectores no editor do Lovable</p>
            <p className="text-muted-foreground">Menu do projeto → Conectores → Google Maps Platform.</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
          <div>
            <p className="font-medium">Escolha "Gerenciado pelo Lovable" ou use sua própria chave</p>
            <p className="text-muted-foreground">
              Com chave própria, crie um projeto no Google Cloud com faturamento ativo, habilite a{" "}
              <strong>Places API (New)</strong> e gere uma chave de API de servidor.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
          <div>
            <p className="font-medium">Vincule a conexão a este projeto e recarregue a página</p>
            <p className="text-muted-foreground">A chave fica guardada no servidor e nunca é exposta no navegador.</p>
          </div>
        </li>
      </ol>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-status-ok" /> Chaves protegidas no backend.
        </div>
        <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <MapPinned className="h-4 w-4 shrink-0 text-primary-glow" /> Cada pesquisa consome cota do Google Maps.
        </div>
      </div>
    </div>
  );
}
