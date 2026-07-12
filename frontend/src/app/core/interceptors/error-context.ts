import { HttpContextToken } from '@angular/common/http';

/**
 * Set on a request's HttpContext to opt it out of the global "resource not found" toast for a
 * 404 response. Used for optional per-user lookups (e.g. "do I have a trainee record yet?")
 * where a 404 is an expected, already-handled empty state rather than a real error.
 */
export const SUPPRESS_404_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Set on a request's HttpContext to opt it out of the global error toast entirely, for any
 * status code. Used for optional/background requests (silent polling, best-effort lookups)
 * where the caller already handles the failure itself or a failure is safe to ignore silently.
 */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
