import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import type {
  AnalysisUnit,
  ProductionAnalysis,
} from "./types";

type ProductionAnalysisInput = {
  start_date?: string;
  end_date?: string;
  output_unit: AnalysisUnit;
  rolling_window_days: number;
  records: {
    date: string;
    quantity: number;
    unit: AnalysisUnit;
    shift_code: string;
    shift_name: string;
    operating_minutes: number;
  }[];
};

const analysisResultSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  unit: z.enum(["TON", "KILOGRAM", "CUBIC_METER", "UNIT"]),
  calendar_day_count: z.number().int().nonnegative(),
  observed_day_count: z.number().int().nonnegative(),
  missing_day_count: z.number().int().nonnegative(),
  rolling_window_days: z.number().int().positive(),
  total_quantity: z.number().nonnegative(),
  points: z.array(
    z.object({
      date: z.string(),
      quantity: z.number().nullable(),
      is_missing: z.boolean(),
      record_count: z.number().int().nonnegative(),
      moving_average: z.number().nullable(),
      observations_in_window: z.number().int().nonnegative(),
    }),
  ),
  shift_summary: z.array(
    z.object({
      shift_code: z.string(),
      shift_name: z.string(),
      record_count: z.number().int().nonnegative(),
      total_quantity: z.number().nonnegative(),
      average_quantity: z.number().nonnegative(),
      total_operating_minutes: z.number().int().nonnegative(),
      quantity_per_operating_hour: z.number().nonnegative().nullable(),
    }),
  ),
});

function getPythonExecutable(projectRoot: string) {
  const configured = process.env.PYTHON_EXECUTABLE?.trim();
  if (configured) {
    return configured;
  }

  return process.platform === "win32"
    ? path.join(projectRoot, ".venv", "Scripts", "python.exe")
    : path.join(projectRoot, ".venv", "bin", "python");
}

function executePython(input: ProductionAnalysisInput): Promise<string> {
  const projectRoot = process.cwd();
  const pythonExecutable = getPythonExecutable(projectRoot);
  const scriptPath = path.join(projectRoot, "analytics", "production_series.py");

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [scriptPath], {
      cwd: projectRoot,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finishWithError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    };

    const timeout = setTimeout(() => {
      child.kill();
      finishWithError(new Error("Python analizi 30 saniyede tamamlanamadı."));
    }, 30_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 5_000_000) {
        child.kill();
        finishWithError(new Error("Python analiz çıktısı izin verilen boyutu aştı."));
      }
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", () => {
      finishWithError(
        new Error(
          "Python analiz ortamı başlatılamadı. .venv kurulumunu kontrol edin.",
        ),
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (code !== 0) {
        let message = stderr.trim();
        try {
          const parsed = JSON.parse(message) as { error?: unknown };
          if (typeof parsed.error === "string") message = parsed.error;
        } catch {
          // Python'ın düz metin hata çıktısını olduğu gibi kullan.
        }
        reject(new Error(message || "Python analizi tamamlanamadı."));
        return;
      }

      resolve(stdout);
    });

    child.stdin.on("error", () => {
      finishWithError(new Error("Veriler Python analiz sürecine gönderilemedi."));
    });
    child.stdin.end(JSON.stringify(input));
  });
}

export async function runProductionAnalysis(
  input: ProductionAnalysisInput,
): Promise<ProductionAnalysis> {
  const stdout = await executePython(input);
  let json: unknown;

  try {
    json = JSON.parse(stdout);
  } catch {
    throw new Error("Python analizi geçerli JSON döndürmedi.");
  }

  const result = analysisResultSchema.parse(json);

  return {
    startDate: result.start_date,
    endDate: result.end_date,
    unit: result.unit,
    calendarDayCount: result.calendar_day_count,
    observedDayCount: result.observed_day_count,
    missingDayCount: result.missing_day_count,
    rollingWindowDays: result.rolling_window_days,
    totalQuantity: result.total_quantity,
    points: result.points.map((point) => ({
      date: point.date,
      quantity: point.quantity,
      isMissing: point.is_missing,
      recordCount: point.record_count,
      movingAverage: point.moving_average,
      observationsInWindow: point.observations_in_window,
    })),
    shiftSummary: result.shift_summary.map((shift) => ({
      shiftCode: shift.shift_code,
      shiftName: shift.shift_name,
      recordCount: shift.record_count,
      totalQuantity: shift.total_quantity,
      averageQuantity: shift.average_quantity,
      totalOperatingMinutes: shift.total_operating_minutes,
      quantityPerOperatingHour: shift.quantity_per_operating_hour,
    })),
  };
}
