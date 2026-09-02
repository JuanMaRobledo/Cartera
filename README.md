# Cartera

Aplicación web para el seguimiento de una cartera de inversiones personal con
posiciones en **múltiples monedas**, que calcula la **rentabilidad real**
separando cuánto de la ganancia viene del desempeño del activo y cuánto del
movimiento del tipo de cambio.

## Funcionalidad

- **Multi-moneda**: cada activo cotiza en su propia moneda; todo se convierte
  a una moneda base configurable usando el tipo de cambio vigente en la fecha
  de cada operación.
- **Promediación de costos**: costo promedio ponderado por activo (no FIFO),
  recalculado en cada compra.
- **Costo del cambio de moneda**: las transacciones de tipo "Cambio de
  moneda" registran el monto exacto que entra y sale en cada moneda, para
  capturar el spread/comisión bancaria real de ese día (no solo el tipo de
  cambio de mercado).
- **Comisiones**: se suman al costo en compras y se descuentan del producido
  en ventas y dividendos.
- **Ganancias y pérdidas realizadas y no realizadas**, con la descomposición
  clave: para cada venta y para cada posición abierta se separa
  - cuánto es **desempeño del activo** en su propia moneda, y
  - cuánto es **efecto del tipo de cambio** sobre el capital invertido.
- **Dividendos e intereses**, netos de comisión/retención.
- **Efectivo multi-moneda**: ledger simple de depósitos, retiros, compras,
  ventas, dividendos, intereses, comisiones y cambios de moneda.
- **Importación de archivos de broker** (`/importar`): subís el "Transaction
  History" o el "Activity Statement" de Interactive Brokers exportados como
  CSV, o un CSV con la plantilla propia de Cartera para otros brokers, y la
  app arma una vista previa de las transacciones antes de cargarlas.
- **Buscador de acciones/ETFs** (en Activos): lista de referencia con los
  tickers más comunes de EE.UU. y de la Bolsa de Colombia (BVC) para
  autocompletar nombre, mercado y moneda al dar de alta un activo — no es
  exhaustiva, así que lo que no aparezca se carga a mano como siempre.

El motor de cálculo está en `src/lib/portfolio.ts` y tiene tests unitarios en
`src/lib/portfolio.test.ts` que documentan y verifican la lógica (costo
promedio, descomposición local vs. FX, dividendos, TIR).

## Modelo de datos

- **Currency**: monedas conocidas por la app (código ISO, nombre, símbolo).
- **Account**: cuentas/brokers donde están las inversiones.
- **Asset**: activos (acción, ETF, bono, cripto, fondo…) con su moneda de
  cotización.
- **Transaction**: el registro central — compra, venta, dividendo, interés,
  comisión, depósito, retiro o cambio de moneda. Cada una guarda el tipo de
  cambio a moneda base vigente ese día (`fxRateToBase`).
- **FxRate**: tipos de cambio históricos por moneda y fecha (se cargan a
  mano; se usan también para autocompletar `fxRateToBase` al cargar una
  transacción si no se especifica).
- **PriceSnapshot**: precios de mercado de cada activo, para valuar las
  posiciones abiertas.

## Desplegarla en internet (Vercel + Neon, gratis)

La forma recomendada de usarla sin instalar nada es publicarla con un link
fijo:

