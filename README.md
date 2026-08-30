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

## Cómo correrla

Requiere Node.js 20+.

```bash
npm install
cp .env.example .env    # define DATABASE_URL (SQLite local)
npx prisma db push      # crea prisma/dev.db según el schema
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

## Datos y persistencia

Los datos viven en `prisma/dev.db` (SQLite), un archivo local — no se suben
al repositorio (está en `.gitignore`). Para respaldar tu cartera, copiá ese
archivo.
