import { describe, expect, it } from "vitest";
import { accountEmail, matchesInitialCredential, parseClientNumber } from "@/lib/accounts";
import { classifyAttempts, isSafePublicUrl, type AttemptResult } from "@/lib/site-status";
import { leadsToCsv } from "@/lib/export";
import { matchesStatusFilter } from "@/lib/sitefinder";

describe("client accounts @Cliente1…@Cliente300", () => {
  it("accepts @Cliente1 with password @Cliente1", () => {
    expect(matchesInitialCredential("@Cliente1", "@Cliente1")).toBe(1);
  });
  it("accepts @Cliente300 with password @Cliente300", () => {
    expect(matchesInitialCredential("@Cliente300", "@Cliente300")).toBe(300);
  });
  it("rejects @Cliente301 and @Cliente0", () => {
    expect(parseClientNumber("@Cliente301")).toBeNull();
    expect(parseClientNumber("@Cliente0")).toBeNull();
  });
  it("rejects a wrong password", () => {
    expect(matchesInitialCredential("@Cliente5", "@Cliente6")).toBeNull();
    expect(matchesInitialCredential("@Cliente5", "@cliente5")).toBeNull();
  });
  it("maps each login to its own account", () => {
    expect(accountEmail(42)).not.toBe(accountEmail(43));
  });
});

const fail = (status: number): AttemptResult => ({ kind: "response", status, finalUrl: "https://x.com" });
const dns: AttemptResult = { kind: "error", error: "dns" };
const timeout: AttemptResult = { kind: "error", error: "timeout" };

describe("site classification", () => {
  it("is funcionando when a response is 200", () => {
    expect(classifyAttempts([fail(200)]).status).toBe("funcionando");
  });
  it("is NOT fora do ar after a single failure", () => {
    expect(classifyAttempts([dns]).status).toBe("verificar");
    expect(classifyAttempts([fail(503), fail(503)]).status).toBe("verificar");
  });
  it("is fora do ar after 3 hard failures", () => {
    expect(classifyAttempts([dns, dns, dns]).status).toBe("fora_do_ar");
    expect(classifyAttempts([fail(502), fail(503), fail(500)]).status).toBe("fora_do_ar");
  });
  it("is verificar for timeouts or blocked access", () => {
    expect(classifyAttempts([timeout, timeout, timeout]).status).toBe("verificar");
    expect(classifyAttempts([fail(403)]).status).toBe("verificar");
  });
  it("recovers to funcionando if a retry succeeds", () => {
    expect(classifyAttempts([dns, fail(200)]).status).toBe("funcionando");
  });
  it("blocks private network targets", () => {
    expect(isSafePublicUrl("http://127.0.0.1")).toBe(false);
    expect(isSafePublicUrl("http://192.168.0.10")).toBe(false);
    expect(isSafePublicUrl("http://localhost:8080")).toBe(false);
    expect(isSafePublicUrl("https://exemplo.com.br")).toBe(true);
  });
});

describe("filters and export", () => {
  it("'Verificar' filter includes pending checks", () => {
    expect(matchesStatusFilter("pendente", "verificar")).toBe(true);
    expect(matchesStatusFilter("sem_site", "verificar")).toBe(false);
  });
  it("CSV includes name, category, city, phone, address, site and status", () => {
    const csv = leadsToCsv([
      {
        name: "Barbearia; Top",
        category: "Barbearia",
        city: "São Paulo",
        phone: "(11) 9999-0000",
        address: "Rua A, 1",
        website: null,
        site_status: "sem_site",
        last_checked_at: null,
        maps_url: null,
      },
    ]);
    const [header, row] = csv.replace("\uFEFF", "").split("\r\n");
    expect(header).toBe("Nome;Categoria;Cidade;Telefone;Endereço;Site;Situação do site;Última verificação;Google Maps");
    expect(row).toBe('"Barbearia; Top";Barbearia;São Paulo;(11) 9999-0000;Rua A, 1;;Sem site;;');
  });
});
