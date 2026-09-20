"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney } from "@/lib/format";

export interface NetWorthPoint {
  date: string;
  netWorthBase: number;
}

export function NetWorthHistoryChart({ data, baseCurrency }: { data: NetWorthPoint[]; baseCurrency: string }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Todavía no hay suficiente historial — se guarda una foto por día al actualizar precios o con el cron diario.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fontSize: 11 }} minTickGap={40} />
        <YAxis
          domain={["auto", "auto"]}
          tickFormatter={(v) => formatMoney(Number(v), baseCurrency)}
          tick={{ fontSize: 11 }}
          width={80}
        />
        <Tooltip
          labelFormatter={(d) => formatDate(d as string)}
          formatter={(value) => [formatMoney(Number(value), baseCurrency), "Patrimonio neto"]}
        />
        <Line type="monotone" dataKey="netWorthBase" stroke="#4f46e5" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
