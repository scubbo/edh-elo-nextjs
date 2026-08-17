import { notFound, redirect } from "next/navigation"

import { getAuthSession } from "@/lib/auth"
import { ADMIN_EMAIL } from "@/lib/constants"

/**
 * Gates an admin page. An anonymous visitor signs in and is returned here; a
 * signed-in non-admin is shown nothing at all, so the page is not advertised to
 * people who cannot use it.
 */
export async function requireAdmin(pagePath: string): Promise<void> {
  const session = await getAuthSession()

  if (!session?.user?.email) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(pagePath)}`)
  }

  if (session.user.email !== ADMIN_EMAIL) {
    notFound()
  }
}
