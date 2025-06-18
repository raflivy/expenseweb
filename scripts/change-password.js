const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

function changePassword(newPassword) {
  try {
    // Generate hash untuk password baru
    const newHash = bcrypt.hashSync(newPassword, 10);

    // Baca file .env
    const envPath = path.join(__dirname, "..", ".env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Replace hash password
    const hashRegex = /ADMIN_PASSWORD_HASH="[^"]*"/;
    envContent = envContent.replace(
      hashRegex,
      `ADMIN_PASSWORD_HASH="${newHash}"`
    );

    // Tulis kembali ke file
    fs.writeFileSync(envPath, envContent);

    console.log("✅ Password berhasil diubah!");
    console.log(`📝 Password baru: "${newPassword}"`);
    console.log(`🔐 Hash: "${newHash}"`);
    console.log("\n🔄 Restart server untuk menerapkan perubahan:");
    console.log("   npm run dev");
  } catch (error) {
    console.error("❌ Error mengubah password:", error.message);
  }
}

// Ambil password dari argument command line
const newPassword = process.argv[2];

if (!newPassword) {
  console.log("❌ Usage: node scripts/change-password.js <new-password>");
  console.log("📝 Example: node scripts/change-password.js admin123");
  process.exit(1);
}

changePassword(newPassword);
