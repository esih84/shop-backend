import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Redis اختیاری است؛ برای فعال‌سازی REDIS_ENABLED=true را تنظیم کنید.
  // در حالت خاموش، cache روی حافظه‌ی محلی کار می‌کند و صف‌ها غیرفعال‌اند.
  enabled: process.env.REDIS_ENABLED === 'true',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
}));
