// No usa JSX ni React.createElement a propósito: tanto el JSX como el
// createElement de "react" quedan reescritos por el compilador de Next.js
// (Turbopack) para usar su React interno, que etiqueta los elementos con
// Symbol(react.transitional.element) — pero el reconciliador de
// @react-pdf/renderer (@react-pdf/reconciler) trae su propia copia fija de
// React 18 y solo reconoce Symbol(react.element), así que rechaza esos
// elementos con "Objects are not valid as a React child". Construir el
// objeto elemento a mano con ese símbolo evita depender de cuál "react"
// termine resolviendo el bundler.
import { Document, Page, StyleSheet, Text, View, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import type { AssetPosition, PortfolioSummary } from "@/lib/portfolio";

const REACT_ELEMENT_TYPE = Symbol.for("react.element");

function h(type: unknown, props: Record<string, unknown> | null, children?: unknown): ReactElement {
  const { key, ...rest } = props ?? {};
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key: (key as string | undefined) ?? null,
    ref: null,
    props: children !== undefined ? { ...rest, children } : rest,
    _owner: null,
  } as unknown as ReactElement;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#64748b", marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  statBox: { minWidth: 130, marginRight: 12, marginBottom: 8 },
  statLabel: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: 700 },
  table: { display: "flex", width: "100%" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingVertical: 3,
  },
  th: { fontSize: 8, fontWeight: 700, color: "#475569" },
  td: { fontSize: 8, color: "#0f172a" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
});

const POSITION_COLS = [
  { key: "ticker", label: "Activo", width: "14%" },
  { key: "quantity", label: "Cantidad", width: "10%" },
  { key: "avgCostBase", label: "Costo prom.", width: "14%" },
  { key: "marketValueBase", label: "Valor mercado", width: "14%" },
  { key: "weight", label: "% Cartera", width: "10%" },
  { key: "unrealizedPnLBase", label: "No realizada", width: "14%" },
  { key: "totalReturnBase", label: "Retorno total", width: "14%" },
  { key: "returnPct", label: "Retorno %", width: "10%" },
] as const;

function stat(label: string, value: string) {
  return h(View, { style: styles.statBox, key: label }, [
    h(Text, { style: styles.statLabel, key: "l" }, label),
    h(Text, { style: styles.statValue, key: "v" }, value),
  ]);
}