1. **Base de datos** — creá una cuenta gratis en [neon.tech](https://neon.tech),
   creá un proyecto y copiá el "Connection string" (Postgres).
2. **Hosting** — creá una cuenta gratis en [vercel.com](https://vercel.com)
   (podés entrar con tu cuenta de GitHub), hacé **Add New → Project** e
   importá el repositorio `JuanMaRobledo/Cartera`.
3. En el paso de configuración del proyecto, abrí **Environment Variables**
   y agregá `DATABASE_URL` con el connection string de Neon del paso 1.
4. Hacé clic en **Deploy**. Vercel instala las dependencias, crea las
   tablas en la base (`prisma db push`, corre solo como parte del build) y
   compila la app. Al terminar te da una URL fija
   (`https://cartera-tu-usuario.vercel.app`) — esa es tu app.
5. Cada vez que se sube un cambio a la rama `main` del repositorio, Vercel
   vuelve a desplegar automáticamente.

Los datos quedan en Neon (en la nube), así que persisten entre despliegues y
accedés desde cualquier dispositivo con esa URL.

## Correrla en tu computadora

Requiere Node.js 20+ y una base Postgres (podés usar la misma de Neon, o
correr una local).

```bash
npm install
cp .env.example .env    # pegá tu DATABASE_URL de Postgres
npx prisma db push      # crea las tablas según el schema
npm run db:seed         # (opcional) carga datos de ejemplo
npm run dev             # http://localhost:3000
```

Otros comandos útiles:

```bash
npm run build   # build de producción
npm run lint    # ESLint
npm test        # tests del motor de cálculo (vitest)
```

## Flujo de uso sugerido

1. **Configuración**: elegí tu moneda base (la moneda en la que querés ver
   todo).
2. **Monedas**: agregá las monedas que usás (la base y cualquier otra en la
   que tengas activos o efectivo).
3. **Tipos de cambio**: cargá el tipo de cambio de cada moneda extranjera
   para las fechas relevantes (al menos uno reciente, para valuar la
   cartera hoy).
4. **Cuentas**: creá tus cuentas/brokers.
5. **Activos**: cargá los activos que operás, indicando en qué moneda
   cotizan.
6. **Transacciones**: cargá depósitos, compras, ventas, dividendos,
   comisiones y cambios de moneda a medida que ocurren.
7. **Activos → cargar precio actual**: mantené actualizado el precio de
   mercado de cada activo para ver la ganancia no realizada.
8. **Panel**: ahí ves el valor total, el retorno total y su descomposición
   entre desempeño del activo y efecto cambiario, por posición y a nivel de
   toda la cartera.

## Importar desde un broker

En `/importar` podés subir un CSV en lugar de cargar transacciones a mano:

- **Interactive Brokers (recomendado)**: descargá el reporte **"Transaction
  History"** (Reportes → Historial de transacciones), eligiendo el rango de
  fechas que quieras importar. Es el formato más confiable: usa una única
  tabla y la columna "Transaction Type" queda en inglés (Dividend, Buy,
  Sell, Foreign Tax Withholding…) sin importar el idioma configurado en tu
  cuenta.
- **Interactive Brokers (alternativa)**: el "Activity Statement" (Reportes →
  Statements → Activity) también funciona si tu cuenta está en inglés y el
  statement incluye las secciones Trades, Dividends, Withholding Tax,
  Deposits & Withdrawals, Interest y Fees (si armaste un statement solo con
  resúmenes de NAV/posiciones, no va a tener nada para importar).
- **Portafolios con columnas de efectivo/operaciones** (Symbol, Trade Date,
  Purchase Price, Quantity, Commission, Transaction Type, con `$$CASH_TX`
  para depósitos/retiros/comisiones): se detecta automáticamente. No trae
  columna de moneda, así que se asume USD para todas las filas.
- **Historial de órdenes de un bróker colombiano** (columnas en español:
  Fecha y hora, Símbolo de la acción, Tipo de orden, Estado, Acciones
  completadas…): solo se importan las órdenes con Estado "Aprobado"; en una
  ejecución parcial se toma la cantidad efectivamente ejecutada. Se asume
  COP para todas las filas (no trae columna de moneda).
- **Otros brokers**: usá la [plantilla CSV de Cartera](public/plantilla-cartera.csv)
  (columnas `type,date,ticker,quantity,price,currency,amount,commission,notes`)
  y completala con tus movimientos.

El formato se detecta automáticamente (o lo podés forzar). Antes de importar
nada se muestra una vista previa fila por fila: activos y monedas nuevos
quedan marcados, y las filas que no se pueden resolver (por ejemplo, una
moneda sin tipo de cambio cargado todavía, o un tipo de transacción que
todavía no reconocemos) aparecen deshabilitadas con el motivo, para que las
completes en Tipos de cambio o Activos y subas el archivo de nuevo. Solo se
importan las filas que dejás tildadas.

La lógica de parseo vive en `src/lib/imports/`: `ibkr.ts` (Activity
Statement), `ibkrTransactionHistory.ts` (Transaction History),
`yahooPortfolio.ts` (portafolio con `$$CASH_TX`), `coBrokerOrders.ts`
(historial de órdenes en español) y `generic.ts` (plantilla propia), cada
uno con sus tests en `*.test.ts`.

## Datos y persistencia

Los datos viven en `prisma/dev.db` (SQLite), un archivo local — no se suben
al repositorio (está en `.gitignore`). Para respaldar tu cartera, copiá ese
archivo.
