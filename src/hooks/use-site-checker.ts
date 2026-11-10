import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { checkSites } from "@/lib/leads.functions";
import type { Lead } from "@/lib/leads-client";

const BATCH = 3;
const CONCURRENCY = 2;

/** Runs website checks in small server batches and reports each updated lead. */
export function useSiteChecker(onUpdate: (lead: Lead) => void) {
  const check = useServerFn(checkSites);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const run = useCallback(
    async (ids: string[]) => {
      const unique = Array.from(new Set(ids));
      if (!unique.length) return;
      setCheckingIds((prev) => new Set([...prev, ...unique]));
      setProgress((p) => ({ done: p.total === p.done ? 0 : p.done, total: (p.total === p.done ? 0 : p.total) + unique.length }));

      const batches: string[][] = [];
      for (let i = 0; i < unique.length; i += BATCH) batches.push(unique.slice(i, i + BATCH));
      let failed = 0;

      const worker = async () => {
        while (batches.length) {
          const batch = batches.shift()!;
          try {
            const res = await check({ data: { leadIds: batch } });
            res.leads.forEach((l) => onUpdateRef.current(l));
          } catch (e) {
            console.error(e);
            failed += batch.length;
          } finally {
            setCheckingIds((prev) => {
              const next = new Set(prev);
              batch.forEach((id) => next.delete(id));
              return next;
            });
            setProgress((p) => ({ ...p, done: p.done + batch.length }));
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (failed) toast.error(`${failed} site(s) não puderam ser verificados agora. Tente reverificar.`);
    },
    [check],
  );

  return { run, checkingIds, progress, isChecking: checkingIds.size > 0 };
}
