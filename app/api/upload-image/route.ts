import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Arquivo deve ser uma imagem" }, { status: 400 })
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem muito grande (max 5MB)" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), "public", "uploads")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Nome único
    const timestamp = Date.now()
    const ext = file.name.split(".").pop()
    const filename = `${timestamp}-${userId}.${ext}`
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const url = `/uploads/${filename}`

    return NextResponse.json({ ok: true, url })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 })
  }
}