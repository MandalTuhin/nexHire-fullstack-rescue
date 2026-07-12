// ─── Location Names (backend LocationNameResponse) ────────────────────────────

/** Minimal id/name/city shape for the Location Preferences and Joining Batch wizard dropdowns
 *  — the City budget passbook itself lives in CityAdmin (see city-admin.model.ts). */
export interface LocationName {
  id: number;
  name: string;
  city: string;
}
