import { serve } from "https://deno.land/std/http/server.ts";

serve(async () => {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Provider Scheduler OK",
      executedAt: new Date().toISOString()
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
});