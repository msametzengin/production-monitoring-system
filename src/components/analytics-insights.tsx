"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DowntimeParetoAnalysis,
  ProductionAnalyticsSeries,
} from "@/lib/analytics/types";

type AnalyticsInsightsProps = {
  production: ProductionAnalyticsSeries[];
  downtime: DowntimeParetoAnalysis;
};

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
};

const categoryLabels: Record<string, string> = {
  MAINTENANCE: "Bakım",
  BREAKDOWN: "Arıza",
  ENERGY: "Enerji",
  RAW_MATERIAL: "Hammadde",
  PERSONNEL: "Personel",
  CLEANING: "Temizlik",
  PROCESS: "Proses",
  OTHER: "Diğer",
};

function formatNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("tr-TR", {
      maximumFractionDigits: 3,
    })
    : "—";
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  return [day, month, year].join(".");
}

export function AnalyticsInsights({
  production,
  downtime,
}: AnalyticsInsightsProps) {
  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const activeSeries =
    production.find(
      (series) => series.id === selectedId,
    ) ?? production[0];

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">
            Tahmini Üretim Kaybı
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Gerçekleşen saatlik üretim hızının duruş
            süresi boyunca korunacağı varsayımıyla
            hesaplanır.
          </p>
        </div>

        {!activeSeries ? (
          <p className="py-10 text-sm text-slate-400">
            Kayıp hesabı için üretim kaydı bulunmuyor.
          </p>
        ) : (
          <>
            <label
              htmlFor="loss-series"
              className="block text-sm text-slate-400"
            >
              Analiz edilecek tesis ve ürün
            </label>

            <select
              id="loss-series"
              value={activeSeries.id}
              onChange={(event) =>
                setSelectedId(Number(event.target.value))
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              {production.map((series) => (
                <option
                  key={series.id}
                  value={series.id}
                >
                  {series.label} ({series.unitLabel})
                </option>
              ))}
            </select>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Toplam tahmini kayıp
                </p>

                <p className="mt-2 text-xl font-bold text-red-400">
                  {formatNumber(
                    activeSeries.lossEstimate
                      .totalEstimatedLoss,
                  )}{" "}
                  {activeSeries.unitLabel}
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Plansız duruş kaybı
                </p>

                <p className="mt-2 text-xl font-bold text-red-400">
                  {formatNumber(
                    activeSeries.lossEstimate
                      .unplannedEstimatedLoss,
                  )}{" "}
                  {activeSeries.unitLabel}
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Planlı duruş kaybı
                </p>

                <p className="mt-2 text-xl font-bold text-amber-400">
                  {formatNumber(
                    activeSeries.lossEstimate
                      .plannedEstimatedLoss,
                  )}{" "}
                  {activeSeries.unitLabel}
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Tahmini kayıp oranı
                </p>

                <p className="mt-2 text-xl font-bold">
                  {activeSeries.lossEstimate.lossRate ===
                    null
                    ? "—"
                    : `%${formatNumber(
                      activeSeries.lossEstimate
                        .lossRate,
                    )}`}
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Hesaba giren duruş
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatNumber(
                    activeSeries.lossEstimate
                      .totalDowntimeMinutes,
                  )}{" "}
                  dk
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Saatlik üretim hızı
                </p>

                <p className="mt-2 text-xl font-bold text-sky-400">
                  {formatNumber(
                    activeSeries.lossEstimate
                      .quantityPerOperatingHour,
                  )}{" "}
                  {activeSeries.unitLabel}/sa
                </p>
              </article>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              Duruş kayıtları tesis seviyesindedir. Aynı
              tesiste birden fazla ürün varsa sonuç,
              seçilen ürün serisinin saatlik hızına göre
              ayrı ayrı tahmin edilir.
            </p>
          </>
        )}
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5">
          <h2 className="mt-2 text-xl font-semibold">
            Duruş Pareto Analizi
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            En fazla üretim kaybına neden olan duruş
            nedenleri ve kümülatif %80 sınırı
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">
              Toplam duruş
            </p>

            <p className="mt-2 text-xl font-bold">
              {downtime.totalMinutes.toLocaleString(
                "tr-TR",
              )}{" "}
              dk
            </p>
          </article>

          <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">
              Duruş kaydı
            </p>

            <p className="mt-2 text-xl font-bold">
              {downtime.totalRecords}
            </p>
          </article>

          <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">
              Kritik neden
            </p>

            <p className="mt-2 text-xl font-bold text-amber-400">
              {downtime.vitalReasonCount}
            </p>
          </article>
        </div>

        {downtime.items.length === 0 ? (
          <p className="py-10 text-sm text-slate-400">
            Seçilen filtrelerde Pareto analizi için
            duruş kaydı bulunmuyor.
          </p>
        ) : (
          <>
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
                data={downtime.items}
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
                  dataKey="code"
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  yAxisId="minutes"
                  width={70}
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 11,
                  }}
                  tickFormatter={formatNumber}
                />

                <YAxis
                  yAxisId="percentage"
                  orientation="right"
                  domain={[0, 100]}
                  width={50}
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    `%${formatNumber(value)}`
                  }
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{
                    color: "#f1f5f9",
                  }}
                  formatter={(value, name) =>
                    String(name) ===
                      "Kümülatif oran"
                      ? `%${formatNumber(value)}`
                      : `${formatNumber(value)} dk`
                  }
                />

                <Legend />

                <ReferenceLine
                  yAxisId="percentage"
                  y={80}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{
                    value: "%80",
                    fill: "#f59e0b",
                  }}
                />

                <Bar
                  yAxisId="minutes"
                  dataKey="minutes"
                  name="Duruş süresi"
                  fill="#ef4444"
                  maxBarSize={60}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />

                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="cumulativePercentage"
                  name="Kümülatif oran"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">
                      Neden
                    </th>
                    <th className="px-4 py-3">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-right">
                      Süre
                    </th>
                    <th className="px-4 py-3 text-right">
                      Oran
                    </th>
                    <th className="px-4 py-3 text-right">
                      Kümülatif
                    </th>
                    <th className="px-4 py-3">
                      Öncelik
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {downtime.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {item.code} · {item.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.recordCount} kayıt
                        </p>
                      </td>

                      <td className="px-4 py-3 text-slate-400">
                        {categoryLabels[
                          item.category
                        ] ?? item.category}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {item.minutes.toLocaleString(
                          "tr-TR",
                        )}{" "}
                        dk
                      </td>

                      <td className="px-4 py-3 text-right">
                        %
                        {item.percentage.toLocaleString(
                          "tr-TR",
                          {
                            maximumFractionDigits: 1,
                          },
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        %
                        {item.cumulativePercentage.toLocaleString(
                          "tr-TR",
                          {
                            maximumFractionDigits: 1,
                          },
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {item.isVital ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-400">
                            Kritik
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            İkincil
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Ürün filtresi duruş Pareto’sunu etkilemez;
          duruş kayıtları tesis ve başlangıç tarihine
          göre değerlendirilir.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5">
          <h2 className="mt-2 text-xl font-semibold">
            Üretim Anomalileri
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Günlük üretimde istatistiksel olarak olağan
            aralığın dışında kalan değerler
          </p>
        </div>

        {!activeSeries ? (
          <p className="py-10 text-sm text-slate-400">
            Anomali analizi için üretim kaydı
            bulunmuyor.
          </p>
        ) : (
          <>
            <label
              htmlFor="anomaly-series"
              className="block text-sm text-slate-400"
            >
              Analiz edilecek tesis ve ürün
            </label>

            <select
              id="anomaly-series"
              value={activeSeries.id}
              onChange={(event) =>
                setSelectedId(
                  Number(event.target.value),
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              {production.map((series) => (
                <option
                  key={series.id}
                  value={series.id}
                >
                  {series.label} (
                  {series.unitLabel})
                </option>
              ))}
            </select>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Gözlem
                </p>

                <p className="mt-2 text-xl font-bold">
                  {
                    activeSeries.anomalySummary
                      .sampleSize
                  }
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Anomali
                </p>

                <p
                  className={
                    activeSeries.anomalySummary
                      .anomalyCount > 0
                      ? "mt-2 text-xl font-bold text-red-400"
                      : "mt-2 text-xl font-bold text-emerald-400"
                  }
                >
                  {
                    activeSeries.anomalySummary
                      .anomalyCount
                  }
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  Yöntem
                </p>

                <p className="mt-2 text-xl font-bold">
                  IQR × 1,5
                </p>
              </article>
            </div>

            {activeSeries.anomalySummary
              .sampleSize < 4 ? (
              <p className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                Güvenilir IQR analizi için en az 4
                kayıtlı üretim günü gereklidir.
              </p>
            ) : (
              <>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 p-4">
                    <p className="text-xs text-slate-500">
                      Alt sınır
                    </p>

                    <p className="mt-2 font-semibold">
                      {formatNumber(
                        activeSeries.anomalySummary
                          .lowerBound,
                      )}{" "}
                      {activeSeries.unitLabel}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-800 p-4">
                    <p className="text-xs text-slate-500">
                      Medyan
                    </p>

                    <p className="mt-2 font-semibold">
                      {formatNumber(
                        activeSeries.anomalySummary
                          .median,
                      )}{" "}
                      {activeSeries.unitLabel}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-800 p-4">
                    <p className="text-xs text-slate-500">
                      Üst sınır
                    </p>

                    <p className="mt-2 font-semibold">
                      {formatNumber(
                        activeSeries.anomalySummary
                          .upperBound,
                      )}{" "}
                      {activeSeries.unitLabel}
                    </p>
                  </div>
                </div>

                {activeSeries.anomalySummary
                  .points.length === 0 ? (
                  <p className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    Seçilen dönemde IQR sınırlarını
                    aşan üretim değeri bulunmadı.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {activeSeries.anomalySummary.points.map(
                      (point) => (
                        <article
                          key={point.date}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium">
                              {formatDate(point.date)}
                            </p>

                            <p className="mt-1 text-xs text-red-200/70">
                              {point.direction ===
                                "HIGH"
                                ? "Beklenen aralığın üzerinde"
                                : "Beklenen aralığın altında"}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-semibold text-red-300">
                              {formatNumber(
                                point.quantity,
                              )}{" "}
                              {
                                activeSeries.unitLabel
                              }
                            </p>

                            <p className="mt-1 text-xs text-red-200/70">
                              Medyana göre{" "}
                              {point.deviationPercent ===
                                null
                                ? "—"
                                : `%${point.deviationPercent.toLocaleString(
                                  "tr-TR",
                                  {
                                    maximumFractionDigits: 1,
                                  },
                                )}`}
                            </p>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </>
            )}

            <p className="mt-5 text-xs leading-5 text-slate-500">
              Anomali, hatalı kayıt anlamına gelmez.
              Bakım, hammadde, vardiya veya proses
              koşullarıyla birlikte incelenmesi gereken
              olağandışı değeri işaretler.
            </p>
          </>
        )}
      </section>
    </div>
  );
}