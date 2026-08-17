import { requireAdmin } from "@/lib/require-admin"

import { DebugDashboard } from "./debug-dashboard"

export default async function DebugPage() {
  await requireAdmin("/debug")

  return <DebugDashboard />
}
