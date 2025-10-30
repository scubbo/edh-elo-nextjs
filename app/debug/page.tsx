import { redirect, notFound } from "next/navigation"

import { getAuthSession } from "@/lib/auth"
import { ADMIN_EMAIL } from "@/lib/constants"

import { DebugDashboard } from "./debug-dashboard"

const SIGN_IN_URL = "/api/auth/signin?callbackUrl=%2Fdebug"

export default async function DebugPage() {
  const session = await getAuthSession()

  if (!session?.user?.email) {
    redirect(SIGN_IN_URL)
  }

  if (session.user.email !== ADMIN_EMAIL) {
    notFound()
  }

  return <DebugDashboard />
}
