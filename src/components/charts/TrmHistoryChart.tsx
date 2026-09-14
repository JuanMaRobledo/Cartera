"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/format";

export interface TrmPoint {
  date: string;
  trm: number;
}

export function TrmHistoryChart({ data }: { data: TrmPoint[] }) {
  if (data.length < 2) return <p className="text-sm text-slate-500">Cargá el histórico de TRM para ver el gráfico.</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(d)}
          tick={{ fontSize: 11 }}
          minTickGap={40}
        />
        <YAxis
          domain={["auto", "auto"]}
          tickFormatter={(v) => v.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
          tick={{ fontSize: 11 }}
          width={60}
        />
        <Tooltip
          labelFormatter={(d) => formatDate(d as string)}
          formatter={(value) => [`${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 })} COP`, "TRM"]}
        />
        <Line type="monotone" dataKey="trm" stroke="#0ea5e9" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
