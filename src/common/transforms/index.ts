/**
 * ترنسفورم‌های مشترک برای DTOها (مخصوصاً حالت multipart/form-data که همه‌ی
 * مقادیر به‌صورت رشته می‌رسند). با دکوراتور @Transform از class-transformer
 * استفاده می‌شوند:  `@Transform(toNumber)`.
 */

type TransformArg = { value: unknown };

/**
 * رشته‌ی خالی را به undefined تبدیل می‌کند تا در ویرایش جزئی (PartialType)
 * فیلدِ خالی نادیده گرفته شود و مقدار قبلی حفظ گردد، نه اینکه به
 * @IsNotEmpty/@IsUUID و... بخورد.
 */
export const emptyToUndefined = ({ value }: TransformArg) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** تبدیل رشته‌ی فرم به boolean؛ مقدار خالی → undefined */
export const toBoolean = ({ value }: TransformArg) =>
  value === "" || value === undefined || value === null
    ? undefined
    : value === "true" || value === true
      ? true
      : value === "false" || value === false
        ? false
        : value;

/** تبدیل رشته‌ی فرم به number؛ مقدار خالی → undefined */
export const toNumber = ({ value }: TransformArg) =>
  typeof value === "string"
    ? value.trim() === ""
      ? undefined
      : Number(value)
    : value;

/**
 * در حالت multipart آرایه‌ها به‌صورت رشته‌ی JSON می‌آیند؛ این تابع آن‌ها را
 * parse می‌کند. رشته‌ی خالی → undefined و JSON نامعتبر بدون کرش به اعتبارسنجی
 * سپرده می‌شود.
 */
export const parseJsonArray = ({ value }: TransformArg) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

/**
 * رشته‌ی CSV مثل `"a,b,c"` را (که از query params می‌آید) به آرایه تبدیل می‌کند.
 * خالی → undefined؛ آرایه دست‌نخورده برمی‌گردد (اگر پارامتر تکراری داده شده باشد).
 */
export const parseCsv = ({ value }: TransformArg) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};
