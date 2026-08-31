export type AnalysisUnit = "TON" | "KILOGRAM" | "CUBIC_METER" | "UNIT";

export type ProductionAnalysisPoint = {
  date: string;
  quantity: number | null;
  isMissing: boolean;
  recordCount: number;
  movingAverage: number | null;
  observationsInWindow: number;
};

export type ShiftAnalysis = {
  shiftCode: string;
  shiftName: string;
  recordCount: number;
  totalQuantity: number;
  averageQuantity: number;
  totalOperatingMinutes: number;
  quantityPerOperatingHour: number | null;
};

export type ProductionAnalysis = {
  startDate: string;
  endDate: string;
  unit: AnalysisUnit;
  calendarDayCount: number;
  observedDayCount: number;
  missingDayCount: number;
  rollingWindowDays: number;
  totalQuantity: number;
  points: ProductionAnalysisPoint[];
  shiftSummary: ShiftAnalysis[];
};

export type ProductionAnalyticsSeries = {
  id: number;
  label: string;
  unitLabel: string;
  analysis: ProductionAnalysis;
};
