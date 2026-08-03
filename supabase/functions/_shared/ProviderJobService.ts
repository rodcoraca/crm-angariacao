import { createClient } from "npm:@supabase/supabase-js";

type SupabaseAdminClient = ReturnType<typeof createClient>;

export interface JobProgress {
  processed?: number;
  total?: number;
  imported?: number;
  updated?: number;
  ignored?: number;
  errors?: number;
}

export class ProviderJobService {
  static async createJob(
    client: SupabaseAdminClient,
    { provider, empresaId }: { provider: string; empresaId: string }
  ): Promise<string | null> {
    const { data, error } = await client
      .from("provider_sync_jobs")
      .insert({
        empresa_id: empresaId,
        provider,
        status: "running",
        started_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ProviderJobService] createJob failed", error.message);
      return null;
    }
    return (data as { id: string }).id;
  }

  static async updateJob(
    client: SupabaseAdminClient,
    jobId: string,
    progress: JobProgress
  ): Promise<void> {
    const { error } = await client
      .from("provider_sync_jobs")
      .update({ progress, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    if (error) {
      console.error("[ProviderJobService] updateJob failed", error.message);
    }
  }

  static async completeJob(
    client: SupabaseAdminClient,
    jobId: string,
    result: Record<string, unknown>
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await client
      .from("provider_sync_jobs")
      .update({ status: "completed", finished_at: now, result, updated_at: now })
      .eq("id", jobId);

    if (error) {
      console.error("[ProviderJobService] completeJob failed", error.message);
    }
  }

  static async failJob(
    client: SupabaseAdminClient,
    jobId: string,
    errorMessage: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await client
      .from("provider_sync_jobs")
      .update({ status: "failed", finished_at: now, error_message: errorMessage, updated_at: now })
      .eq("id", jobId);

    if (error) {
      console.error("[ProviderJobService] failJob failed", error.message);
    }
  }

  static async cancelJob(
    client: SupabaseAdminClient,
    jobId: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await client
      .from("provider_sync_jobs")
      .update({ status: "cancelled", finished_at: now, updated_at: now })
      .eq("id", jobId);

    if (error) {
      console.error("[ProviderJobService] cancelJob failed", error.message);
    }
  }

  static async getJob(
    client: SupabaseAdminClient,
    jobId: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await client
      .from("provider_sync_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      console.error("[ProviderJobService] getJob failed", error.message);
      return null;
    }
    return data as Record<string, unknown> | null;
  }

  static async getRunningJob(
    client: SupabaseAdminClient,
    { provider, empresaId }: { provider: string; empresaId: string }
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await client
      .from("provider_sync_jobs")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("provider", provider)
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[ProviderJobService] getRunningJob failed", error.message);
      return null;
    }
    return data as Record<string, unknown> | null;
  }
}
