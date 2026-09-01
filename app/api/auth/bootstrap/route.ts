import { ensureInitialOwner, getManager } from "../../../../lib/auth";

export async function POST() {
  try {
    const authorized = await ensureInitialOwner();
    if (!authorized) return Response.json({ error: "O primeiro acesso já foi assumido por outra administradora." }, { status: 403 });
    const manager = await getManager();
    return Response.json({ authorized: true, welcomePending: !manager?.welcomeSeenAt });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível concluir o cadastro." }, { status: 500 });
  }
}
