import { Component, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatChipInputEvent } from '@angular/material/chips';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { Router } from '@angular/router';
import { CandidateProfileService } from '../../../services/candidate-profile.service';
import { LocationBudgetService } from '../../../services/location-budget.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { CandidateProfileRequest, CandidateProfileResponse } from '../../../models/candidate-profile.model';
import { LocationName } from '../../../models/location-budget.model';

/** Sentinel select value that reveals a free-text "Other" input alongside a dropdown. */
const OTHER_VALUE = '__OTHER__';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'IB', 'IGCSE', 'State Board'];

const DEGREES = [
  'B.Tech', 'B.E.', 'B.Sc', 'B.Com', 'BBA', 'BCA', 'BA',
  'M.Tech', 'M.E.', 'MBA', 'MCA', 'M.Sc', 'M.Com', 'MA',
];

const UNIVERSITIES = [
  'Anna University', 'Visvesvaraya Technological University', 'University of Mumbai',
  'University of Delhi', 'Savitribai Phule Pune University', 'JNTU Hyderabad',
  'IIT', 'NIT', 'BITS Pilani', 'Amity University', 'VIT University',
];

interface CertificationEntry {
  label: string;
  description: string;
}

@Component({
  selector: 'app-candidate-profile-stepper',
  templateUrl: './candidate-profile-stepper.component.html',
  styleUrls: ['./candidate-profile-stepper.component.scss'],
  standalone: false,
})
export class CandidateProfileStepperComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  loaded = false;
  saving = false;
  uploadingResume = false;

  profile: CandidateProfileResponse | null = null;
  resumeFile: File | null = null;

  personalForm!: FormGroup;
  academicForm!: FormGroup;
  skillsForm!: FormGroup;
  locationForm!: FormGroup;

  readonly OTHER_VALUE = OTHER_VALUE;
  readonly genders = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
  ];
  readonly indianStates = INDIAN_STATES;
  readonly schoolBoards = SCHOOL_BOARDS;
  readonly degrees = DEGREES;
  readonly universities = UNIVERSITIES;

  readonly dobMax = this.yearsAgo(18);
  readonly dobMin = this.yearsAgo(100);
  readonly currentYear = new Date().getFullYear();

  showPostGraduation = false;
  locationOptions: LocationName[] = [];

  // Primary skills pill/chip input
  skillsChips: string[] = [];
  readonly skillSeparatorKeys = [ENTER, COMMA];

  constructor(
    private fb: FormBuilder,
    private profileService: CandidateProfileService,
    private locationService: LocationBudgetService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadProfile();
    this.locationService.getNames().subscribe({
      next: (locations) => (this.locationOptions = locations),
      error: () => this.toast.error('Failed to load locations.'),
    });
  }

  private buildForms(): void {
    this.personalForm = this.fb.group({
      dateOfBirth: [null, [Validators.required, CustomValidators.dateRange(this.dobMin, this.dobMax)]],
      gender: [null, Validators.required],
      addressLine: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });

    this.academicForm = this.fb.group(
      {
        tenthSchoolBoard: ['', Validators.required],
        tenthSchoolBoardOther: [''],
        tenthPercentage: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
        tenthPassingYear: [null, [Validators.required, Validators.min(1980), Validators.max(this.currentYear)]],

        twelfthSchoolBoard: ['', Validators.required],
        twelfthSchoolBoardOther: [''],
        twelfthPercentage: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
        twelfthPassingYear: [null, [Validators.required, Validators.min(1980), Validators.max(this.currentYear)]],

        graduationDegree: ['', Validators.required],
        graduationDegreeOther: [''],
        graduationUniversity: ['', Validators.required],
        graduationUniversityOther: [''],
        graduationCgpa: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
        graduationStartYear: [null, [Validators.required, Validators.min(1980), Validators.max(this.currentYear)]],
        graduationPassingYear: [null, [Validators.required, Validators.min(1980), Validators.max(this.currentYear)]],

        postGraduationDegree: [''],
        postGraduationDegreeOther: [''],
        postGraduationUniversity: [''],
        postGraduationUniversityOther: [''],
        postGraduationCgpa: [null, [Validators.min(0), Validators.max(10)]],
        postGraduationPassingYear: [null, [Validators.min(1980), Validators.max(this.currentYear)]],
      },
      { validators: this.graduationYearOrderValidator() },
    );

    this.skillsForm = this.fb.group({
      primarySkills: ['', Validators.required],
      secondarySkills: [''],
      certifications: this.fb.array([]),
    });

    this.locationForm = this.fb.group({
      preference1: ['', Validators.required],
      preference2: ['', Validators.required],
      preference3: ['', Validators.required],
    });
  }

  /** Graduation start year must be before the passing year, when both are present. */
  private graduationYearOrderValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const start = group.get('graduationStartYear')?.value;
      const end = group.get('graduationPassingYear')?.value;
      const endControl = group.get('graduationPassingYear');
      if (start != null && end != null && Number(start) >= Number(end)) {
        endControl?.setErrors({ ...endControl.errors, yearOrder: true });
      } else if (endControl?.hasError('yearOrder')) {
        const { yearOrder, ...rest } = endControl.errors as ValidationErrors;
        endControl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    };
  }

  private yearsAgo(years: number): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d;
  }

  // ─── Certifications FormArray ────────────────────────────────────────────────

  get certifications(): FormArray {
    return this.skillsForm.get('certifications') as FormArray;
  }

  addCertification(label = '', description = ''): void {
    this.certifications.push(
      this.fb.group({
        label: [label],
        description: [description],
      }),
    );
  }

  removeCertification(index: number): void {
    this.certifications.removeAt(index);
  }

  private loadProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.patchForms(profile);
        this.applyLocks();
        this.loaded = true;
      },
      error: () => {
        this.loaded = true;
      },
    });
  }

  private patchForms(profile: CandidateProfileResponse): void {
    this.personalForm.patchValue({
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
      gender: profile.gender ?? null,
      addressLine: profile.addressLine ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      pincode: profile.pincode ?? '',
    });

    const tenthBoard = this.resolveDropdownPatch(profile.tenthSchoolBoard, SCHOOL_BOARDS);
    const twelfthBoard = this.resolveDropdownPatch(profile.twelfthSchoolBoard, SCHOOL_BOARDS);
    const gradDegree = this.resolveDropdownPatch(profile.graduationDegree, DEGREES);
    const gradUniversity = this.resolveDropdownPatch(profile.graduationUniversity, UNIVERSITIES);
    const pgDegree = this.resolveDropdownPatch(profile.postGraduationDegree, DEGREES);
    const pgUniversity = this.resolveDropdownPatch(profile.postGraduationUniversity, UNIVERSITIES);

    this.academicForm.patchValue({
      tenthSchoolBoard: tenthBoard.select,
      tenthSchoolBoardOther: tenthBoard.other,
      tenthPercentage: profile.tenthPercentage ?? null,
      tenthPassingYear: profile.tenthPassingYear ?? null,
      twelfthSchoolBoard: twelfthBoard.select,
      twelfthSchoolBoardOther: twelfthBoard.other,
      twelfthPercentage: profile.twelfthPercentage ?? null,
      twelfthPassingYear: profile.twelfthPassingYear ?? null,
      graduationDegree: gradDegree.select,
      graduationDegreeOther: gradDegree.other,
      graduationUniversity: gradUniversity.select,
      graduationUniversityOther: gradUniversity.other,
      graduationCgpa: profile.graduationCgpa ?? null,
      graduationStartYear: profile.graduationStartYear ?? null,
      graduationPassingYear: profile.graduationPassingYear ?? null,
      postGraduationDegree: pgDegree.select,
      postGraduationDegreeOther: pgDegree.other,
      postGraduationUniversity: pgUniversity.select,
      postGraduationUniversityOther: pgUniversity.other,
      postGraduationCgpa: profile.postGraduationCgpa ?? null,
      postGraduationPassingYear: profile.postGraduationPassingYear ?? null,
    });
    this.showPostGraduation = !!(profile.postGraduationDegree || profile.postGraduationUniversity);

    this.skillsChips = this.splitSkills(profile.primarySkills);
    this.skillsForm.patchValue({
      primarySkills: profile.primarySkills ?? '',
      secondarySkills: profile.secondarySkills ?? '',
    });
    this.certifications.clear();
    this.parseCertifications(profile.certifications).forEach((c) => this.addCertification(c.label, c.description));

    const prefs = profile.locationPreferences ?? [];
    this.locationForm.patchValue({
      preference1: prefs[0] ?? '',
      preference2: prefs[1] ?? '',
      preference3: prefs[2] ?? '',
    });
  }

  /** Locks (disables) each step's FormGroup once its section has been saved at least
   *  once — per-step, not all-or-nothing, so a candidate can still fill in later steps
   *  after an earlier one is locked. */
  private applyLocks(): void {
    if (this.personalLocked) this.personalForm.disable({ emitEvent: false });
    else this.personalForm.enable({ emitEvent: false });

    if (this.academicLocked) this.academicForm.disable({ emitEvent: false });
    else this.academicForm.enable({ emitEvent: false });

    if (this.skillsLocked) this.skillsForm.disable({ emitEvent: false });
    else this.skillsForm.enable({ emitEvent: false });

    if (this.locationLocked) this.locationForm.disable({ emitEvent: false });
    else this.locationForm.enable({ emitEvent: false });
  }

  get personalLocked(): boolean {
    return !!this.profile?.dateOfBirth;
  }
  get academicLocked(): boolean {
    return !!this.profile?.graduationDegree;
  }
  get skillsLocked(): boolean {
    return !!this.profile?.primarySkills;
  }
  get locationLocked(): boolean {
    return (this.profile?.locationPreferences?.length ?? 0) === 3;
  }

  private resolveDropdownPatch(value: string | undefined | null, options: string[]): { select: string; other: string } {
    if (!value) return { select: '', other: '' };
    return options.includes(value) ? { select: value, other: '' } : { select: OTHER_VALUE, other: value };
  }

  private resolveDropdownValue(select: string, other: string): string | null {
    if (!select) return null;
    return select === OTHER_VALUE ? (other || null) : select;
  }

  private splitSkills(value: string | undefined | null): string[] {
    return (value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private parseCertifications(value: string | undefined | null): CertificationEntry[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((c) => c && typeof c === 'object')
          .map((c) => ({ label: c.label ?? '', description: c.description ?? '' }));
      }
    } catch {
      // Legacy free-text certifications value — surface it as a single entry.
      return [{ label: '', description: value }];
    }
    return [];
  }

  // ─── Primary skills chip input ───────────────────────────────────────────────

  addSkillChip(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.skillsChips.includes(value)) {
      this.skillsChips.push(value);
      this.syncSkillsControl();
    }
    event.chipInput?.clear();
  }

  removeSkillChip(skill: string): void {
    this.skillsChips = this.skillsChips.filter((s) => s !== skill);
    this.syncSkillsControl();
  }

  private syncSkillsControl(): void {
    this.skillsForm.get('primarySkills')?.setValue(this.skillsChips.join(', '));
    this.skillsForm.get('primarySkills')?.markAsTouched();
  }

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Resume file must be under 5 MB.');
      return;
    }
    this.resumeFile = file;
    this.uploadingResume = true;
    this.profileService.uploadResume(file).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.uploadingResume = false;
        this.toast.success('Resume uploaded successfully.');
      },
      error: (err) => {
        this.uploadingResume = false;
        this.resumeFile = null;
        this.toast.error(err.error?.message || 'Failed to upload resume.');
      },
    });
  }

  get locationPreferencesValid(): boolean {
    const { preference1, preference2, preference3 } = this.locationForm.getRawValue();
    const values = [preference1, preference2, preference3]
      .map((v: string) => (v || '').trim().toLowerCase())
      .filter(Boolean);
    if (values.length !== 3) return false;
    return new Set(values).size === 3;
  }

  get locationPreferencesDuplicate(): boolean {
    const { preference1, preference2, preference3 } = this.locationForm.getRawValue();
    const values = [preference1, preference2, preference3]
      .map((v: string) => (v || '').trim().toLowerCase())
      .filter(Boolean);
    return values.length === 3 && new Set(values).size !== 3;
  }

  get resumeUploaded(): boolean {
    return !!this.profile?.resumeFileId;
  }

  get missingFields(): string[] {
    return this.profile?.missingFields ?? [];
  }

  get isComplete(): boolean {
    return !!this.profile?.profileCompleted;
  }

  /** Builds the full accumulated payload from all 4 FormGroups' CURRENT values —
   *  always sent in full regardless of which step triggered the save, since the
   *  backend does a full-overwrite update (fields not sent would be nulled out).
   *  Uses getRawValue() throughout since a locked (disabled) FormGroup's plain
   *  .value would otherwise omit its controls entirely. */
  private buildPayload(): CandidateProfileRequest {
    const p = this.personalForm.getRawValue();
    const a = this.academicForm.getRawValue();
    const s = this.skillsForm.getRawValue();
    const l = this.locationForm.getRawValue();

    const certs: CertificationEntry[] = (s.certifications ?? [])
      .filter((c: CertificationEntry) => (c.label || '').trim() || (c.description || '').trim());

    return {
      dateOfBirth: this.toIsoDate(p.dateOfBirth),
      gender: p.gender,
      addressLine: p.addressLine,
      city: p.city,
      state: p.state,
      pincode: p.pincode,
      tenthSchoolBoard: this.resolveDropdownValue(a.tenthSchoolBoard, a.tenthSchoolBoardOther),
      tenthPercentage: a.tenthPercentage,
      tenthPassingYear: a.tenthPassingYear,
      twelfthSchoolBoard: this.resolveDropdownValue(a.twelfthSchoolBoard, a.twelfthSchoolBoardOther),
      twelfthPercentage: a.twelfthPercentage,
      twelfthPassingYear: a.twelfthPassingYear,
      graduationDegree: this.resolveDropdownValue(a.graduationDegree, a.graduationDegreeOther),
      graduationUniversity: this.resolveDropdownValue(a.graduationUniversity, a.graduationUniversityOther),
      graduationCgpa: a.graduationCgpa,
      graduationStartYear: a.graduationStartYear,
      graduationPassingYear: a.graduationPassingYear,
      postGraduationDegree: this.showPostGraduation
        ? this.resolveDropdownValue(a.postGraduationDegree, a.postGraduationDegreeOther) : null,
      postGraduationUniversity: this.showPostGraduation
        ? this.resolveDropdownValue(a.postGraduationUniversity, a.postGraduationUniversityOther) : null,
      postGraduationCgpa: this.showPostGraduation ? a.postGraduationCgpa : null,
      postGraduationPassingYear: this.showPostGraduation ? a.postGraduationPassingYear : null,
      primarySkills: this.skillsChips.join(', ') || s.primarySkills,
      secondarySkills: s.secondarySkills || null,
      certifications: certs.length ? JSON.stringify(certs) : null,
      locationPreferences: [l.preference1, l.preference2, l.preference3],
    };
  }

  /** Per-step "Save and Next": persists whatever has been filled in across ALL steps so
   *  far (not just the current one — see buildPayload()), so progress is never silently
   *  dropped if the candidate doesn't finish every step in one sitting. Only advances the
   *  stepper on a successful save. */
  saveStep(form: FormGroup, sectionLabel: string): void {
    if (form.disabled) {
      // Already locked from a previous save — nothing new to persist, just advance.
      this.stepper.next();
      return;
    }
    if (form.invalid) {
      form.markAllAsTouched();
      this.toast.error('Please fill all required fields before continuing.');
      return;
    }
    if (form === this.locationForm && !this.locationPreferencesValid) {
      this.toast.error('Provide exactly 3 unique location preferences.');
      return;
    }

    this.saving = true;
    this.profileService.updateMyProfile(this.buildPayload()).subscribe({
      next: (profile) => {
        this.saving = false;
        this.profile = profile;
        this.applyLocks();
        this.toast.success(`${sectionLabel} saved.`);
        this.stepper.next();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Failed to save profile.');
      },
    });
  }

  /** Review step's final save — the one place a full-validity check across all 4
   *  sections still makes sense, since it's what determines profileCompleted. */
  save(navigateAway = false): void {
    if (
      this.personalForm.invalid ||
      this.academicForm.invalid ||
      this.skillsForm.invalid ||
      this.locationForm.invalid
    ) {
      this.personalForm.markAllAsTouched();
      this.academicForm.markAllAsTouched();
      this.skillsForm.markAllAsTouched();
      this.locationForm.markAllAsTouched();
      this.toast.error('Please fill all required fields before saving.');
      return;
    }
    if (!this.locationPreferencesValid) {
      this.toast.error('Provide exactly 3 unique location preferences.');
      return;
    }

    this.saving = true;
    this.profileService.updateMyProfile(this.buildPayload()).subscribe({
      next: (profile) => {
        this.saving = false;
        this.profile = profile;
        this.applyLocks();
        if (profile.profileCompleted) {
          this.toast.success('Profile completed! You can now apply to jobs.');
        } else {
          this.toast.success('Profile saved.');
        }
        if (navigateAway) {
          this.router.navigate(['/candidate/jobs']);
        }
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.message || 'Failed to save profile.');
      },
    });
  }

  private toIsoDate(value: Date | string | null): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
