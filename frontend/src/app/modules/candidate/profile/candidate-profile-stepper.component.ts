import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { Router } from '@angular/router';
import { CandidateProfileService } from '../../../services/candidate-profile.service';
import { LocationBudgetService } from '../../../services/location-budget.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
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

/** Major cities per state — keeps City a dependent dropdown of State so combinations like
 *  "Jamshedpur, Assam" can't be entered. Curated, not exhaustive; "Other" covers the rest. */
const CITIES_BY_STATE: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore'],
  'Arunachal Pradesh': ['Itanagar'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur'],
  'Goa': ['Panaji', 'Margao'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  'Karnataka': ['Bangalore', 'Mysuru', 'Mangaluru', 'Hubballi'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Kohima', 'Dimapur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Sikkim': ['Gangtok'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
  'Tripura': ['Agartala'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Varanasi'],
  'Uttarakhand': ['Dehradun', 'Haridwar'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Silvassa'],
  'Delhi': ['New Delhi'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu'],
  'Ladakh': ['Leh'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry'],
};

/** Expected duration (in years) for curated degree options — validates that the graduation
 *  start/passing years reflect a real course length (e.g. B.Tech = 4 years, not 5). Degrees
 *  entered via "Other" skip this check; they only need passingYear > startYear. */
const DEGREE_DURATIONS: Record<string, number> = {
  'B.Tech': 4, 'B.E.': 4, 'B.Sc': 3, 'B.Com': 3, 'BBA': 3, 'BCA': 3, 'BA': 3,
  'M.Tech': 2, 'M.E.': 2, 'MBA': 2, 'MCA': 2, 'M.Sc': 2, 'M.Com': 2, 'MA': 2,
};

/** Minimum plausible age (in whole years) for having passed 10th standard — guards against
 *  e.g. a 10th passing year that predates the candidate's own birth. */
const MIN_AGE_AT_TENTH = 14;

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
    private dialog: MatDialog,
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
      cityOther: [''],
      state: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
    // Changing State invalidates whatever City was picked for the old State.
    this.personalForm.get('state')?.valueChanges.subscribe(() => {
      this.personalForm.get('city')?.setValue('');
      this.personalForm.get('cityOther')?.setValue('');
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
      { validators: this.academicFormValidator() },
    );

    this.skillsForm = this.fb.group({
      primarySkills: ['', Validators.required],
    });

    this.locationForm = this.fb.group({
      preference1: ['', Validators.required],
      preference2: ['', Validators.required],
      preference3: ['', Validators.required],
    });

    // 10th/12th passing years live-validated against DOB (personalForm) — a cross-FormGroup
    // check, so it can't be a group validator on either form alone; re-run on either side
    // changing.
    this.personalForm.get('dateOfBirth')?.valueChanges.subscribe(() => this.updateTenthYearVsDobError());
    this.academicForm.get('tenthPassingYear')?.valueChanges.subscribe(() => this.updateTenthYearVsDobError());
  }

  /** Two checks within academicForm:
   *  1. 12th passing year must be after 10th passing year.
   *  2. Graduation start year must be before its passing year, and — for curated
   *     (non-"Other") degrees — the gap must match that degree's real duration (e.g. B.Tech
   *     is 4 years, not 5). */
  private academicFormValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const tenth = group.get('tenthPassingYear')?.value;
      const twelfth = group.get('twelfthPassingYear')?.value;
      const twelfthControl = group.get('twelfthPassingYear');
      const twelfthExisting = twelfthControl?.errors ?? {};
      const { yearOrder: _twelfthYearOrder, ...twelfthRest } = twelfthExisting;
      if (tenth != null && twelfth != null && Number(twelfth) <= Number(tenth)) {
        twelfthControl?.setErrors({ ...twelfthRest, yearOrder: true });
      } else {
        twelfthControl?.setErrors(Object.keys(twelfthRest).length ? twelfthRest : null);
      }

      const start = group.get('graduationStartYear')?.value;
      const end = group.get('graduationPassingYear')?.value;
      const degree = group.get('graduationDegree')?.value;
      const endControl = group.get('graduationPassingYear');
      const existing = endControl?.errors ?? {};
      const { yearOrder, durationMismatch, ...rest } = existing;

      if (start != null && end != null) {
        const gap = Number(end) - Number(start);
        if (gap <= 0) {
          endControl?.setErrors({ ...rest, yearOrder: true });
          return null;
        }
        const expected = degree && degree !== OTHER_VALUE ? DEGREE_DURATIONS[degree] : undefined;
        if (expected != null && gap !== expected) {
          endControl?.setErrors({ ...rest, durationMismatch: { expected } });
          return null;
        }
      }
      endControl?.setErrors(Object.keys(rest).length ? rest : null);
      return null;
    };
  }

  /** 10th passing year must be plausible given DOB (can't have passed 10th before being old
   *  enough to, and definitely not before being born). Imperative, like academicFormValidator,
   *  since this crosses the personalForm/academicForm boundary. */
  private updateTenthYearVsDobError(): void {
    const dob: Date | string | null = this.personalForm.get('dateOfBirth')?.value;
    const tenthControl = this.academicForm.get('tenthPassingYear');
    const tenthYear = tenthControl?.value;
    const existing = tenthControl?.errors ?? {};
    const { dobInconsistent, ...rest } = existing;

    if (dob && tenthYear != null) {
      const dobYear = (dob instanceof Date ? dob : new Date(dob)).getFullYear();
      if (Number(tenthYear) < dobYear + MIN_AGE_AT_TENTH) {
        tenthControl?.setErrors({ ...rest, dobInconsistent: true });
        return;
      }
    }
    tenthControl?.setErrors(Object.keys(rest).length ? rest : null);
  }

  private yearsAgo(years: number): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d;
  }

  // ─── City (dependent on State) ────────────────────────────────────────────────

  get cityOptions(): string[] {
    return CITIES_BY_STATE[this.personalForm?.get('state')?.value] ?? [];
  }

  get displayCity(): string {
    const { city, cityOther } = this.personalForm.getRawValue();
    return this.resolveDropdownValue(city, cityOther) ?? '';
  }

  // ─── Location Preferences ────────────────────────────────────────────────────

  /** Only appends the "(city)" suffix when it's actually different from the name — avoids
   *  "Bangalore (Bangalore)"-style duplication for locations where name === city. */
  locationLabel(loc: LocationName): string {
    return loc.city && loc.city !== loc.name ? `${loc.name} (${loc.city})` : loc.name;
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
    // emitEvent: false — otherwise setting `state` here would fire the state->city reset
    // subscriber (see buildForms) and wipe out the `city` value being patched in below.
    const city = this.resolveDropdownPatch(profile.city, CITIES_BY_STATE[profile.state ?? ''] ?? []);
    this.personalForm.patchValue(
      {
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
        gender: profile.gender ?? null,
        addressLine: profile.addressLine ?? '',
        city: city.select,
        cityOther: city.other,
        state: profile.state ?? '',
        pincode: profile.pincode ?? '',
      },
      { emitEvent: false },
    );

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

    // Primary/Secondary Skills merged into one field (P-Claude.md issue #11) — any
    // legacy secondarySkills value from an older save is folded in rather than dropped.
    const mergedSkills = [
      ...this.splitSkills(profile.primarySkills),
      ...this.splitSkills(profile.secondarySkills),
    ];
    this.skillsChips = Array.from(new Set(mergedSkills));
    this.skillsForm.patchValue({
      primarySkills: this.skillsChips.join(', '),
    });

    const prefs = profile.locationPreferences ?? [];
    this.locationForm.patchValue({
      preference1: prefs[0] ?? '',
      preference2: prefs[1] ?? '',
      preference3: prefs[2] ?? '',
    });
  }

  /** Locks (disables) every step's FormGroup once the WHOLE profile has been submitted —
   *  not per-step, and not merely because a step has been saved once. Candidates can freely
   *  revisit and edit any earlier step up until final submit on the Review step; only that
   *  explicit submit (behind its own confirmation modal — see save()) locks everything. */
  private applyLocks(): void {
    if (this.isComplete) {
      this.personalForm.disable({ emitEvent: false });
      this.academicForm.disable({ emitEvent: false });
      this.skillsForm.disable({ emitEvent: false });
      this.locationForm.disable({ emitEvent: false });
    } else {
      this.personalForm.enable({ emitEvent: false });
      this.academicForm.enable({ emitEvent: false });
      this.skillsForm.enable({ emitEvent: false });
      this.locationForm.enable({ emitEvent: false });
    }
  }

  get personalLocked(): boolean {
    return this.isComplete;
  }
  get academicLocked(): boolean {
    return this.isComplete;
  }
  get skillsLocked(): boolean {
    return this.isComplete;
  }
  get locationLocked(): boolean {
    return this.isComplete;
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

    return {
      dateOfBirth: this.toIsoDate(p.dateOfBirth),
      gender: p.gender,
      addressLine: p.addressLine,
      city: this.resolveDropdownValue(p.city, p.cityOther),
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
      secondarySkills: null,
      certifications: null,
      locationPreferences: [l.preference1, l.preference2, l.preference3],
    };
  }

  /** Per-step "Save and Next": persists whatever has been filled in across ALL steps so
   *  far (not just the current one — see buildPayload()), so progress is never silently
   *  dropped if the candidate doesn't finish every step in one sitting. Only advances the
   *  stepper on a successful save. Routed through confirmAndPersist() (not a direct save)
   *  since saving the LAST missing section here — not just an explicit Review-step submit —
   *  can also be the action that completes (and locks) the profile. */
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

    this.confirmAndPersist(() => {
      this.toast.success(`${sectionLabel} saved.`);
      this.stepper.next();
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

    this.confirmAndPersist((profile) => {
      if (profile.profileCompleted) {
        this.toast.success('Profile completed! You can now apply to jobs.');
      } else {
        this.toast.success('Profile saved.');
      }
      if (navigateAway) {
        this.router.navigate(['/candidate/jobs']);
      }
    });
  }

  /** True when the NEXT save (from any step, not just Review) would flip profileCompleted
   *  from false to true — i.e. every section is currently valid and only this save is
   *  pending. Used to decide whether to show the "this will lock your profile" confirmation. */
  private wouldCompleteProfile(): boolean {
    return (
      !this.isComplete &&
      this.personalForm.valid &&
      this.academicForm.valid &&
      this.skillsForm.valid &&
      this.locationForm.valid &&
      this.locationPreferencesValid &&
      this.resumeUploaded
    );
  }

  /** Shared save path for both saveStep() and save(): confirms first if this save would
   *  complete (and thus lock, per applyLocks) the profile, then persists via
   *  updateMyProfile() and hands the result to onSuccess. */
  private confirmAndPersist(onSuccess: (profile: CandidateProfileResponse) => void): void {
    const persist = () => {
      this.saving = true;
      this.profileService.updateMyProfile(this.buildPayload()).subscribe({
        next: (profile) => {
          this.saving = false;
          this.profile = profile;
          this.applyLocks();
          onSuccess(profile);
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Failed to save profile.');
        },
      });
    };

    if (this.wouldCompleteProfile()) {
      this.dialog
        .open(ConfirmationDialogComponent, {
          data: {
            title: 'Submit Profile',
            message:
              'Submitting will complete and lock your profile — you won’t be able to edit these details yourself afterwards (contact HR if something needs to change). Are you sure you want to submit?',
            type: 'warning',
            confirmText: 'Submit',
          },
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) persist();
        });
    } else {
      persist();
    }
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
