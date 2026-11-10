-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Searches history
CREATE TABLE public.searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  segments text[] NOT NULL DEFAULT '{}',
  city text,
  state text,
  neighborhood text,
  postal_code text,
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.searches TO authenticated;
GRANT ALL ON public.searches TO service_role;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own searches" ON public.searches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own searches" ON public.searches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own searches" ON public.searches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own searches" ON public.searches FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX searches_user_created_idx ON public.searches (user_id, created_at DESC);

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id text NOT NULL,
  search_id uuid REFERENCES public.searches(id) ON DELETE SET NULL,
  segment text,
  name text NOT NULL,
  category text,
  address text,
  city text,
  state text,
  phone text,
  maps_url text,
  website text,
  site_status text NOT NULL DEFAULT 'pendente' CHECK (site_status IN ('funcionando','fora_do_ar','sem_site','verificar','pendente')),
  http_status integer,
  site_notes text,
  check_attempts integer NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  is_favorite boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own leads" ON public.leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leads" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own leads" ON public.leads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX leads_user_status_idx ON public.leads (user_id, site_status);
CREATE INDEX leads_user_fav_idx ON public.leads (user_id, is_favorite);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profile auto-creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dashboard stats (runs as the caller, RLS applies)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT json_build_object(
    'total', (SELECT count(*) FROM public.leads WHERE user_id = auth.uid()),
    'sem_site', (SELECT count(*) FROM public.leads WHERE user_id = auth.uid() AND site_status = 'sem_site'),
    'fora_do_ar', (SELECT count(*) FROM public.leads WHERE user_id = auth.uid() AND site_status = 'fora_do_ar'),
    'funcionando', (SELECT count(*) FROM public.leads WHERE user_id = auth.uid() AND site_status = 'funcionando'),
    'verificar', (SELECT count(*) FROM public.leads WHERE user_id = auth.uid() AND site_status IN ('verificar','pendente')),
    'favoritos', (SELECT count(*) FROM public.leads WHERE user_id = auth.uid() AND is_favorite),
    'buscas', (SELECT count(*) FROM public.searches WHERE user_id = auth.uid()),
    'por_segmento', COALESCE((
      SELECT json_agg(s ORDER BY s.total DESC) FROM (
        SELECT COALESCE(segment, 'Outros') AS segmento,
               count(*) AS total,
               count(*) FILTER (WHERE site_status IN ('sem_site','fora_do_ar')) AS oportunidades
        FROM public.leads WHERE user_id = auth.uid()
        GROUP BY COALESCE(segment, 'Outros')
        ORDER BY count(*) DESC LIMIT 10
      ) s
    ), '[]'::json),
    'por_dia', COALESCE((
      SELECT json_agg(d ORDER BY d.dia) FROM (
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS dia, count(*) AS total
        FROM public.leads
        WHERE user_id = auth.uid() AND created_at > now() - interval '14 days'
        GROUP BY date_trunc('day', created_at)
      ) d
    ), '[]'::json)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;

-- Google Maps Platform content caching limit: remove non-favorite cached lead data older than 30 days
CREATE OR REPLACE FUNCTION public.purge_stale_leads()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE removed integer;
BEGIN
  DELETE FROM public.leads
  WHERE user_id = auth.uid() AND is_favorite = false AND fetched_at < now() - interval '30 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
GRANT EXECUTE ON FUNCTION public.purge_stale_leads() TO authenticated;