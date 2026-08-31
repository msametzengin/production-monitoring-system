"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProductionAnalyticsSeries } from "@/lib/analytics/types";

type AnalyticsChartsProps = {
  data: ProductionAnalyticsSeries[];
};

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
};

function formatNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("tr-TR", {
        maximumFractionDigits: 3,
      })
    : "—";
}

function formatDate(value: unknown) {
  const [year, month, day] = String(value).split("-");

  return [day, month, year].join(".");
}

export function AnalyticsCharts({
  data,
}: AnalyticsChartsProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    null,
  );

  const activeSeries =
    data.find((series) => series.id === selectedId) ??
    data[0];

  if (!activeSeries) {
    return (
      <div className="rounded-xl border border-slate-800 p-8 text-slate-400">
        Analiz edilecek üretim kaydı bulunmuyor.
      </div>
    );
  }

  const { analysis, unitLabel } = activeSeries;

  const observedRate =
    analysis.calendarDayCount > 0
      ? (analysis.observedDayCount /
          analysis.calendarDayCount) *
        100
      : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <label
          htmlFor="analytics-series"
          className="block text-sm text-slate-400"
        >
          Analiz edilecek tesis ve ürün
        </label>

        <select
          id="analytics-series"
          value={activeSeries.id}
          onChange={(event) =>
            setSelectedId(Number(event.target.value))
          }
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
        >
          {data.map((series) => (
            <option key={series.id} value={series.id}>
              {series.label} ({series.unitLabel})
            </option>
          ))}
        </select>

        <p className="mt-3 text-xs leading-5 text-slate-400">
          Hareketli ortalama, eksik günleri sıfır üretim
          olarak kabul etmez. Yalnızca kayıt bulunan günleri
          kullanır.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Toplam üretim
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {formatNumber(analysis.totalQuantity)}{" "}
            {unitLabel}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Kayıt bulunan gün
          </p>

          <p className="mt-2 text-2xl font-bold">
            {analysis.observedDayCount}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Eksik gün
          </p>

          <p
            className={
              analysis.missingDayCount > 0
                ? "mt-2 text-2xl font-bold text-amber-400"
                : "mt-2 text-2xl font-bold text-emerald-400"
            }
          >
            {analysis.missingDayCount}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Veri doluluk oranı
          </p>

          <p className="mt-2 text-2xl font-bold">
            %
            {observedRate.toLocaleString("tr-TR", {
              maximumFractionDigits: 1,
            })}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Günlük Üretim Trendi
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Günlük üretim ve{" "}
            {analysis.rollingWindowDays} günlük hareketli
            ortalama
          </p>
        </div>

        <ResponsiveContainer
          width="100%"
          height={340}
          minWidth={0}
          initialDimension={{
            width: 640,
            height: 340,
          }}
        >
          <ComposedChart
            data={analysis.points}
            accessibilityLayer
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 5,
            }}
          >
            <CartesianGrid
              stroke="#1e293b"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{
                fill: "#94a3b8",
                fontSize: 11,
              }}
              minTickGap={24}
            />

            <YAxis
              width={75}
              tickFormatter={formatNumber}
              tick={{
                fill: "#94a3b8",
                fontSize: 11,
              }}
            />

            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{
                color: "#f1f5f9",
              }}
              labelFormatter={formatDate}
              formatter={(value) =>
                `${formatNumber(value)} ${unitLabel}`
              }
            />

            <Legend />

            <Bar
              dataKey="quantity"
              name="Günlük üretim"
              fill="#10b981"
              maxBarSize={44}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="movingAverage"
              name={`${analysis.rollingWindowDays} günlük ortalama`}
              stroke="#38bdf8"
              strokeWidth={3}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          Grafik dönemi: {formatDate(analysis.startDate)}
          {" – "}
          {formatDate(analysis.endDate)}. Boş sütunlar
          üretimin sıfır olduğunu değil, o gün için kayıt
          bulunmadığını gösterir.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Vardiya Karşılaştırması
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Seçilen dönemde vardiya bazlı üretim ve çalışma
            verileri
          </p>
        </div>

        {analysis.shiftSummary.length === 0 ? (
          <p className="py-10 text-sm text-slate-400">
            Vardiya karşılaştırması için yeterli kayıt
            bulunmuyor.
          </p>
        ) : (
          <>
            <ResponsiveContainer
              width="100%"
              height={280}
              minWidth={0}
              initialDimension={{
                width: 640,
                height: 280,
              }}
            >
              <BarChart
                data={analysis.shiftSummary}
                accessibilityLayer
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  stroke="#1e293b"
                  vertical={false}
                />

                <XAxis
                  dataKey="shiftCode"
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                />

                <YAxis
                  width={75}
                  tickFormatter={formatNumber}
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{
                    color: "#f1f5f9",
                  }}
                  formatter={(value) =>
                    `${formatNumber(value)} ${unitLabel}`
                  }
                />

                <Bar
                  dataKey="totalQuantity"
                  name="Toplam üretim"
                  fill="#8b5cf6"
                  maxBarSize={70}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {analysis.shiftSummary.map((shift) => (
                <article
                  key={shift.shiftCode}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">
                      {shift.shiftCode}
                    </p>

                    <p className="mt-1 font-medium">
                      {shift.shiftName}
                    </p>
                  </div>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">
                        Kayıt
                      </dt>

                      <dd>{shift.recordCount}</dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">
                        Toplam üretim
                      </dt>

                      <dd>
                        {formatNumber(
                          shift.totalQuantity,
                        )}{" "}
                        {unitLabel}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">
                        Kayıt ortalaması
                      </dt>

                      <dd>
                        {formatNumber(
                          shift.averageQuantity,
                        )}{" "}
                        {unitLabel}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">
                        Çalışma
                      </dt>

                      <dd>
                        {shift.totalOperatingMinutes} dk
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">
                        Saatlik üretim
                      </dt>

                      <dd>
                        {shift.quantityPerOperatingHour ===
                        null
                          ? "—"
                          : `${formatNumber(
                              shift.quantityPerOperatingHour,
                            )} ${unitLabel}/sa`}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}