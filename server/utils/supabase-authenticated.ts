import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const getAuthenticatedClient = (headers: Headers) => {
  const authHeader = headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) return supabase;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
};
