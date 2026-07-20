type OsflowLayoutPayload = {
  preheader?: string;
  title: string;
  children: string;
};

const OSFLOW_PRIMARY = "#0d2c4d";
const OSFLOW_BACKGROUND = "#f5f7fa";
const OSFLOW_WEBSITE = "https://osflow.pt";
const OSFLOW_EMAIL = "comercial@osflow.pt";
const OSFLOW_HEADLINE = "Menos tempo a gerir.<br />Mais tempo a vender.";

export function buildOsflowEmailLayout({
  preheader = "OSFlow",
  title,
  children
}: OsflowLayoutPayload) {
  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>${title}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .osflow-card { width: 100% !important; border-radius: 0 !important; }
        .osflow-content { padding: 28px 22px !important; }
        .osflow-header { padding: 30px 22px !important; }
        .osflow-button { width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:${OSFLOW_BACKGROUND}; font-family:Arial, Helvetica, sans-serif; color:#172033; -webkit-text-size-adjust:100%; text-size-adjust:100%;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; line-height:1px; font-size:1px;">
      ${preheader}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:${OSFLOW_BACKGROUND}; margin:0; padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" class="osflow-card" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e6edf3; box-shadow:0 18px 42px rgba(13,44,77,0.12);">
            <tr>
              <td class="osflow-header" align="center" style="background:${OSFLOW_PRIMARY}; padding:36px 34px 32px;">
                <div style="font-size:28px; line-height:1; font-weight:700; letter-spacing:0.02em; color:#ffffff; text-align:center;">
                  OSFlow
                </div>
                <div style="width:42px; height:3px; background:#ffffff; opacity:0.5; border-radius:999px; margin:16px auto 14px;"></div>
                <div style="font-size:16px; line-height:1.45; font-weight:600; color:#e8f2f7; text-align:center;">
                  ${OSFLOW_HEADLINE}
                </div>
              </td>
            </tr>
            <tr>
              <td class="osflow-content" style="padding:38px 42px 34px; background:#ffffff;">
                ${children}
              </td>
            </tr>
            <tr>
              <td style="padding:28px 42px 34px; background:#f8fafc; border-top:1px solid #e6edf3; text-align:center;">
                <p style="margin:0 0 8px; font-size:15px; line-height:1.6; font-weight:700; color:${OSFLOW_PRIMARY};">Equipa OSFlow</p>
                <p style="margin:0 0 16px; font-size:14px; line-height:1.55; color:#526173; font-weight:600;">Menos tempo a gerir.<br />Mais tempo a vender.</p>
                <p style="margin:0 0 14px; font-size:13px; line-height:1.6; color:#526173;">
                  <a href="mailto:${OSFLOW_EMAIL}" style="color:${OSFLOW_PRIMARY}; text-decoration:none;">${OSFLOW_EMAIL}</a><br />
                  <a href="${OSFLOW_WEBSITE}" style="color:${OSFLOW_PRIMARY}; text-decoration:none;">www.osflow.pt</a>
                </p>
                <p style="margin:0; font-size:12px; line-height:1.5; color:#7b8794;">&copy; OSFlow</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
