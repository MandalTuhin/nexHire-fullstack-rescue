import { HttpContextToken } from '@angular/common/http';

/**
 * Set on a request's HttpContext to opt it out of the global full-viewport loader overlay.
 * Used for silent background polling (e.g. notification unread-count) that shouldn't flash
 * the whole app's loading state every time it fires.
 */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);
