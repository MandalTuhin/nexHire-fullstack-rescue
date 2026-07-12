import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';
import { TraineeRecord } from './trainee-progress.service';
import { ApplicationBulkActionResult } from '../models/application.model';

export type ProjectStatus = 'ACTIVE' | 'FILLED' | 'INACTIVE';

export interface RmgProject {
  id: number;
  name: string;
  description?: string;
  client?: string;
  technology?: string;
  locationId?: number;
  locationName?: string;
  totalVacancies: number;
  allocatedCount: number;
  remainingVacancies: number;
  status: ProjectStatus;
  createdAt?: string;
}

export interface ProjectUpsertPayload {
  name: string;
  description?: string;
  client?: string;
  technology?: string;
  locationId?: number;
  totalVacancies?: number;
  status?: ProjectStatus;
}

export interface ProjectAssignmentResult {
  id: number;
  traineeId: number;
  projectId: number;
  projectName: string;
  technology?: string;
  locationName?: string;
  projectStatus?: ProjectStatus;
  candidateName: string;
  candidateEmail: string;
  assignedByName: string;
  assignedAt: string;
}

/** Candidate-facing shape — same wire response, aliased for clarity at call sites. */
export type MyProjectAssignment = ProjectAssignmentResult;

/**
 * Backend-aligned RMG project + allocation service (real nexHIRE API).
 * Distinct from the legacy mock ProjectService.
 */
@Injectable({ providedIn: 'root' })
export class ProjectRmgService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** ADMIN + RMG: list all projects. */
  getProjects(): Observable<RmgProject[]> {
    return this.http.get<RmgProject[]>(API_ENDPOINTS.PROJECTS.BASE);
  }

  /** Back-compat alias used by the RMG allocation screen. */
  getActiveProjects(): Observable<RmgProject[]> {
    return this.getProjects();
  }

  /** ADMIN: create a project. */
  createProject(payload: ProjectUpsertPayload): Observable<RmgProject> {
    return this.http.post<RmgProject>(API_ENDPOINTS.PROJECTS.CREATE, payload);
  }

  /** ADMIN: update a project's details / status. */
  updateProject(
    id: number,
    payload: ProjectUpsertPayload,
  ): Observable<RmgProject> {
    return this.http.put<RmgProject>(
      API_ENDPOINTS.PROJECTS.UPDATE(id),
      payload,
    );
  }

  /** ADMIN: delete a project. */
  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.PROJECTS.BY_ID(id));
  }

  getEligibleTrainees(): Observable<TraineeRecord[]> {
    return this.http.get<TraineeRecord[]>(
      API_ENDPOINTS.PROJECTS.ELIGIBLE_TRAINEES,
    );
  }

  assign(
    projectId: number,
    traineeId: number,
  ): Observable<ProjectAssignmentResult> {
    return this.http.post<ProjectAssignmentResult>(
      API_ENDPOINTS.PROJECTS.ASSIGN(projectId, traineeId),
      {},
    );
  }

  /** RMG: bulk-assign multiple selected trainees to a single project. */
  bulkAssign(
    projectId: number,
    traineeIds: number[],
  ): Observable<ApplicationBulkActionResult> {
    return this.http.post<ApplicationBulkActionResult>(
      API_ENDPOINTS.PROJECTS.BULK_ASSIGN(projectId),
      traineeIds,
    );
  }

  /** EMPLOYEE: the logged-in candidate's own project assignment (null until RMG assigns one). */
  getMyProject(): Observable<MyProjectAssignment | null> {
    return this.http.get<MyProjectAssignment | null>(API_ENDPOINTS.PROJECTS.MY);
  }
}
