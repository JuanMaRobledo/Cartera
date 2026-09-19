"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatPercent, signClass } from "@/lib/format";
import { ASSET_TYPE_LABELS } from "@/lib/enums";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { PerformanceBreakdownChart } from "@/components/charts/PerformanceBreakdownChart";
import { ColumnPicker, useVisibleColumns, type ColumnDef } from "@/components/ColumnPicker";

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
  totalInvestedBase: number;
  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;
  returnPct: number | null;
}

interface CashBalanceDto {
  currencyCode: string;
  balance: number;
  balanceBase: number | null;
}

interface CurrencyReturnDto {
  currencyCode: string;
  totalInvestedLocal: number;
  totalReturnLocal: number;
  returnPct: number | null;
}

interface SummaryDto {
  totalMarketValueBase: number;
  totalCostBase: number;
  totalInvestedBase: number;
  totalUnrealizedBase: number;
  totalRealizedBase: number;
  totalDividendsBase: number;
  totalFeesBase: number;
  totalCashBase: number;
  totalDebtBase: number;
  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;
  totalReturnPct: number | null;
  returnByCurrency: CurrencyReturnDto[];
  positionsMissingPrice: number;
}

interface PortfolioDto {
  baseCurrency: string;
  positions: PositionDto[];
  cashBalances: CashBalanceDto[];
  summary: SummaryDto;
}

interface AccountDto {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [accountId, setAccountId] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("ALL");
  const [searchFilter, setSearchFilter] = useState("");

