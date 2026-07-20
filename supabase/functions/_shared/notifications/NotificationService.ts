import { createClient } from "npm:@supabase/supabase-js";
import { VerpexProvider } from "./providers/VerpexProvider.ts";
import type { EmailProvider } from "./providers/EmailProvider.ts";
import type {
  NotificationProviderName,
  NotificationSendPayload,
  NotificationSendResult,
  NotificationStatus
} from "./types.ts";

type SupabaseAdminClient = ReturnType<typeof createClient>;

type QueueRow = {
  id?: string | null;
};

type NotificationSendOptions = {
  adminClient?: SupabaseAdminClient;
};

const DEFAULT_PROVIDER: NotificationProviderName = "verpex_smtp";

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || "unknown_error");
}

function createAdminClient(): SupabaseAdminClient | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[Notification] missing_admin_secrets", {
      supabaseUrl: Boolean(supabaseUrl),
      serviceRoleKey: Boolean(serviceRoleKey),
      timestamp: new Date().toISOString()
    });

    return null;
  }

  try {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error("[Notification] create_admin_client_failed", error);
    return null;
  }
}

function resolveProvider(provider: NotificationProviderName): EmailProvider | null {
  if (provider === "verpex_smtp") {
    return new VerpexProvider();
  }

  console.error("[Provider] unsupported_notification_provider", {
    provider,
    timestamp: new Date().toISOString()
  });

  return null;
}

async function insertLog(
  adminClient: SupabaseAdminClient,
  payload: NotificationSendPayload,
  params: {
    queueId: string | null;
    provider: NotificationProviderName;
    status: string;
    error?: string | null;
  }
) {
  const { error } = await adminClient
    .from("notification_logs")
    .insert([{
      queue_id: params.queueId,
      empresa_id: payload.empresaId ?? null,
      provider: params.provider,
      type: payload.type,
      recipient: payload.recipient,
      subject: payload.subject,
      status: params.status,
      error: params.error || null,
      metadata: payload.metadata || {},
      created_at: new Date().toISOString()
    }]);

  if (error) {
    console.error("[Notification][Logs] insert_failed", {
      provider: params.provider,
      recipient: payload.recipient,
      subject: payload.subject,
      status: params.status,
      error,
      timestamp: new Date().toISOString()
    });
  }
}

async function updateQueueStatus(
  adminClient: SupabaseAdminClient,
  queueId: string,
  status: NotificationStatus,
  error: string | null
) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
    error,
    attempts: 1
  };

  if (status === "sent") {
    patch.sent_at = now;
  }

  if (status === "failed") {
    patch.failed_at = now;
  }

  const { error: updateError } = await adminClient
    .from("notification_queue")
    .update(patch)
    .eq("id", queueId);

  if (updateError) {
    console.error("[Queue] update_failed", {
      queueId,
      status,
      error: updateError,
      timestamp: now
    });
  }
}

export class NotificationService {
  static async send(
    payload: NotificationSendPayload,
    options: NotificationSendOptions = {}
  ): Promise<NotificationSendResult> {
    console.log("[Notification] START");
    console.log(
      "SUPABASE_URL",
      Boolean(Deno.env.get("SUPABASE_URL"))
    );
    console.log(
      "SERVICE_ROLE",
      Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
    );
    console.log(
      "SMTP_HOST",
      Boolean(Deno.env.get("SMTP_HOST"))
    );

    const providerName = payload.provider || DEFAULT_PROVIDER;
    let queueId: string | null = null;

    try {
      console.log("[Notification] BEFORE ADMIN");
      const adminClient = options.adminClient || createAdminClient();

      if (!adminClient) {
        const message = "missing_admin_client";
        console.error("[Notification] ERROR", message);

        return {
          ok: false,
          queueId,
          provider: providerName,
          error: message
        };
      }

      console.log("[Notification] AFTER ADMIN");
      const now = new Date().toISOString();

      console.log("[Notification] send_requested", {
        provider: providerName,
        type: payload.type,
        recipient: payload.recipient,
        subject: payload.subject,
        empresaId: payload.empresaId ?? null,
        timestamp: now
      });

      console.log("[Notification] BEFORE QUEUE");
      const { data: queueRow, error: queueError } = await adminClient
        .from("notification_queue")
        .insert([{
          empresa_id: payload.empresaId ?? null,
          provider: providerName,
          type: payload.type,
          recipient: payload.recipient,
          subject: payload.subject,
          html_body: payload.html,
          text_body: payload.text || null,
          metadata: payload.metadata || {},
          status: "pending",
          attempts: 0,
          created_at: now,
          updated_at: now
        }])
        .select("id")
        .maybeSingle<QueueRow>();
      console.log("[Notification] AFTER QUEUE", {
        hasQueueRow: Boolean(queueRow?.id),
        hasQueueError: Boolean(queueError),
        queueError: queueError ? errorMessage(queueError) : null
      });

      if (queueError) {
        const message = errorMessage(queueError);
        console.error("[Queue] insert_failed", {
          provider: providerName,
          type: payload.type,
          recipient: payload.recipient,
          subject: payload.subject,
          error: message,
          timestamp: now
        });

        await insertLog(adminClient, payload, {
          queueId: null,
          provider: providerName,
          status: "queue_insert_failed",
          error: message
        });

        return {
          ok: false,
          queueId: null,
          provider: providerName,
          error: message
        };
      }

      queueId = queueRow?.id || null;
      console.log("[Queue] pending", {
        queueId,
        provider: providerName,
        recipient: payload.recipient,
        subject: payload.subject,
        timestamp: now
      });

      await insertLog(adminClient, payload, {
        queueId,
        provider: providerName,
        status: "pending"
      });

      try {
        console.log("[Notification] BEFORE PROVIDER");
        const provider = resolveProvider(providerName);

        if (!provider) {
          throw new Error(`unsupported_notification_provider:${providerName}`);
        }

        await provider.send({
          to: payload.recipient,
          subject: payload.subject,
          html: payload.html,
          text: payload.text
        });
        console.log("[Notification] AFTER PROVIDER");

        if (queueId) {
          await updateQueueStatus(adminClient, queueId, "sent", null);
        }

        await insertLog(adminClient, payload, {
          queueId,
          provider: providerName,
          status: "sent"
        });

        console.log("[Notification] sent", {
          queueId,
          provider: providerName,
          recipient: payload.recipient,
          subject: payload.subject,
          timestamp: new Date().toISOString()
        });

        return {
          ok: true,
          queueId,
          provider: providerName
        };
      } catch (error) {
        const message = errorMessage(error);

        if (queueId) {
          await updateQueueStatus(adminClient, queueId, "failed", message);
        }

        await insertLog(adminClient, payload, {
          queueId,
          provider: providerName,
          status: "failed",
          error: message
        });

        console.error("[Notification] failed", {
          queueId,
          provider: providerName,
          recipient: payload.recipient,
          subject: payload.subject,
          error: message,
          timestamp: new Date().toISOString()
        });

        return {
          ok: false,
          queueId,
          provider: providerName,
          error: message
        };
      }
    } catch (error) {
      const message = errorMessage(error);
      console.error("[Notification] ERROR", error);
      console.error("[Notification] unexpected_failure", {
        queueId,
        provider: providerName,
        recipient: payload.recipient,
        subject: payload.subject,
        error: message,
        timestamp: new Date().toISOString()
      });

      return {
        ok: false,
        queueId,
        provider: providerName,
        error: message
      };
    }
  }
}
