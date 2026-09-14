"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/format";

const COLORS = ["#0ea5e9", "#6366f1", "#f59e0b", "#16a34a", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"];

export interface AllocationSlice {
  name: string;
  value: number;
}

export function AllocationDonut({ data, baseCurrency }: { data: AllocationSlice[]; baseCurrency: string }) {
  const positive = data.filter((d) => d.value > 0);
  if (positive.length === 0) return <p className="text-sm text-slate-500">Sin valor de mercado para graficar.</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={positive}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={1}
        >
          {positive.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatMoney(Number(value), baseCurrency)} />
        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
