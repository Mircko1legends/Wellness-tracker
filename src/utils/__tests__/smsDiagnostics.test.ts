import { lastSmsStatus, smsProblems, SmsDiagnosticsInput } from "../lens";

const ok: SmsDiagnosticsInput = {
  smsPermission: true,
  smsAppOpAllowed: true,
  phoneStatePermission: true,
  defaultSmsSubscription: 1,
  activeSims: 1,
  lastSmsQueuedAt: 0,
  lastSmsResultAt: 0,
  lastSmsResultCode: 0,
  lastSmsDeliveredAt: 0,
  lastSmsError: "",
};

describe("SMS diagnostics", () => {
  it("finds nothing wrong on a healthy phone", () => {
    expect(smsProblems(ok)).toEqual([]);
    expect(lastSmsStatus(ok, 1000)).toBeNull();
  });

  it("explains a blocked permission and a missing default SIM", () => {
    const p = smsProblems({ ...ok, smsAppOpAllowed: false, defaultSmsSubscription: -1, phoneStatePermission: false });
    expect(p).toHaveLength(2);
    expect(p[0].fix).toContain("restrizioni");
  });

  it("follows the SMS from queued to delivered", () => {
    const queued = { ...ok, lastSmsQueuedAt: 1000 };
    expect(lastSmsStatus(queued, 2000)).toBe("In invio…");
    expect(lastSmsStatus(queued, 120_000)).toContain("mai confermato");
    expect(lastSmsStatus({ ...queued, lastSmsResultCode: 1 }, 2000)).toContain("errore generico");
    expect(lastSmsStatus({ ...queued, lastSmsResultCode: -1 }, 2000)).toContain("Inviato dal tuo telefono");
    expect(lastSmsStatus({ ...queued, lastSmsResultCode: -1, lastSmsDeliveredAt: 1500 }, 2000)).toContain("consegnato");
  });
});
