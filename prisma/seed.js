const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default categories
  const categories = [
    { name: "Makanan", color: "#EF4444", icon: "🍔" },
    { name: "Transportasi", color: "#F59E0B", icon: "🚗" },
    { name: "Belanja", color: "#8B5CF6", icon: "🛒" },
    { name: "Hiburan", color: "#06B6D4", icon: "🎬" },
    { name: "Kesehatan", color: "#10B981", icon: "🏥" },
    { name: "Lainnya", color: "#6B7280", icon: "📦" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // Create default sources
  const sources = [
    { name: "Dompet", color: "#84CC16", icon: "👛" },
    { name: "Bank", color: "#3B82F6", icon: "🏦" },
    { name: "E-Wallet", color: "#F59E0B", icon: "📱" },
    { name: "Kartu Kredit", color: "#EF4444", icon: "💳" },
  ];

  for (const source of sources) {
    await prisma.source.upsert({
      where: { name: source.name },
      update: {},
      create: source,
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
