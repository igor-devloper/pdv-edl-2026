// app/page.tsx

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import PaginaPDVClient from "@/components/pagina-pdv-client"

export default async function Page() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  return <PaginaPDVClient />
}
