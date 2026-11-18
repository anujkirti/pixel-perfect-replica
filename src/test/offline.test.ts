import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerOffline } from "@/lib/offline";
describe("offline preview safety", () => {
  beforeEach(() => vi.unstubAllGlobals());
  it("unregisters only the app worker and never warms documents in development", async () => {
    const unregister = vi.fn();
    const messaging = vi.fn();
    const register = vi.fn();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        getRegistrations: async () => [
          { active: { scriptURL: "http://localhost/sw.js" }, unregister },
          {
            active: { scriptURL: "http://localhost/firebase-messaging-sw.js" },
            unregister: messaging,
          },
        ],
      },
    });
    await registerOffline();
    expect(register).not.toHaveBeenCalled();
    expect(unregister).toHaveBeenCalledOnce();
    expect(messaging).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
