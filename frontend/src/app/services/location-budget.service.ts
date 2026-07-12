import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocationName } from '../models/location-budget.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class LocationBudgetService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Candidate/HR: minimal id/name/city list for the Location Preferences and Joining Batch
   *  wizard dropdowns. City budget CRUD lives in CityAdminService. */
  getNames(): Observable<LocationName[]> {
    return this.http.get<LocationName[]>(API_ENDPOINTS.LOCATIONS.NAMES);
  }
}
