const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log("🚀 Setting up database...");

    // Test connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Check if tables exist
    const categories = await prisma.category.findMany();

    if (categories.length === 0) {
      console.log("📦 Seeding database with default data...");

      // Create default categories
      await prisma.category.createMany({
        data: [
          { name: "Makanan", color: "#EF4444", icon: "🍔" },
          { name: "Transportasi", color: "#F59E0B", icon: "🚗" },
          { name: "Belanja", color: "#8B5CF6", icon: "🛒" },
          { name: "Hiburan", color: "#06B6D4", icon: "🎬" },
          { name: "Kesehatan", color: "#10B981", icon: "🏥" },
          { name: "Lainnya", color: "#6B7280", icon: "📦" },
        ],
      });

      // Create default sources
      await prisma.source.createMany({
        data: [
          { name: "Dompet", color: "#84CC16", icon: "👛" },
          { name: "Bank", color: "#3B82F6", icon: "🏦" },
          { name: "E-Wallet", color: "#F59E0B", icon: "📱" },
          { name: "Kartu Kredit", color: "#EF4444", icon: "💳" },
        ],
      });

      console.log("✅ Database seeded successfully");
    } else {
      console.log("ℹ️ Database already contains data, skipping seed");
    }

    console.log("🎉 Database setup completed!");

    return {
      success: true,
      message: "Database setup completed successfully",
    };
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then((result) => {
      if (result.success) {
        console.log("\n✅ Setup completed successfully!");
        process.exit(0);
      } else {
        console.error("\n❌ Setup failed:", result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n💥 Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
