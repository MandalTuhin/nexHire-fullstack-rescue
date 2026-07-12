import { HttpContextToken } from '@angular/common/http';

/**
 * Set on a request's HttpContext to opt it out of the global "resource not found" toast for a
 * 404 response. Used for optional per-user lookups (e.g. "do I have a trainee record yet?")
 * where a 404 is an expected, already-handled empty state rather than a real error.
 */
export const SUPPRESS_404_TOAST = new HttpContextToken<boolean>(() => false);
