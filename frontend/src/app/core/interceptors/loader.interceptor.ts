import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { LoaderService } from '../../shared/services/loader.service';
import { SKIP_LOADER } from './loader-context';

/**
 * LoaderInterceptor: Shows/hides the global loading spinner for every HTTP request.
 * Tracks concurrent requests to avoid hiding loader prematurely. Requests marked with
 * SKIP_LOADER (e.g. silent background polling) never touch the counter or the overlay.
 */
@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  constructor(private loaderService: LoaderService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.context.get(SKIP_LOADER)) {
      return next.handle(req);
    }

    this.activeRequests++;
    this.loaderService.show();

    return next.handle(req).pipe(
      finalize(() => {
        this.activeRequests--;
        if (this.activeRequests === 0) {
          this.loaderService.hide();
        }
      })
    );
  }
}
