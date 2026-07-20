export type NotificationStatus = "pending" | "sent" | "failed";

export type NotificationProviderName = "verpex_smtp" | string;

export type NotificationMetadata = Record<string, unknown>;

export type NotificationSendPayload = {
  empresaId?: string | null;
  type: string;
  recipient: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: NotificationMetadata;
  provider?: NotificationProviderName;
};

export type NotificationSendResult = {
  ok: boolean;
  queueId: string | null;
  provider: NotificationProviderName;
  error?: string;
};
