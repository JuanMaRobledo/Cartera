"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPercent } from "@/lib/format";

const GAIN = "#167c5a";
const LOSS = "#c94a43";

export interface AssetReturnPoint {
  ticker: string;
  totalReturnPct: number | null;
  annualizedReturn: number | null;
}

export function AssetReturnsChart({ data }: { data: AssetReturnPoint[] }) {
  const chartData = data
    .filter((point) => point.totalReturnPct != null)
    .map((point) => ({ ...point, value: point.totalReturnPct }));

  if (chartData.length === 0) {
    return <p className="text-sm text-slate-500">No hay flujos suficientes para graficar la rentabilidad.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 38)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 28 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => formatPercent(Number(value))} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="ticker" width={72} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, _name, item) => {
            const annualized = item.payload.annualizedReturn as number | null;
            return [
              `${formatPercent(Number(value))}${annualized != null ? ` · anual ${formatPercent(annualized)}` : ""}`,
              "Rentabilidad",
            ];
          }}
        />
        <Bar dataKey="value" radius={4}>
          {chartData.map((point) => (
            <Cell key={point.ticker} fill={(point.value ?? 0) >= 0 ? GAIN : LOSS} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
