import { redirect } from "next/navigation";
import { organizationsPath } from "@/lib/organization-paths";

export default function PlayersPage() {
  redirect(organizationsPath);
}
