import { fileURLToPath } from 'node:url';
export const cfg = {
  port: +process.env.PORT || 3000,
  dbFile: process.env.DB_FILE || fileURLToPath(new URL('../data.sqlite', import.meta.url)),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  // dev = đăng nhập bằng email (chỉ để thử); oidc = SSO thật
  authMode: process.env.AUTH_MODE || 'dev',
  oidc: {
    issuer: process.env.OIDC_ISSUER, clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
  },
  adminEmails: (process.env.ADMIN_EMAILS || 'admin@example.com').split(',').map(s => s.trim().toLowerCase()),
  // AI: nếu có khóa thì dùng Claude để tóm tắt/phân loại/hỏi đáp, nếu không dùng bộ quy tắc nội bộ
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'claude-sonnet-5-5',
  collectEveryHours: +process.env.COLLECT_EVERY_HOURS || 24,
  alertThreshold: +process.env.ALERT_THRESHOLD || 60,
  digestHour: +process.env.DIGEST_HOUR || 8,
  smtp: { host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 465,
    user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.SMTP_FROM || 'intel@localhost' },
};
