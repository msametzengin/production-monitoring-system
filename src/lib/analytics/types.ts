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
export type PerformanceSummary = {
  totalOperatingMinutes: number;
  totalPlannedMinutes: number;
  lostPlannedMinutes: number;
  operatingRate: number | null;
  nominalDailyCapacity: number | null;
  capacityReference: number | null;
  capacityUtilization: number | null;
  averageDailyQuantity: number | null;
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
export type ProductionAnomaly = {
  date: string;
  quantity: number;
  direction: "HIGH" | "LOW";
  deviationPercent: number | null;
};

export type ProductionAnomalySummary = {
  method: "IQR_1_5";
  sampleSize: number;
  median: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  anomalyCount: number;
  points: ProductionAnomaly[];
};

export type DowntimeParetoItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  minutes: number;
  recordCount: number;
  percentage: number;
  cumulativePercentage: number;
  isVital: boolean;
};

export type DowntimeParetoAnalysis = {
  totalMinutes: number;
  totalRecords: number;
  vitalReasonCount: number;
  items: DowntimeParetoItem[];
};

export type ProductionLossEstimate = {
  totalDowntimeMinutes: number;
  plannedDowntimeMinutes: number;
  unplannedDowntimeMinutes: number;
  quantityPerOperatingHour: number | null;
  totalEstimatedLoss: number | null;
  plannedEstimatedLoss: number | null;
  unplannedEstimatedLoss: number | null;
  lossRate: number | null;
};

export type ProductionAnalyticsSeries = {
  id: number;
  label: string;
  unitLabel: string;
  analysis: ProductionAnalysis;
  performance: PerformanceSummary;
  lossEstimate: ProductionLossEstimate;
  anomalySummary: ProductionAnomalySummary;
};