import type { CookieOptions, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 دقیقه
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 روز

function baseOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    // در پروداکشن اگر فرانت و بک روی دامنه‌های متفاوت باشند به 'none' نیاز است
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
}

/** کوکی‌های توکن را روی پاسخ ست می‌کند. */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: REFRESH_MAX_AGE,
  });
}

/** کوکی‌های توکن را پاک می‌کند (logout). */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseOptions());
}
