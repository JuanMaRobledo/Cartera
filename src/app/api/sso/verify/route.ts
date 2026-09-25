import { consumeTicket } from "@/lib/sso";

export async function POST(request: Request) {
  try {
    const { code, app } = await request.json();
    if (app !== "modelo" && app !== "presupuesto") return Response.json({ error: "Aplicación desconocida" }, { status: 400 });
    const ticket = await consumeTicket(code);
    if (!ticket || ticket.app !== app) return Response.json({ error: "Código vencido o inválido" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return Response.json({ path: ticket.path }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No se pudo verificar el acceso" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