export function PortfolioReport({
  baseCurrency,
  accountName,
  positions,
  summary,
}: {
  baseCurrency: string;
  accountName: string | null;
  positions: AssetPosition[];
  summary: PortfolioSummary;
}): ReactElement<DocumentProps> {
  const openPositions = positions.filter((p) => Math.abs(p.quantity) > 1e-9);
  const netWorthBase = summary.totalMarketValueBase + summary.totalCashBase - summary.totalDebtBase;

  const summaryStats = [
    stat("Patrimonio neto", formatMoney(netWorthBase, baseCurrency)),
    stat("Valor de mercado", formatMoney(summary.totalMarketValueBase, baseCurrency)),
    stat("Efectivo", formatMoney(summary.totalCashBase, baseCurrency)),
    stat("Deuda", formatMoney(summary.totalDebtBase, baseCurrency)),
    stat("Retorno % total", summary.totalReturnPct != null ? formatPercent(summary.totalReturnPct) : "—"),
    stat("Ganancia realizada", formatMoney(summary.totalRealizedBase, baseCurrency)),
    stat("Ganancia no realizada", formatMoney(summary.totalUnrealizedBase, baseCurrency)),
    stat("Dividendos e intereses", formatMoney(summary.totalDividendsBase, baseCurrency)),
    stat("Comisiones / gastos", formatMoney(summary.totalFeesBase, baseCurrency)),
  ];

  const currencyStats = summary.returnByCurrency.map((c) =>
    stat(`En ${c.currencyCode} (sin efecto cambiario)`, c.returnPct != null ? formatPercent(c.returnPct) : "—"),
  );
  const usdCopFxStats = summary.usdCopFx
    ? [
        stat(
          "TRM promedio de compra",
          summary.usdCopFx.avgPurchaseTrm != null
            ? `${summary.usdCopFx.avgPurchaseTrm.toLocaleString("es-CO", { maximumFractionDigits: 2 })} COP/USD`
            : "—",
        ),
        stat(
          "TRM actual",
          summary.usdCopFx.currentTrmToCop != null
            ? `${summary.usdCopFx.currentTrmToCop.toLocaleString("es-CO", { maximumFractionDigits: 2 })} COP/USD`
            : "—",
        ),
        stat(
          "Efecto USD/COP abierto",
          summary.usdCopFx.unrealizedFxPnLCop != null
            ? formatMoney(summary.usdCopFx.unrealizedFxPnLCop, "COP")
            : "—",
        ),
        stat(
          "Efecto USD/COP total",
          summary.usdCopFx.totalFxPnLCop != null ? formatMoney(summary.usdCopFx.totalFxPnLCop, "COP") : "—",
        ),
      ]
    : [];

  const headerRow = h(
    View,
    { style: styles.tableHeaderRow },
    POSITION_COLS.map((c) => h(Text, { key: c.key, style: [styles.th, { width: c.width }] }, c.label)),
  );

  const positionRows = openPositions.map((p) => {
    const weight = summary.totalMarketValueBase > 0 ? (p.marketValueBase ?? 0) / summary.totalMarketValueBase : 0;
    return h(View, { key: p.assetId, style: styles.tableRow, wrap: false }, [
      h(Text, { key: "ticker", style: [styles.td, { width: "14%" }] }, p.ticker),
      h(Text, { key: "qty", style: [styles.td, { width: "10%" }] }, p.quantity.toLocaleString("es-AR")),
      h(Text, { key: "avg", style: [styles.td, { width: "14%" }] }, formatMoney(p.avgCostBase, "")),
      h(
        Text,
        { key: "mv", style: [styles.td, { width: "14%" }] },
        p.marketValueBase != null ? formatMoney(p.marketValueBase, "") : "—",
      ),
      h(Text, { key: "w", style: [styles.td, { width: "10%" }] }, formatPercent(weight)),
      h(
        Text,
        { key: "unr", style: [styles.td, { width: "14%" }] },
        p.unrealizedPnLBase != null ? formatMoney(p.unrealizedPnLBase, "") : "—",
      ),
      h(Text, { key: "tot", style: [styles.td, { width: "14%" }] }, formatMoney(p.totalReturnBase, "")),
      h(
        Text,
        { key: "pct", style: [styles.td, { width: "10%" }] },
        p.returnPct != null ? formatPercent(p.returnPct) : "—",
      ),
    ]);
  });

  const children = [
    h(Text, { key: "title", style: styles.h1 }, "Reporte de cartera"),
    h(
      Text,
      { key: "subtitle", style: styles.subtitle },
      `${accountName ? `Cuenta: ${accountName} · ` : "Todas las cuentas · "}Moneda base: ${baseCurrency} · Generado el ${formatDate(new Date())}`,
    ),
    h(Text, { key: "s1", style: styles.sectionTitle }, "Resumen"),
    h(View, { key: "stats", style: styles.statsRow }, summaryStats),
  ];

  if (currencyStats.length > 0) {
    children.push(
      h(Text, { key: "s2", style: styles.sectionTitle }, "Retorno % por moneda"),
      h(View, { key: "currencyStats", style: styles.statsRow }, currencyStats),
    );
  }

  if (usdCopFxStats.length > 0) {
    children.push(
      h(Text, { key: "sfx", style: styles.sectionTitle }, "Efecto del dólar frente al peso"),
      h(View, { key: "usdCopFxStats", style: styles.statsRow }, usdCopFxStats),
    );
  }

  children.push(
    h(Text, { key: "s3", style: styles.sectionTitle }, `Posiciones abiertas (${openPositions.length})`),
    h(View, { key: "table", style: styles.table }, [headerRow, ...positionRows]),
    h(
      Text,
      {
        key: "footer",
        style: styles.footer,
        fixed: true,
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Cartera · página ${pageNumber} de ${totalPages}`,
      },
    ),
  );

  return h(Document, null, h(Page, { size: "A4", style: styles.page }, children)) as ReactElement<DocumentProps>;
}
