import { redirect } from "next/navigation";
import { organizationsPath } from "@/lib/organization-paths";

export default function RulesPage() {
  redirect(organizationsPath);
}
