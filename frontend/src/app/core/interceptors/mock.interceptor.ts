// ─── Mock HTTP Interceptor for API Simulation ────────────────────────────────

import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  InMemoryDataStore,
  EntityType,
  PagedResponse,
} from '../mocks/in-memory-data-store';
import { environment } from '../../../environments/environment';

/**
 * Mock HTTP Interceptor
 * Intercepts HTTP requests and returns simulated responses when mock mode is enabled
 * Provides realistic API simulation with latency, pagination, and state management
 */
@Injectable()
export class MockInterceptor implements HttpInterceptor {
  private dataStore: InMemoryDataStore;

  /**
   * URL path prefixes that are served by the REAL nexHIRE backend.
   * Requests matching these always pass through, even while mock mode is on
   * for the remaining (not-yet-implemented) modules.
   */
  private static readonly REAL_BACKEND_PREFIXES: string[] = [
    '/api/auth',
    '/api/jobs',
    '/api/applications',
    '/api/assessments',
    '/api/offers',
    '/api/joining-letters',
    '/api/locations',
    '/api/bgv',
    '/api/training',
    '/api/projects',
    '/api/assets',
    '/api/users',
    '/api/roles',
    '/api/activity-logs',
    '/api/dashboard',
    '/api/notifications',
  ];

  constructor() {
    this.dataStore = new InMemoryDataStore();
  }

  /**
   * Intercept HTTP requests
   */
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // Pass through to real backend if mock mode is disabled
    if (!environment.useMockData) {
      return next.handle(req);
    }

    // Pass through requests handled by the real backend
    if (this.isRealBackendRequest(req.url)) {
      return next.handle(req);
    }

