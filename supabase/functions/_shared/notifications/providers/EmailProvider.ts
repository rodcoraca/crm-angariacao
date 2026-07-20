export interface EmailProvider {
  send(payload: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}
