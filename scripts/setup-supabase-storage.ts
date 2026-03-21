// scripts/setup-supabase-storage.ts
// Roda UMA VEZ para criar o bucket de imagens no Supabase
// Execute com: npx tsx scripts/setup-supabase-storage.ts

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "produtos"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log("🪣 Criando bucket:", BUCKET)

  // 1. Cria o bucket público
  const { data, error } = await supabase.storage.createBucket(BUCKET, {
    public: true,                    // URLs públicas sem autenticação
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  })

  if (error) {
    if (error.message.includes("already exists")) {
      console.log("ℹ️  Bucket já existe — tudo certo!")
    } else {
      console.error("❌ Erro ao criar bucket:", error.message)
      process.exit(1)
    }
  } else {
    console.log("✅ Bucket criado:", data)
  }

  // 2. Verifica se a URL pública funciona
  const { data: urlTest } = supabase.storage.from(BUCKET).getPublicUrl("test.jpg")
  console.log("🔗 URL base das imagens:", urlTest.publicUrl.replace("test.jpg", ""))

  console.log("\n✅ Supabase Storage configurado!")
  console.log("📌 Adicione ao .env e no Vercel:")
  console.log(`   SUPABASE_URL=${SUPABASE_URL}`)
  console.log(`   SUPABASE_SERVICE_ROLE_KEY=<sua chave>`)
  console.log(`   SUPABASE_BUCKET=${BUCKET}`)
}

main()