    // Handle mock request for everything else
    return this.handleMockRequest(req).pipe(delay(this.randomDelay(100, 500)));
  }

  /**
   * Determine if a request targets a real backend endpoint.
   */
  private isRealBackendRequest(url: string): boolean {
    const path = url.replace(environment.apiBaseUrl, '');
    return MockInterceptor.REAL_BACKEND_PREFIXES.some((prefix) =>
      path.startsWith(prefix),
    );
  }

  /**
   * Handle mock request based on method and URL
   */
  private handleMockRequest(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    try {
      const { method, url, body } = req;

      // Parse URL to extract entity type, ID, and query params
      const urlParts = this.parseUrl(url);

      // Route to appropriate handler based on HTTP method
      switch (method) {
        case 'GET':
          return this.handleGet(urlParts, req);
        case 'POST':
          return this.handlePost(urlParts, body);
        case 'PUT':
          return this.handlePut(urlParts, body);
        case 'DELETE':
          return this.handleDelete(urlParts);
        default:
          return this.createErrorResponse(405, 'Method not allowed');
      }
    } catch (error) {
      console.error('Mock interceptor error:', error);
      return this.createErrorResponse(500, 'Internal server error');
    }
  }

  /**
   * Handle GET requests
   */
  private handleGet(
    urlParts: UrlParts,
    req: HttpRequest<any>,
  ): Observable<HttpEvent<any>> {
    const { entityType, id, queryParams } = urlParts;

    if (!entityType) {
      return this.createErrorResponse(404, 'Endpoint not found');
    }

    // Get single entity by ID
    if (id) {
      const entity = this.dataStore.get(entityType, id);
      if (!entity) {
        return this.createErrorResponse(
          404,
          `${entityType} with id ${id} not found`,
        );
      }
      return this.createSuccessResponse({ data: entity }, 200);
    }

    // Get list with pagination and filtering
    const page = parseInt(queryParams.get('page') || '1', 10);
    const pageSize = parseInt(queryParams.get('pageSize') || '10', 10);
    const sortBy = queryParams.get('sortBy');
    const sortOrder = queryParams.get('sortOrder') || 'asc';

    // Apply filters from query params
    let data = this.dataStore.getAll(entityType);

    // Apply dynamic filters based on query params
    data = this.applyFilters(data, queryParams);

    // Apply sorting
    if (sortBy) {
      data = this.applySorting(data, sortBy, sortOrder);
    }

    // Calculate pagination
    const total = data.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    const response: PagedResponse<any> = {
      data: paginatedData,
      total,
      page,
      pageSize,
    };

    return this.createSuccessResponse(response, 200);
  }

  /**
   * Handle POST requests
   */
  private handlePost(
    urlParts: UrlParts,
    body: any,
  ): Observable<HttpEvent<any>> {
    const { entityType } = urlParts;

    if (!entityType) {
      return this.createErrorResponse(404, 'Endpoint not found');
    }

    // Create new entity
    const newEntity = this.dataStore.create(entityType, body);

    return this.createSuccessResponse({ data: newEntity }, 201);
  }

  /**
   * Handle PUT requests
   */
  private handlePut(urlParts: UrlParts, body: any): Observable<HttpEvent<any>> {
    const { entityType, id } = urlParts;

    if (!entityType || !id) {
      return this.createErrorResponse(
        400,
        'Invalid request: entity type and ID required',
      );
    }

    // Update existing entity
    const updatedEntity = this.dataStore.update(entityType, id, body);

    if (!updatedEntity) {
      return this.createErrorResponse(
        404,
        `${entityType} with id ${id} not found`,
      );
    }

    return this.createSuccessResponse({ data: updatedEntity }, 200);
  }

  /**
   * Handle DELETE requests
   */
  private handleDelete(urlParts: UrlParts): Observable<HttpEvent<any>> {
    const { entityType, id } = urlParts;

    if (!entityType || !id) {
      return this.createErrorResponse(
        400,
        'Invalid request: entity type and ID required',
      );
    }

    // Delete entity
    const deleted = this.dataStore.delete(entityType, id);

    if (!deleted) {
      return this.createErrorResponse(
        404,
        `${entityType} with id ${id} not found`,
      );
    }

    return this.createSuccessResponse(null, 204);
  }

  /**
   * Parse URL to extract entity type, ID, and query params
   */
  private parseUrl(url: string): UrlParts {
    // Remove base URL if present
    const cleanUrl = url.replace(environment.apiBaseUrl, '');

    // Split URL and query string
    const [path, queryString] = cleanUrl.split('?');

    // Parse path segments
    const segments = path.split('/').filter((s) => s.length > 0);

    // Map URL segments to entity types
    const entityTypeMap: Record<string, EntityType> = {
      jobs: EntityType.JOBS,
      applications: EntityType.APPLICATIONS,
      assessments: EntityType.ASSESSMENTS,
      offers: EntityType.OFFERS,
      employees: EntityType.EMPLOYEES,
      trainees: EntityType.TRAINEES,
      assets: EntityType.ASSETS,
      'asset-assignments': EntityType.ASSET_ASSIGNMENTS,
      projects: EntityType.PROJECTS,
      'project-allocations': EntityType.PROJECT_ALLOCATIONS,
      'released-candidates': EntityType.RELEASED_CANDIDATES,
      roles: EntityType.ROLES,
      permissions: EntityType.PERMISSIONS,
      cities: EntityType.CITIES,
      branches: EntityType.BRANCHES,
      blocks: EntityType.BLOCKS,
      budgets: EntityType.BUDGETS,
      'selected-candidates': EntityType.SELECTED_CANDIDATES,
    };

    let entityType: EntityType | null = null;
    let id: number | null = null;

    // Extract entity type and ID from segments
    if (segments.length >= 2 && entityTypeMap[segments[1]]) {
      entityType = entityTypeMap[segments[1]];

      // Check if next segment is a numeric ID
      if (segments.length >= 3 && !isNaN(Number(segments[2]))) {
        id = Number(segments[2]);
      }
    }

    // Parse query parameters
    const queryParams = new URLSearchParams(queryString || '');

    return { entityType, id, queryParams };
  }

  /**
   * Apply filters to data based on query parameters
   */
  private applyFilters(data: any[], queryParams: URLSearchParams): any[] {
    let filtered = [...data];

    // Iterate through all query params and apply filters
    queryParams.forEach((value, key) => {
      // Skip pagination and sorting params
      if (['page', 'pageSize', 'sortBy', 'sortOrder'].includes(key)) {
        return;
      }

      // Apply filter based on param
      filtered = filtered.filter((item) => {
        const itemValue = this.getNestedProperty(item, key);

        if (itemValue === undefined || itemValue === null) {
          return false;
        }

        // Case-insensitive string matching
        if (typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase());
        }

        // Exact match for other types
        return itemValue.toString() === value;
      });
    });

    return filtered;
  }

  /**
   * Apply sorting to data
   */
  private applySorting(data: any[], sortBy: string, sortOrder: string): any[] {
    const sorted = [...data];

    sorted.sort((a, b) => {
      const aValue = this.getNestedProperty(a, sortBy);
      const bValue = this.getNestedProperty(b, sortBy);

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      // Apply sort order
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Get nested property value from object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Generate random delay between min and max milliseconds
   */
  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create success response
   */
  private createSuccessResponse(
    body: any,
    status: number,
  ): Observable<HttpEvent<any>> {
    return of(
      new HttpResponse({
        status,
        body,
      }),
    );
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    status: number,
    message: string,
  ): Observable<HttpEvent<any>> {
    return throwError(
      () =>
        new HttpErrorResponse({
          error: { message },
          status,
          statusText: this.getStatusText(status),
        }),
    );
  }

  /**
   * Get status text for HTTP status code
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      404: 'Not Found',
      405: 'Method Not Allowed',
      500: 'Internal Server Error',
    };
    return statusTexts[status] || 'Unknown';
  }
}

/**
 * URL parsing result
 */
interface UrlParts {
  entityType: EntityType | null;
  id: number | null;
  queryParams: URLSearchParams;
}
