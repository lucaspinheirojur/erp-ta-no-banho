import Home from "../page";
import { requireManager } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function GestaoPage() {
  await requireManager("/gestao");
  return <Home />;
}
