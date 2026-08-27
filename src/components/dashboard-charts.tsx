"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardChartData } from "@/lib/queries/dashboard-charts";

type DashboardChartsProps = {
  data: DashboardChartData;
  downtimeSummary: {
    total: number;
    planned: number;
    unplanned: number;
  };
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
    ? number.toLocaleString("tr-TR", { maximumFractionDigits: 3 })
    : "—";
}

function formatDate(value: unknown) {
  const [year, month, day] = String(value).split("-");
  return [day, month, year].join(".");
}

export function DashboardCharts({
  data,
  downtimeSummary,
}: DashboardChartsProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const activeSeries =
    data.production.find((series) => series.id === selectedId) ??
    data.production[0];

  const typeData = [
    {
      name: "Planlı",
      minutes: downtimeSummary.planned,
      fill: "#f59e0b",
    },
    {
      name: "Plansız",
      minutes: downtimeSummary.unplanned,
      fill: "#ef4444",
    },
  ];

  const reasonChartHeight = Math.max(240, data.downtimeReasons.length * 44);

  return (
    <section className="my-10" aria-labelledby="dashboard-charts-title">
      <h2 id="dashboard-charts-title" className="mb-4 text-xl font-semibold">
        Üretim ve Duruş Grafikleri
      </h2>

      <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="font-semibold">Günlük üretim</h3>

        {!activeSeries ? (
          <p className="py-10 text-sm text-slate-400">
            Seçilen filtrelerde üretim kaydı bulunmuyor.
          </p>
        ) : (
          <>
            <label htmlFor="chart-series" className="mt-4 block text-sm text-slate-400">
              Grafikteki tesis ve ürün
            </label>
            <select
              id="chart-series"
              value={activeSeries.id}
              onChange={(event) => setSelectedId(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              {data.production.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.label} ({series.unit})
                </option>
              ))}
            </select>

            <p className="mb-4 mt-3 text-xs leading-5 text-slate-400">
              Ölçü birimi: {activeSeries.unit}. Aynı günün vardiyaları toplanır.
              Yalnız kayıt bulunan günler gösterilir; eksik günler sıfır sayılmaz.
              Bu seçim yalnız günlük üretim grafiğini değiştirir.
            </p>

            <ResponsiveContainer
              width="100%"
              height={280}
              minWidth={0}
              initialDimension={{ width: 320, height: 280 }}
            >
              <BarChart data={activeSeries.points} accessibilityLayer margin={{ right: 16, top: 12 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  minTickGap={24}
                />
                <YAxis
                  width={70}
                  tickFormatter={(value) => formatNumber(value)}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#f1f5f9" }}
                  cursor={{ fill: "#1e293b", opacity: 0.4 }}
                  labelFormatter={formatDate}
                  formatter={(value) => formatNumber(value) + " " + activeSeries.unit}
                />
                <Bar
                  dataKey="quantity"
                  name="Üretim"
                  fill="#10b981"
                  maxBarSize={48}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </article>

      <p className="mb-4 mt-6 text-xs leading-5 text-slate-400">
        Duruş grafikleri tesis ve başlangıç günü filtrelerini kullanır.
        Ürün seçimi bu iki grafiği değiştirmez. Süreler dakika cinsindedir.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-4 font-semibold">Nedene göre duruş süresi</h3>

          {data.downtimeReasons.length === 0 ? (
            <p className="py-10 text-sm text-slate-400">
              Seçilen filtrelerde duruş kaydı bulunmuyor.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <ResponsiveContainer
                width="100%"
                height={reasonChartHeight}
                minWidth={0}
                initialDimension={{ width: 320, height: reasonChartHeight }}
              >
                <BarChart
                  data={data.downtimeReasons}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ right: 20, left: 0 }}
                >
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    interval={0}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(value) => {
                      const name = String(value);
                      return name.length > 20 ? name.slice(0, 20) + "…" : name;
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#f1f5f9" }}
                    cursor={{ fill: "#1e293b", opacity: 0.4 }}
                    formatter={(value) => formatNumber(value) + " dk"}
                  />
                  <Bar
                    dataKey="minutes"
                    name="Duruş"
                    fill="#38bdf8"
                    maxBarSize={28}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold">Planlı / plansız duruş</h3>
          <p className="mt-2 text-sm text-slate-400">
            Toplam: {formatNumber(downtimeSummary.total)} dk
          </p>

          {downtimeSummary.total === 0 ? (
            <p className="py-10 text-sm text-slate-400">
              Gösterilecek duruş süresi bulunmuyor.
            </p>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={230}
              minWidth={0}
              initialDimension={{ width: 320, height: 230 }}
            >
              <PieChart accessibilityLayer>
                <Pie
                  data={typeData.filter((item) => item.minutes > 0)}
                  dataKey="minutes"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={85}
                  stroke="#0f172a"
                  isAnimationActive={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#f1f5f9" }}
                  formatter={(value) => formatNumber(value) + " dk"}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          <ul className="mt-3 space-y-3 text-sm">
            {typeData.map((item) => {
              const percentage = downtimeSummary.total > 0
                ? (item.minutes / downtimeSummary.total) * 100
                : 0;

              return (
                <li key={item.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    {item.name}
                  </span>
                  <span>
                    {formatNumber(item.minutes)} dk · %
                    {percentage.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
                  </span>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}