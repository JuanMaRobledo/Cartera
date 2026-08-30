import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { id: 1 },
    update: { baseCurrency: "USD" },
    create: { id: 1, baseCurrency: "USD" },
  });

  const currencies = [
    { code: "USD", name: "Dólar estadounidense", symbol: "US$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "ARS", name: "Peso argentino", symbol: "AR$" },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({ where: { code: c.code }, update: c, create: c });
  }

  const account = await prisma.account.upsert({
    where: { id: "seed-account-ibkr" },
    update: {},
    create: { id: "seed-account-ibkr", name: "Interactive Brokers", broker: "IBKR", kind: "BROKERAGE" },
  });

  const aapl = await prisma.asset.upsert({
    where: { ticker_exchange: { ticker: "AAPL", exchange: "NASDAQ" } },
    update: {},
    create: { ticker: "AAPL", name: "Apple Inc.", assetType: "STOCK", currencyCode: "USD", exchange: "NASDAQ" },
  });

  const sap = await prisma.asset.upsert({
    where: { ticker_exchange: { ticker: "SAP", exchange: "XETRA" } },
    update: {},
    create: { ticker: "SAP", name: "SAP SE", assetType: "STOCK", currencyCode: "EUR", exchange: "XETRA" },
  });

  const fxRates: { currencyCode: string; date: string; rate: number }[] = [
    { currencyCode: "EUR", date: "2023-06-01", rate: 1.07 },
    { currencyCode: "EUR", date: "2024-01-01", rate: 1.1 },
    { currencyCode: "EUR", date: "2024-06-01", rate: 1.08 },
    { currencyCode: "EUR", date: "2025-01-01", rate: 1.04 },
    { currencyCode: "USD", date: "2023-01-01", rate: 1 },
  ];
  for (const r of fxRates) {
    await prisma.fxRate.upsert({
      where: { currencyCode_date: { currencyCode: r.currencyCode, date: new Date(r.date) } },
      update: { rate: r.rate },
      create: { currencyCode: r.currencyCode, date: new Date(r.date), rate: r.rate },
    });
  }

  await prisma.transaction.createMany({
    data: [
      {
        accountId: account.id,
        type: "DEPOSIT",
        date: new Date("2023-06-01"),
        currencyCode: "USD",
        fxRateToBase: 1,
        amount: 20000,
      },
      {
        accountId: account.id,
        assetId: aapl.id,
        type: "BUY",
        date: new Date("2023-06-15"),
        quantity: 20,
        price: 180,
        currencyCode: "USD",
        fxRateToBase: 1,
        commission: 5,
      },
      {
        accountId: account.id,
        assetId: aapl.id,
        type: "BUY",
        date: new Date("2024-01-10"),
        quantity: 10,
        price: 190,
        currencyCode: "USD",
        fxRateToBase: 1,
        commission: 5,
      },
      {
        accountId: account.id,
        assetId: aapl.id,
        type: "SELL",
        date: new Date("2024-06-05"),
        quantity: 10,
        price: 195,
        currencyCode: "USD",
        fxRateToBase: 1,
        commission: 5,
      },
      {
        accountId: account.id,
        assetId: aapl.id,
        type: "DIVIDEND",
        date: new Date("2024-08-15"),
        currencyCode: "USD",
        fxRateToBase: 1,
        amount: 15,
      },
      {
        accountId: account.id,
        type: "FX_CONVERT",
        date: new Date("2024-01-01"),
        currencyCode: "USD",
        fxRateToBase: 1,
        fxFromCurrency: "USD",
        fxFromAmount: 3300,
        fxToCurrency: "EUR",
        fxToAmount: 3000,
      },
      {
        accountId: account.id,
        assetId: sap.id,
        type: "BUY",
        date: new Date("2024-01-02"),
        quantity: 20,
        price: 150,
        currencyCode: "EUR",
        fxRateToBase: 1.1,
        commission: 4,
      },
    ],
  });

  await prisma.priceSnapshot.upsert({
    where: { assetId_date: { assetId: aapl.id, date: new Date("2025-08-30") } },
    update: { price: 232 },
    create: { assetId: aapl.id, date: new Date("2025-08-30"), price: 232 },
  });
  await prisma.priceSnapshot.upsert({
    where: { assetId_date: { assetId: sap.id, date: new Date("2025-08-30") } },
    update: { price: 175 },
    create: { assetId: sap.id, date: new Date("2025-08-30"), price: 175 },
  });
  await prisma.fxRate.upsert({
    where: { currencyCode_date: { currencyCode: "EUR", date: new Date("2025-08-30") } },
    update: { rate: 1.04 },
    create: { currencyCode: "EUR", date: new Date("2025-08-30"), rate: 1.04 },
  });

  console.log("Datos de ejemplo cargados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