  const load = (scopeAccountId: string) =>
    fetch(scopeAccountId ? `/api/portfolio?accountId=${scopeAccountId}` : "/api/portfolio")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("No se pudo cargar la cartera."));

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
  }, []);

  useEffect(() => {
    load(accountId);
  }, [accountId]);

  const refreshPrices = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/prices/refresh", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setRefreshMsg("No se pudieron actualizar los precios.");
        return;
      }
      const { updated, failed } = result as { updated: unknown[]; failed: { ticker: string; error: string }[] };
      setRefreshMsg(
        `Se actualizaron ${updated.length} precio(s)` +
          (failed.length > 0 ? `; sin datos para ${failed.map((f) => f.ticker).join(", ")}` : "."),
      );
      await load(accountId);
    } finally {
      setRefreshing(false);
    }
  };

  // Los hooks de abajo tienen que llamarse siempre, en el mismo orden, así
  // que van antes de los "return" tempranos de carga/error — usan valores
  // por defecto hasta que "data" llega.
  const baseCurrencyForColumns = data?.baseCurrency ?? "USD";
  const totalMarketValueBaseForColumns = data?.summary.totalMarketValueBase ?? 0;

  const columns = useMemo<ColumnDef<PositionDto>[]>(
    () => [
      {
        key: "activo",
        label: "Activo",
        defaultVisible: true,
        render: (p) => (
          <>
            <div className="font-medium">{p.ticker}</div>
            <div className="text-xs text-slate-500">{p.name}</div>
          </>
        ),
      },
      {
        key: "tipo",
        label: "Tipo",
        defaultVisible: true,
        render: (p) => ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType,
      },
      { key: "cantidad", label: "Cantidad", defaultVisible: true, render: (p) => (p.quantity !== 0 ? p.quantity : "—") },
      {
        key: "peso",
        label: "% Cartera",
        defaultVisible: true,
        render: (p) =>
          p.marketValueBase != null && totalMarketValueBaseForColumns > 0
            ? formatPercent(p.marketValueBase / totalMarketValueBaseForColumns)
            : "—",
      },
      {
        key: "costoProm",
        label: "Costo prom.",
        defaultVisible: true,
        render: (p) => (p.quantity !== 0 ? formatMoney(p.avgCostLocal, p.currencyCode) : "—"),
      },
      {
        key: "precioActual",
        label: "Precio actual",
        defaultVisible: true,
        render: (p) => (p.currentPriceLocal != null ? formatMoney(p.currentPriceLocal, p.currencyCode) : "—"),
      },
      {
        key: "valorMercado",
        label: "Valor mercado",
        defaultVisible: true,
        render: (p) => (p.marketValueBase != null ? formatMoney(p.marketValueBase, baseCurrencyForColumns) : "—"),
      },
      {
        key: "noRealizada",
        label: "No realizada",
        defaultVisible: true,
        render: (p) =>
          p.unrealizedPnLBase != null ? (
            <span className={signClass(p.unrealizedPnLBase)}>{formatMoney(p.unrealizedPnLBase, baseCurrencyForColumns)}</span>
          ) : (
            "—"
          ),
      },
      {
        key: "realizada",
        label: "Realizada",
        defaultVisible: true,
        render: (p) => <span className={signClass(p.realizedPnLBase)}>{formatMoney(p.realizedPnLBase, baseCurrencyForColumns)}</span>,
      },
      {
        key: "dividendos",
        label: "Dividendos",
        defaultVisible: false,
        render: (p) => formatMoney(p.dividendsBase, baseCurrencyForColumns),
      },
      {
        key: "comisiones",
        label: "Comisiones",
        defaultVisible: false,
        render: (p) => formatMoney(p.feesBase, baseCurrencyForColumns),
      },
      {
        key: "retornoTotal",
        label: "Retorno total",
        defaultVisible: true,
        render: (p) => <span className={signClass(p.totalReturnBase)}>{formatMoney(p.totalReturnBase, baseCurrencyForColumns)}</span>,
      },
      {
        key: "retornoPct",
        label: "Retorno %",
        defaultVisible: true,
        render: (p) => (p.returnPct != null ? <span className={signClass(p.returnPct)}>{formatPercent(p.returnPct)}</span> : "—"),
      },
      {
        key: "localVsFx",
        label: "Local vs. FX",
        defaultVisible: true,
        render: (p) => (
          <span className="text-xs">
            <span className={signClass(p.totalReturnLocalPerformanceBase)}>
              Activo: {formatMoney(p.totalReturnLocalPerformanceBase, baseCurrencyForColumns)}
            </span>
            <br />
            <span className={signClass(p.totalReturnFxEffectBase)}>
              FX: {formatMoney(p.totalReturnFxEffectBase, baseCurrencyForColumns)}
            </span>
          </span>
        ),
      },
    ],
    [baseCurrencyForColumns, totalMarketValueBaseForColumns],
  );
  const [visibleColumns, toggleColumn] = useVisibleColumns("cartera:columnas-posiciones", columns);
  const shownColumns = columns.filter((c) => visibleColumns.has(c.key));

  if (error) return <p className="loss-text">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando…</p>;

  const { summary, positions, cashBalances, baseCurrency } = data;
  const netWorth = summary.totalMarketValueBase + summary.totalCashBase - summary.totalDebtBase;
  const openPositions = positions.filter((p) => {
    if (p.quantity === 0) return false;
    if (assetTypeFilter !== "ALL" && p.assetType !== assetTypeFilter) return false;
    if (searchFilter.trim()) {
      const query = searchFilter.trim().toLowerCase();
      if (!`${p.ticker} ${p.name}`.toLowerCase().includes(query)) return false;
    }
    return true;
  });
  const closedPositions = positions.filter((p) => p.quantity === 0);

  const exportCsv = () => {
    const headers = ["Ticker", "Nombre", "Tipo", "Moneda", "Cantidad", "Precio actual", "Valor mercado", "Retorno", "Retorno %"];
    const rows = openPositions.map((p) => [p.ticker, p.name, p.assetType, p.currencyCode, p.quantity, p.currentPriceLocal ?? "", p.marketValueBase ?? "", p.totalReturnBase, p.returnPct ?? ""]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cartera-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const allocationByType = Object.entries(
    openPositions.reduce<Record<string, number>>((acc, p) => {
      const label = ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType;
      acc[label] = (acc[label] ?? 0) + (p.marketValueBase ?? 0);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Panel de cartera</h1>
          <p className="text-sm text-slate-500">Todo expresado en moneda base: {baseCurrency}</p>
          <div className="mt-2">
            <label className="label">Ver</label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Cartera completa (todas las cuentas)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  Solo {a.name}
                </option>
              ))}
            </select>
            {accountId && (
              <p className="mt-1 text-xs text-slate-500">
                Costo promedio y ganancias calculados solo con las operaciones de esta cuenta — una misma acción
                comprada en varios brokers va a aparecer con un costo promedio distinto acá que en la vista completa.
              </p>
            )}
          </div>
          {summary.positionsMissingPrice > 0 && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {summary.positionsMissingPrice} posición(es) sin precio actual cargado — no se incluyen en el valor de
              mercado. Actualizalos con el botón o cargalos a mano en Activos.
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" onClick={exportCsv} disabled={openPositions.length === 0}>Exportar CSV</button>
            <button className="btn-secondary" onClick={refreshPrices} disabled={refreshing}>
              {refreshing ? "Actualizando…" : "Actualizar precios"}
            </button>
          </div>
          {refreshMsg && <p className="mt-1 max-w-xs text-xs text-slate-500">{refreshMsg}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard label="Valor de mercado" value={formatMoney(summary.totalMarketValueBase, baseCurrency)} border="border-l-sky-500" />
        <SummaryCard
          label="Efectivo"
          value={formatMoney(summary.totalCashBase, baseCurrency)}
          border="border-l-sky-500"
        />
        <SummaryCard
          label="Deuda"
          value={formatMoney(summary.totalDebtBase, baseCurrency)}
          className={summary.totalDebtBase > 0 ? "loss-text" : undefined}
          border={summary.totalDebtBase > 0 ? "border-l-loss" : "border-l-slate-300"}
        />
        <SummaryCard label="Patrimonio neto" value={formatMoney(netWorth, baseCurrency)} border="border-l-indigo-500" />
        <SummaryCard
          label="Retorno total"
          value={formatMoney(summary.totalReturnBase, baseCurrency)}
          className={signClass(summary.totalReturnBase)}
          border={summary.totalReturnBase >= 0 ? "border-l-gain" : "border-l-loss"}
        />
      </div>

      {summary.totalDebtBase > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La deuda se resta del patrimonio neto y se muestra por separado. No forma parte del costo promedio ni del
          precio de coste de las posiciones.
        </p>
      )}

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
        <div className="mt-4">
          <PerformanceBreakdownChart
            totalReturn={summary.totalReturnBase}
            localPerformance={summary.totalReturnLocalPerformanceBase}
            fxEffect={summary.totalReturnFxEffectBase}
            baseCurrency={baseCurrency}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 font-medium">Retorno %</h2>
        <p className="mb-3 text-sm text-slate-500">
          Sobre el capital total puesto en cada activo alguna vez (no solo lo que sigue invertido hoy).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Cartera completa"
            value={summary.totalReturnPct}
            baseCurrency=""
            format={(v) => formatPercent(v)}
          />
          {summary.returnByCurrency.map((c) => (
            <Metric
              key={c.currencyCode}
              label={`En ${c.currencyCode} (sin efecto cambiario)`}
              value={c.returnPct}
              baseCurrency=""
              format={(v) => formatPercent(v)}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 font-medium">Composición de la cartera</h2>
        <p className="mb-3 text-sm text-slate-500">Valor de mercado de las posiciones abiertas, por tipo de activo.</p>
        <AllocationDonut data={allocationByType} baseCurrency={baseCurrency} />
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Posiciones abiertas</h2>
          <div className="flex flex-wrap gap-2">
            <input className="input w-44" placeholder="Buscar activo…" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} aria-label="Buscar activo" />
            <select className="input w-auto" value={assetTypeFilter} onChange={(e) => setAssetTypeFilter(e.target.value)} aria-label="Filtrar por tipo">
              <option value="ALL">Todos los tipos</option>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ColumnPicker columns={columns} visible={visibleColumns} onToggle={toggleColumn} />
          </div>
        </div>
        {openPositions.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no tenés posiciones abiertas.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                {shownColumns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openPositions.map((p) => (
                <tr key={p.assetId}>
                  {shownColumns.map((c) => (
                    <td key={c.key}>{c.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {closedPositions.length > 0 && (
        <details className="card overflow-x-auto">
          <summary className="cursor-pointer font-medium">Posiciones cerradas ({closedPositions.length})</summary>
          <table className="table-base mt-3">
            <thead>
              <tr>
                {shownColumns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closedPositions.map((p) => (
                <tr key={p.assetId}>
                  {shownColumns.map((c) => (
                    <td key={c.key}>{c.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

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

function SummaryCard({
  label,
  value,
  className,
  border,
}: {
  label: string;
  value: string;
  className?: string;
  border?: string;
}) {
  return (
    <div className={`stat-card ${border ?? "border-l-slate-300"}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${className ?? ""}`}>{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  baseCurrency,
  format,
}: {
  label: string;
  value: number | null;
  baseCurrency: string;
  format?: (value: number) => string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${value != null ? signClass(value) : ""}`}>
        {value == null ? "—" : format ? format(value) : formatMoney(value, baseCurrency)}
      </div>
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
