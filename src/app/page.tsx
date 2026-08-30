"use client";

import { useEffect, useState } from "react";
import { formatMoney, signClass } from "@/lib/format";
import { ASSET_TYPE_LABELS } from "@/lib/enums";

interface PositionDto {
  assetId: string;
  ticker: string;
  name: string;
  assetType: string;
  currencyCode: string;
  quantity: number;
  avgCostLocal: number;
  costBasisBase: number;
  currentPriceLocal: number | null;
  marketValueBase: number | null;
  unrealizedPnLBase: number | null;
  realizedPnLBase: number;
  dividendsBase: number;
  feesBase: number;
  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;
}

interface CashBalanceDto {
  currencyCode: string;
  balance: number;
  balanceBase: number | null;
}

interface SummaryDto {
  totalMarketValueBase: number;
  totalCostBase: number;
  totalUnrealizedBase: number;
  totalRealizedBase: number;
  totalDividendsBase: number;
  totalFeesBase: number;
  totalCashBase: number;
  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;
  positionsMissingPrice: number;
}

interface PortfolioDto {
  baseCurrency: string;
  positions: PositionDto[];
  cashBalances: CashBalanceDto[];
  summary: SummaryDto;
}

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("No se pudo cargar la cartera."));
  }, []);

  if (error) return <p className="loss-text">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando…</p>;

  const { summary, positions, cashBalances, baseCurrency } = data;
  const investedTotal = summary.totalMarketValueBase + summary.totalCashBase;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel de cartera</h1>
        <p className="text-sm text-slate-500">Todo expresado en moneda base: {baseCurrency}</p>
        {summary.positionsMissingPrice > 0 && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {summary.positionsMissingPrice} posición(es) sin precio actual cargado — no se incluyen en el valor de
            mercado. Cargalo en Activos.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Valor de mercado" value={formatMoney(summary.totalMarketValueBase, baseCurrency)} />
        <SummaryCard label="Efectivo" value={formatMoney(summary.totalCashBase, baseCurrency)} />
        <SummaryCard label="Patrimonio total" value={formatMoney(investedTotal, baseCurrency)} />
        <SummaryCard
          label="Retorno total"
          value={formatMoney(summary.totalReturnBase, baseCurrency)}
          className={signClass(summary.totalReturnBase)}
        />
      </div>

      <div className="card">
        <h2 className="mb-3 font-medium">La verdadera rentabilidad: desempeño del activo vs. tipo de cambio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Retorno total"
            value={summary.totalReturnBase}
            baseCurrency={baseCurrency}
          />
          <Metric
            label="Por desempeño del activo"
            value={summary.totalReturnLocalPerformanceBase}
            baseCurrency={baseCurrency}
          />
          <Metric
            label="Por efecto del tipo de cambio"
            value={summary.totalReturnFxEffectBase}
            baseCurrency={baseCurrency}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
          <Row label="Ganancia realizada" value={formatMoney(summary.totalRealizedBase, baseCurrency)} />
          <Row label="Ganancia no realizada" value={formatMoney(summary.totalUnrealizedBase, baseCurrency)} />
          <Row label="Dividendos e intereses" value={formatMoney(summary.totalDividendsBase, baseCurrency)} />
          <Row label="Comisiones / gastos" value={formatMoney(summary.totalFeesBase, baseCurrency)} />
        </dl>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">Posiciones</h2>
        {positions.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no cargaste transacciones.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Activo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Costo prom.</th>
                <th>Precio actual</th>
                <th>Valor mercado</th>
                <th>No realizada</th>
                <th>Realizada</th>
                <th>Retorno total</th>
                <th>Local vs. FX</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.assetId}>
                  <td>
                    <div className="font-medium">{p.ticker}</div>
                    <div className="text-xs text-slate-500">{p.name}</div>
                  </td>
                  <td>{ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType}</td>
                  <td>{p.quantity}</td>
                  <td>{formatMoney(p.avgCostLocal, p.currencyCode)}</td>
                  <td>{p.currentPriceLocal != null ? formatMoney(p.currentPriceLocal, p.currencyCode) : "—"}</td>
                  <td>{p.marketValueBase != null ? formatMoney(p.marketValueBase, baseCurrency) : "—"}</td>
                  <td className={signClass(p.unrealizedPnLBase ?? 0)}>
                    {p.unrealizedPnLBase != null ? formatMoney(p.unrealizedPnLBase, baseCurrency) : "—"}
                  </td>
                  <td className={signClass(p.realizedPnLBase)}>{formatMoney(p.realizedPnLBase, baseCurrency)}</td>
                  <td className={signClass(p.totalReturnBase)}>{formatMoney(p.totalReturnBase, baseCurrency)}</td>
                  <td className="text-xs">
                    <span className={signClass(p.totalReturnLocalPerformanceBase)}>
                      Activo: {formatMoney(p.totalReturnLocalPerformanceBase, baseCurrency)}
                    </span>
                    <br />
                    <span className={signClass(p.totalReturnFxEffectBase)}>
                      FX: {formatMoney(p.totalReturnFxEffectBase, baseCurrency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">Saldos de efectivo</h2>
        {cashBalances.length === 0 ? (
          <p className="text-sm text-slate-500">Sin movimientos de efectivo todavía.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Moneda</th>
                <th>Saldo</th>
                <th>Equivalente en {baseCurrency}</th>
              </tr>
            </thead>
            <tbody>
              {cashBalances.map((c) => (
                <tr key={c.currencyCode}>
                  <td>{c.currencyCode}</td>
                  <td>{formatMoney(c.balance, c.currencyCode)}</td>
                  <td>{c.balanceBase != null ? formatMoney(c.balanceBase, baseCurrency) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${className ?? ""}`}>{value}</div>
    </div>
  );
}

function Metric({ label, value, baseCurrency }: { label: string; value: number; baseCurrency: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${signClass(value)}`}>{formatMoney(value, baseCurrency)}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
