import { registerAs } from "@nestjs/config";

export default registerAs("aws", () => ({
  region: process.env.AWS_REGION || "default",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  s3BucketImages: process.env.AWS_S3_BUCKET_IMAGES || "",
  // پوشه‌ی پایه داخل باکت (prefix) — همه‌ی کلیدها زیر این مسیر قرار می‌گیرند
  s3Prefix: process.env.AWS_S3_PREFIX || "",
  endpoint: process.env.AWS_S3_ENDPOINT || "",
}));
