import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGO_URL } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { accountEmail, parseClientNumber } from "@/lib/accounts";
import { provisionClientAccount } from "@/lib/auth.functions";

function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value, "http://x");
    if (value.startsWith("//")) return undefined;
    const path = url.pathname + url.search;
    return path.startsWith("/") && path !== "/auth" ? path : undefined;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: safeRedirect(search['redirect']),
  }),
  head: () => ({
    meta: [
      { title: "Entrar — SiteFinder" },
      { name: "description", content: "Acesse sua conta SiteFinder para encontrar empresas que precisam de site." },
      { property: "og:title", content: "Entrar — SiteFinder" },
      { property: "og:description", content: "Área exclusiva para clientes SiteFinder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const provision = useServerFn(provisionClientAccount);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = () =>
    redirect ? navigate({ href: redirect, replace: true }) : navigate({ to: "/dashboard", replace: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = parseClientNumber(username);
    if (n === null || !password) {
      setError("Login ou senha incorretos.");
      return;
    }
    setLoading(true);
    try {
      const email = accountEmail(n);
      let { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // First access: create the predefined account, then sign in.
        const res = await provision({ data: { username, password } });
        if (res.ok) {
          ({ error: signInError } = await supabase.auth.signInWithPassword({ email, password }));
        }
      }
      if (signInError) {
        setError("Login ou senha incorretos.");
        return;
      }
      goNext();
    } catch (err) {
      console.error(err);
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero px-4 py-10">
      <div className="grid-bg absolute inset-0 opacity-50" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={LOGO_URL} alt="SiteFinder" className="animate-glow h-36 w-36 rounded-full" />
          <h1 className="mt-4 text-2xl font-bold">Bem-vindo ao SiteFinder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre com o login e a senha fornecidos.</p>
        </div>
        <form onSubmit={onSubmit} className="surface space-y-5 p-6 md:p-8">
          <div className="space-y-2">
            <Label htmlFor="username">Login</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                autoComplete="username"
                placeholder="@Cliente1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-9 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
