const bcrypt = require("bcryptjs");

// Password yang akan di-hash
const passwords = ["admin123", "password", "123456", "admin"];

console.log("=== PASSWORD HASH GENERATOR ===\n");

passwords.forEach((password) => {
  const hash = bcrypt.hashSync(password, 10);
  console.log(`Password: "${password}"`);
  console.log(`Hash: "${hash}"`);
  console.log("");
});

// Generate custom password jika ada argument
if (process.argv[2]) {
  const customPassword = process.argv[2];
  const customHash = bcrypt.hashSync(customPassword, 10);
  console.log(`Custom Password: "${customPassword}"`);
  console.log(`Custom Hash: "${customHash}"`);
}

console.log("Usage: node scripts/generate-password.js [custom-password]");
