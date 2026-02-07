import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter
})

async function main() {
  console.log("🌱 Iniciando seed de produtos PDV EDL...")

  // 🔴 limpa produtos existentes (opcional)
  await prisma.product.deleteMany()
  console.log("🧹 Produtos antigos removidos")

  const produtos = [
    {
      sku: "EDL-CAMISETA-P",
      name: "Camiseta EDL - P",
      priceCents: 5000, // R$ 50,00
      costCents: 2800,
      stockOnHand: 20,
    },
    {
      sku: "EDL-CAMISETA-M",
      name: "Camiseta EDL - M",
      priceCents: 5000,
      costCents: 2800,
      stockOnHand: 25,
    },
    {
      sku: "EDL-CAMISETA-G",
      name: "Camiseta EDL - G",
      priceCents: 5000,
      costCents: 2800,
      stockOnHand: 25,
    },
    {
      sku: "EDL-CAMISETA-GG",
      name: "Camiseta EDL - GG",
      priceCents: 5500,
      costCents: 3000,
      stockOnHand: 15,
    },
    {
      sku: "EDL-CANECA",
      name: "Caneca FEJEMG",
      priceCents: 3500, // R$ 35,00
      costCents: 1800,
      stockOnHand: 30,
    },
    {
      sku: "EDL-ECOBAG",
      name: "Ecobag FEJEMG",
      priceCents: 4000,
      costCents: 2200,
      stockOnHand: 18,
    },
    {
      sku: "EDL-BROCHE",
      name: "Broche FEJEMG",
      priceCents: 1500,
      costCents: 600,
      stockOnHand: 40,
    },
    {
      sku: "EDL-ADESIVO",
      name: "Adesivo FEJEMG",
      priceCents: 500,
      costCents: 100,
      stockOnHand: 100,
    },
  ]

  await prisma.product.createMany({
    data: produtos,
    skipDuplicates: true,
  })

  console.log(`✅ ${produtos.length} produtos inseridos com sucesso`)
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
