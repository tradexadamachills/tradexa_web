import { createClient, FunctionsHttpError } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          storage: sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
export async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!supabase)
    throw new Error(
      "The live service is not configured yet. Please try again later.",
    );
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = "The service could not complete your request. Please retry.";
    if (
      error instanceof FunctionsHttpError &&
      error.context instanceof Response
    ) {
      const payload = await error.context
        .clone()
        .json()
        .catch(() => null);
      if (
        name === "identity-session" &&
        payload?.error === "provider_not_configured"
      ) {
        message =
          "Identity verification is not enabled yet. Please contact Tradexa support.";
      } else if (error.context.status === 401) {
        message =
          "Your session could not be verified. Sign out and sign in again.";
      } else if (
        error.context.status >= 400 &&
        error.context.status < 500 &&
        typeof payload?.message === "string"
      ) {
        message = payload.message; // clear, user-facing reason from the server
      }
    }
    throw new Error(message);
  }
  return data as T;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please retry.";
}
