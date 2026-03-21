import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUCKET = "radius-sinapse"
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function safeName(name: string) {
  return String(name || "imagem").replace(/[^\w.\-]+/g, "_")
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if ((buckets || []).some((b) => b.name === BUCKET)) return
  await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_SIZE,
    allowedMimeTypes: [...ALLOWED_TYPES, "application/pdf"],
  })
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo não permitido. Use JPG, PNG, WEBP ou GIF" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Imagem muito grande (máximo 5MB)" }, { status: 400 })
    }

    await ensureBucket()

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = safeName(file.name)
    // Salva dentro da pasta "produtos/" no mesmo bucket que os anexos de OS
    const objectPath = `produtos/${Date.now()}-${userId.slice(0, 8)}-${filename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      })

    if (uploadError) {
      console.error("[upload-image]", uploadError)
      return NextResponse.json(
        { error: `Erro no upload: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath)

    return NextResponse.json({ ok: true, url: data.publicUrl })
  } catch (error: any) {
    console.error("[upload-image]", error)
    return NextResponse.json(
      { error: error?.message ?? "Erro ao fazer upload" },
      { status: 500 }
    )
  }
}