import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  encryptCredentials,
  type StoredBrokerCredentials,
} from "../_shared/credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StoreCredentialsRequest {
  trading_account_id: string;
  credentials: StoredBrokerCredentials;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { trading_account_id, credentials }: StoreCredentialsRequest =
      await req.json();

    if (
      !trading_account_id ||
      !credentials?.account_id ||
      !credentials?.password
    ) {
      return new Response(
        JSON.stringify({
          error:
            "trading_account_id, credentials.account_id, and credentials.password are required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const encryptionKey = Deno.env.get("CREDENTIAL_ENCRYPTION_KEY") ?? "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: account, error: accountError } = await serviceClient
      .from("trading_accounts")
      .select("id, user_id")
      .eq("id", trading_account_id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: "Trading account not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (account.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const encrypted = await encryptCredentials(credentials, encryptionKey);

    const { data: existingCredential } = await serviceClient
      .from("account_credentials")
      .select("id")
      .eq("account_id", trading_account_id)
      .maybeSingle();

    const query = existingCredential
      ? serviceClient
          .from("account_credentials")
          .update({ encrypted_data: encrypted, updated_at: new Date().toISOString() })
          .eq("id", existingCredential.id)
      : serviceClient.from("account_credentials").insert({
          account_id: trading_account_id,
          encrypted_data: encrypted,
        });

    const { error: writeError } = await query;

    if (writeError) {
      throw writeError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to store credentials",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
