import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@supabase/supabase-js", async (original) => ({
  ...(await original<typeof import("@supabase/supabase-js")>()),
  createClient: () => ({ functions: { invoke: mocks.invoke } }),
}));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
});
afterEach(() => vi.unstubAllEnvs());
it("explains that identity verification is not enabled", async () => {
  mocks.invoke.mockResolvedValue({
    data: null,
    error: new FunctionsHttpError(
      new Response(JSON.stringify({ error: "provider_not_configured" }), {
        status: 503,
      }),
    ),
  });
  const { invoke } = await import("./lib/client");
  await expect(invoke("identity-session", { action: "start" })).rejects.toThrow(
    "Identity verification is not enabled yet.",
  );
});
it("does not expose arbitrary provider error details", async () => {
  mocks.invoke.mockResolvedValue({
    data: null,
    error: new FunctionsHttpError(
      new Response(JSON.stringify({ error: "private-provider-detail" }), {
        status: 502,
      }),
    ),
  });
  const { invoke } = await import("./lib/client");
  await expect(invoke("identity-session", { action: "start" })).rejects.toThrow(
    "The service could not complete your request.",
  );
});
it("explains an expired or invalid session", async () => {
  mocks.invoke.mockResolvedValue({
    data: null,
    error: new FunctionsHttpError(new Response("{}", { status: 401 })),
  });
  const { invoke } = await import("./lib/client");
  await expect(
    invoke("identity-session", { action: "status" }),
  ).rejects.toThrow("Sign out and sign in again.");
});
