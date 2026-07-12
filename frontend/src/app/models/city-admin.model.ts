// ─── City / Block Admin Models (real backend, P-Claude.md CITY/BLOCK/BUDGET modules) ─────

export type CityStatus = 'ACTIVE' | 'INACTIVE';
export type BlockStatus = 'ACTIVE' | 'INACTIVE';

export interface CityAdmin {
  id: number;
  name: string;
  totalBudget: number;
  reservedBudget: number;
  usedBudget: number;
  availableBudget: number;
  status: CityStatus;
  blockCount: number;
}

export interface CityAdminRequest {
  name?: string;
  status?: CityStatus;
}

export interface BudgetAdjustmentRequest {
  amount: number;
  note?: string;
}

export interface BudgetTransaction {
  id: number;
  cityId: number;
  type: 'ALLOCATION' | 'RESERVED' | 'TRAINING_COST' | 'RESERVATION_RELEASED' | 'MANUAL_ADJUSTMENT';
  amount: number;
  relatedBatchId?: number;
  relatedBatchCode?: string;
  createdByName?: string;
  note?: string;
  createdAt: string;
}

export interface BlockAdmin {
  id: number;
  name: string;
  capacity: number;
  cityId: number;
  cityName: string;
  status: BlockStatus;
  currentActiveBatchId?: number;
  currentActiveBatchCode?: string;
  available: boolean;
}

export interface BlockAdminRequest {
  name?: string;
  capacity?: number;
  cityId?: number;
  status?: BlockStatus;
}
