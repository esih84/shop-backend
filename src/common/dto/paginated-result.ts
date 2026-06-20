/**
 * قرارداد واحد پاسخ لیست‌های صفحه‌بندی‌شده در کل API.
 * همه‌ی اندپوینت‌های لیستی باید این شکل را برگردانند تا فرانت یکدست مصرف کند:
 *   { data: T[], total, page, limit, totalPages }
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginated<T>(
  data: T[],
  total: number,
  page = 1,
  limit = 20,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
  };
}
