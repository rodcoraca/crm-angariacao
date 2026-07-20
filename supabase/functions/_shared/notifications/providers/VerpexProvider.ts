import type { EmailProvider } from "./EmailProvider.ts";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

type SmtpConnection = {
  conn: Deno.Conn;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getRequiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim() || "";
  if (!value) {
    throw new Error(`missing_secret:${name}`);
  }

  return value;
}

function loadConfig(): SmtpConfig {
  const host = getRequiredSecret("SMTP_HOST");
  const portValue = getRequiredSecret("SMTP_PORT");
  const user = getRequiredSecret("SMTP_USER");
  const password = getRequiredSecret("SMTP_PASSWORD");
  const from = getRequiredSecret("SMTP_FROM");
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("invalid_secret:SMTP_PORT");
  }

  return {
    host,
    port,
    user,
    password,
    from
  };
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function base64Encode(value: string) {
  const bytes = encoder.encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function encodeHeader(value: string) {
  const sanitized = sanitizeHeader(value);
  if (/^[\x20-\x7e]*$/.test(sanitized)) {
    return sanitized;
  }

  return `=?UTF-8?B?${base64Encode(sanitized)}?=`;
}

function extractAddress(value: string) {
  const sanitized = sanitizeHeader(value);
  const match = sanitized.match(/<([^>]+)>/);
  return (match?.[1] || sanitized).trim();
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r?\n/g, "\r\n");
}

function dotStuff(value: string) {
  return normalizeLineEndings(value)
    .split("\r\n")
    .map((line) => line.startsWith(".") ? `.${line}` : line)
    .join("\r\n");
}

async function writeLine(connection: SmtpConnection, line: string) {
  await connection.writer.write(encoder.encode(`${line}\r\n`));
}

async function readResponse(connection: SmtpConnection) {
  let buffer = "";

  for (;;) {
    const { value, done } = await connection.reader.read();
    if (done) {
      throw new Error("smtp_connection_closed");
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\r\n").filter(Boolean);
    const lastLine = lines[lines.length - 1] || "";

    if (/^\d{3}\s/.test(lastLine)) {
      return {
        code: Number(lastLine.slice(0, 3)),
        message: lines.join("\n")
      };
    }
  }
}

async function command(
  connection: SmtpConnection,
  line: string,
  expectedCodes: number[]
) {
  await writeLine(connection, line);
  const response = await readResponse(connection);

  if (!expectedCodes.includes(response.code)) {
    throw new Error(`smtp_unexpected_response:${line}:${response.code}:${response.message}`);
  }

  return response;
}

function buildMimeMessage(config: SmtpConfig, payload: Parameters<EmailProvider["send"]>[0]) {
  const boundary = `osflow-${crypto.randomUUID()}`;
  const text = payload.text || payload.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return [
    `From: ${sanitizeHeader(config.from)}`,
    `To: ${sanitizeHeader(payload.to)}`,
    `Subject: ${encodeHeader(payload.subject)}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    payload.html,
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

async function openConnection(config: SmtpConfig): Promise<SmtpConnection> {
  if (config.port === 465) {
    const conn = await Deno.connectTls({
      hostname: config.host,
      port: config.port
    });

    return {
      conn,
      reader: conn.readable.getReader(),
      writer: conn.writable.getWriter()
    };
  }

  const conn = await Deno.connect({
    hostname: config.host,
    port: config.port
  });

  return {
    conn,
    reader: conn.readable.getReader(),
    writer: conn.writable.getWriter()
  };
}

async function upgradeStartTls(
  connection: SmtpConnection,
  config: SmtpConfig
): Promise<SmtpConnection> {
  const denoRuntime = Deno as unknown as {
    startTls?: (conn: Deno.Conn, options: { hostname: string }) => Promise<Deno.Conn>;
  };

  if (!denoRuntime.startTls) {
    throw new Error("smtp_starttls_not_supported_by_runtime");
  }

  connection.reader.releaseLock();
  connection.writer.releaseLock();

  const tlsConn = await denoRuntime.startTls(connection.conn, {
    hostname: config.host
  });

  return {
    conn: tlsConn,
    reader: tlsConn.readable.getReader(),
    writer: tlsConn.writable.getWriter()
  };
}

export class VerpexProvider implements EmailProvider {
  async send(payload: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const config = loadConfig();
    let connection = await openConnection(config);

    console.log("[SMTP] connection_open", {
      provider: "verpex_smtp",
      host: config.host,
      port: config.port,
      recipient: payload.to,
      subject: payload.subject,
      timestamp: new Date().toISOString()
    });

    try {
      await readResponse(connection);
      await command(connection, `EHLO ${config.host}`, [250]);

      if (config.port !== 465) {
        await command(connection, "STARTTLS", [220]);
        connection = await upgradeStartTls(connection, config);
        await command(connection, `EHLO ${config.host}`, [250]);
      }

      await command(connection, `AUTH PLAIN ${base64Encode(`\u0000${config.user}\u0000${config.password}`)}`, [235]);
      await command(connection, `MAIL FROM:<${extractAddress(config.from)}>`, [250]);
      await command(connection, `RCPT TO:<${extractAddress(payload.to)}>`, [250, 251]);
      await command(connection, "DATA", [354]);
      await connection.writer.write(encoder.encode(`${dotStuff(buildMimeMessage(config, payload))}\r\n.\r\n`));

      const dataResponse = await readResponse(connection);
      if (dataResponse.code !== 250) {
        throw new Error(`smtp_data_rejected:${dataResponse.code}:${dataResponse.message}`);
      }

      await command(connection, "QUIT", [221]);
      console.log("[SMTP] send_success", {
        provider: "verpex_smtp",
        recipient: payload.to,
        subject: payload.subject,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("[SMTP] send_failed", {
        provider: "verpex_smtp",
        recipient: payload.to,
        subject: payload.subject,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      try {
        connection.reader.releaseLock();
        connection.writer.releaseLock();
        connection.conn.close();
      } catch (_error) {
        // Connection may already be closed by the SMTP server.
      }
    }
  }
}
