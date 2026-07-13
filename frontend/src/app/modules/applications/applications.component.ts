import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ApplicationService } from '../../services/application.service';
import { ToastService } from '../../shared/services/toast.service';
import { TableColumn, SortEvent } from '../../shared/components/data-table/data-table.component';
import {
  Application,
  ApplicationFilterRequest,
  SmartFilter,
} from '../../models/application.model';

/** DataTableComponent requires rows to carry an `id`; Application uses `applicationId`. */
interface ApplicationRow extends Application {
  id: number;
}

@Component({
  selector: 'app-applications-mgmt',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss'],
  standalone: false,
})
export class ApplicationsManagementComponent implements OnInit, AfterViewInit {
  @ViewChild('candidateCell') candidateCellTpl!: TemplateRef<any>;
  @ViewChild('statusCell') statusCellTpl!: TemplateRef<any>;
  @ViewChild('dateCell') dateCellTpl!: TemplateRef<any>;
  @ViewChild('bgcCell') bgcCellTpl!: TemplateRef<any>;

  columns: TableColumn[] = [];

  rows: ApplicationRow[] = [];
  totalRecords = 0;
  loading = false;

  page = 0;
  size = 25;
  sortBy = 'appliedAt';
  sortDir: 'asc' | 'desc' = 'desc';

  // Primary filters
  search = '';
  smartFilter: SmartFilter | '' = '';

  // Secondary ("more filters") — collapsed by default
  showMoreFilters = false;
  locationPreference = '';
  qualification = '';
  scoreMin: number | null = null;
  scoreMax: number | null = null;
  bgcStatus = '';
  profileCompleted: boolean | null = null;

  exporting = false;

  readonly smartFilterOptions: { value: SmartFilter; label: string }[] = [
    { value: 'ELIGIBLE_FOR_ASSESSMENT', label: 'Applied — Eligible for Assessment' },
    { value: 'ASSESSMENT_ASSIGNED', label: 'Assessment Assigned' },
    { value: 'ASSESSMENT_PASSED', label: 'Assessment Passed' },
    { value: 'OFFER_ACCEPTED', label: 'Offer Accepted' },
    { value: 'ELIGIBLE_FOR_BGC', label: 'Eligible for Background Check' },
    { value: 'BGC_CLEARED', label: 'Background Check Cleared' },
    { value: 'ELIGIBLE_FOR_BATCH', label: 'Eligible for Joining Batch' },
  ];

  constructor(
    private appService: ApplicationService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.columns = [
      { field: 'candidate', label: 'Candidate', sortable: true, cellTemplate: this.candidateCellTpl },
      { field: 'passoutYear', label: 'Passout Year', sortable: false },
      { field: 'status', label: 'Status', sortable: false, cellTemplate: this.statusCellTpl },
      { field: 'bgvStatus', label: 'Background Check', sortable: false, cellTemplate: this.bgcCellTpl },
      { field: 'appliedDate', label: 'Applied', sortable: true, cellTemplate: this.dateCellTpl },
    ];
  }

  load(): void {
    this.loading = true;
    this.appService.search(this.buildFilter()).subscribe({
      next: (page) => {
        this.rows = page.content.map((a) => ({ ...a, id: a.applicationId }));
        this.totalRecords = page.totalElements;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private buildFilter(): ApplicationFilterRequest {
    return {
      search: this.search || undefined,
      smartFilter: this.smartFilter || undefined,
      locationPreference: this.locationPreference || undefined,
      qualification: this.qualification || undefined,
      scoreMin: this.scoreMin ?? undefined,
      scoreMax: this.scoreMax ?? undefined,
      bgcStatus: this.bgcStatus || undefined,
      profileCompleted: this.profileCompleted ?? undefined,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      page: this.page,
      size: this.size,
    };
  }

  onSearchChange(): void {
    this.page = 0;
    this.load();
  }

  onSmartFilterChange(): void {
    // A smart filter overlays/replaces the manual status multi-select on the backend.
    this.page = 0;
    this.load();
  }

  onFilterChange(): void {
    this.page = 0;
    this.load();
  }

  clearFilters(): void {
    this.search = '';
    this.smartFilter = '';
    this.locationPreference = '';
    this.qualification = '';
    this.scoreMin = null;
    this.scoreMax = null;
    this.bgcStatus = '';
    this.profileCompleted = null;
    this.page = 0;
    this.load();
  }

  onSort(event: SortEvent): void {
    if (!event.direction) {
      this.sortBy = 'appliedAt';
      this.sortDir = 'desc';
    } else {
      this.sortBy = event.column === 'candidate' ? 'candidateName' : event.column;
      this.sortDir = event.direction;
    }
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.load();
  }

  exportToExcel(): void {
    this.exporting = true;
    this.appService.exportExcel(this.buildFilter()).subscribe({
      next: (blob) => {
        this.exporting = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'applications-export.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting = false;
      },
    });
  }
}
