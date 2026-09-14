"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/format";

const GAIN = "#16a34a";
const LOSS = "#dc2626";

export function PerformanceBreakdownChart({
  totalReturn,
  localPerformance,
  fxEffect,
  baseCurrency,
}: {
  totalReturn: number;
  localPerformance: number;
  fxEffect: number;
  baseCurrency: string;
}) {
  const data = [
    { name: "Retorno total", value: totalReturn },
    { name: "Desempeño del activo", value: localPerformance },
    { name: "Efecto tipo de cambio", value: fxEffect },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => formatMoney(v, baseCurrency)} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatMoney(Number(value), baseCurrency)} />
        <Bar dataKey="value" radius={4}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? GAIN : LOSS} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
