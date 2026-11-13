CREATE TABLE public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  html text NOT NULL DEFAULT '',
  previous_html text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO service_role;

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pages" ON public.site_pages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pages" ON public.site_pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pages" ON public.site_pages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own pages" ON public.site_pages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX site_pages_user_updated_idx ON public.site_pages (user_id, updated_at DESC);

CREATE TRIGGER site_pages_updated_at BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();