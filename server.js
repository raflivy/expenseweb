const express = require("express");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

// Add error handling for database connection
let prisma;
try {
  prisma = new PrismaClient({
    log: ["query", "error", "warn"],
    errorFormat: "pretty",
  });
  console.log("Prisma client initialized successfully");
} catch (error) {
  console.error("Failed to initialize Prisma client:", error);
  process.exit(1);
}

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Vercel deployment
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Debug environment variables
console.log("Environment check:");
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("SESSION_SECRET exists:", !!process.env.SESSION_SECRET);
console.log("ADMIN_PASSWORD_HASH exists:", !!process.env.ADMIN_PASSWORD_HASH);
console.log("PORT:", PORT);

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://rvexpend.vercel.app", "https://*.vercel.app"]
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Auth-Token"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Simple token generator
function generateAuthToken() {
  return Buffer.from(`expense-tracker-${Date.now()}-${Math.random()}`).toString(
    "base64"
  );
}

// Token storage for serverless environment
// Use in-memory storage with database backup for Vercel deployment
const validTokens = new Map(); // Map to store token -> timestamp

// Initialize tokens from database on startup
async function initializeTokens() {
  try {
    const dbTokens = await prisma.authToken.findMany({
      where: {
        OR: [
          { expiresAt: null }, // Never expires
          { expiresAt: { gt: new Date() } } // Not expired yet
        ]
      }
    });
    
    for (const tokenRecord of dbTokens) {
      validTokens.set(tokenRecord.token, new Date(tokenRecord.createdAt).getTime());
    }
    
    console.log(`Initialized ${validTokens.size} tokens from database`);
  } catch (error) {
    console.error("Failed to initialize tokens from database:", error);
    // Continue without database tokens
  }
}

// Token cleanup function
function cleanupExpiredTokens() {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  for (const [token, timestamp] of validTokens.entries()) {
    if (now - timestamp > maxAge) {
      validTokens.delete(token);
      console.log("Cleaned up expired token");
      
      // Also clean from database
      prisma.authToken.delete({
        where: { token }
      }).catch(err => console.error("Failed to delete token from DB:", err));
    }
  }
}

// Add token with timestamp
async function addToken(token) {
  validTokens.set(token, Date.now());
  
  // Also save to database as backup
  try {
    await prisma.authToken.create({
      data: {
        token,
        expiresAt: null // No expiration
      }
    });
    console.log(`Token added to memory and database. Active tokens: ${validTokens.size}`);
  } catch (error) {
    console.error("Failed to save token to database:", error);
    console.log(`Token added to memory only. Active tokens: ${validTokens.size}`);
  }
}

// Check if token is valid
async function isValidToken(token) {
  // Check memory first
  if (validTokens.has(token)) {
    return true;
  }
  
  // If not in memory, check database as fallback
  try {
    const dbToken = await prisma.authToken.findUnique({
      where: { token }
    });
    
    if (dbToken) {
      // Token exists in database, add back to memory
      validTokens.set(token, new Date(dbToken.createdAt).getTime());
      console.log("Token restored from database to memory");
      return true;
    }
  } catch (error) {
    console.error("Failed to check token in database:", error);
  }
  
  return false;
}

// Remove token
async function removeToken(token) {
  const removed = validTokens.delete(token);
  
  // Also remove from database
  try {
    await prisma.authToken.delete({
      where: { token }
    });
    console.log(`Token removed from memory and database. Remaining tokens: ${validTokens.size}`);
  } catch (error) {
    console.error("Failed to remove token from database:", error);
    if (removed) {
      console.log(`Token removed from memory only. Remaining tokens: ${validTokens.size}`);
    }
  }
  
  return removed;
}

// Initialize tokens on startup
initializeTokens();

// Periodic cleanup (every hour)
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// Authentication middleware (no timeout, persistent until logout)
const requireAuth = async (req, res, next) => {
  const token =
    req.headers["x-auth-token"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  console.log(
    `Auth check for ${req.path} - Token:`,
    token ? token.substring(0, 20) + "..." : "None"
  );

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({
      error: "Authentication required",
      code: "NO_TOKEN",
      message: "Please log in to access this resource.",
    });
  }  if (!validTokens.has(token)) {
    console.log("Token not found in memory, checking database...");
    
    // Check database as fallback
    try {
      const dbToken = await prisma.authToken.findUnique({
        where: { token }
      });
      
      if (dbToken) {
        // Token exists in database, restore to memory
        validTokens.set(token, new Date(dbToken.createdAt).getTime());
        console.log("Token restored from database, proceeding");
      } else {
        console.log("Token not found in database either");
        return res.status(401).json({
          error: "Invalid token",
          code: "INVALID_TOKEN",
          message: "Please log in again.",
        });
      }
    } catch (error) {
      console.error("Database check failed:", error);
      return res.status(401).json({
        error: "Invalid token",
        code: "INVALID_TOKEN",
        message: "Please log in again.",
      });
    }
  }

  console.log("Token is valid, proceeding");
  // Token is valid, proceed
  next();
};

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Authentication routes
app.post("/api/login", async (req, res) => {
  try {
    // Check database connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return res.status(500).json({ error: "Database connection failed" });
    }

    const { password } = req.body;

    if (!process.env.ADMIN_PASSWORD_HASH) {
      console.error("ADMIN_PASSWORD_HASH not found in environment");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const isValid = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );    if (isValid) {
      const token = generateAuthToken();
      await addToken(token);

      console.log(`New login successful. Active tokens: ${validTokens.size}`);

      res.json({
        success: true,
        token: token,
        message: "Login successful - no timeout, logout only on sign out",
      });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

app.post("/api/logout", async (req, res) => {
  const token =
    req.headers["x-auth-token"] ||
    req.headers["authorization"]?.replace("Bearer ", "");
  if (token) {
    await removeToken(token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});

app.post("/api/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const isValid = await bcrypt.compare(
      currentPassword,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (isValid) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update .env file dengan password baru
      const fs = require("fs");
      const path = require("path");

      try {
        const envPath = path.join(__dirname, ".env");
        let envContent = fs.readFileSync(envPath, "utf8");

        // Replace hash password di .env
        const hashRegex = /ADMIN_PASSWORD_HASH="[^"]*"/;
        envContent = envContent.replace(
          hashRegex,
          `ADMIN_PASSWORD_HASH="${hashedPassword}"`
        );

        // Tulis kembali ke file .env
        fs.writeFileSync(envPath, envContent);

        // Update environment variable di memory untuk session saat ini
        process.env.ADMIN_PASSWORD_HASH = hashedPassword;

        console.log("✅ Password successfully updated");
        res.json({
          success: true,
          message:
            "Password changed successfully. Please restart the server for full effect.",
        });
      } catch (fileError) {
        console.error("❌ Failed to update .env file:", fileError);
        res.status(500).json({
          error:
            "Password hash generated but failed to persist. Please restart server.",
        });
      }
    } else {
      res.status(401).json({ error: "Current password is incorrect" });
    }
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint untuk restart server (opsional, untuk auto-restart setelah ganti password)
app.post("/api/restart", requireAuth, (req, res) => {
  res.json({ success: true, message: "Server will restart in 2 seconds..." });

  setTimeout(() => {
    console.log("🔄 Restarting server due to password change...");
    process.exit(0); // Nodemon akan restart otomatis
  }, 2000);
});

// Expense routes
app.get("/api/expenses", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, categoryId, sourceId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (sourceId) where.sourceId = parseInt(sourceId);

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
        source: true,
      },
      orderBy: { date: "desc" },
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

app.post("/api/expenses", requireAuth, async (req, res) => {
  try {
    const { title, description, amount, date, categoryId, sourceId } = req.body;

    const expense = await prisma.expense.create({
      data: {
        title,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        categoryId: parseInt(categoryId),
        sourceId: parseInt(sourceId),
      },
      include: {
        category: true,
        source: true,
      },
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to create expense" });
  }
});

app.put("/api/expenses/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, date, categoryId, sourceId } = req.body;

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        categoryId: parseInt(categoryId),
        sourceId: parseInt(sourceId),
      },
      include: {
        category: true,
        source: true,
      },
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to update expense" });
  }
});

app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// Category routes
app.get("/api/categories", requireAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/categories", requireAuth, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const category = await prisma.category.create({
      data: { name, color, icon },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/api/categories/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name, color, icon },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/categories/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Source routes
app.get("/api/sources", requireAuth, async (req, res) => {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: "asc" },
    });
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

app.post("/api/sources", requireAuth, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const source = await prisma.source.create({
      data: { name, color, icon },
    });
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: "Failed to create source" });
  }
});

app.put("/api/sources/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    const source = await prisma.source.update({
      where: { id: parseInt(id) },
      data: { name, color, icon },
    });
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: "Failed to update source" });
  }
});

app.delete("/api/sources/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.source.delete({
      where: { id: parseInt(id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete source" });
  }
});

// Budget routes
app.get("/api/budget/:year/:month", requireAuth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const budget = await prisma.budget.findUnique({
      where: {
        month_year: {
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    });
    res.json(budget || { amount: 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

app.post("/api/budget", requireAuth, async (req, res) => {
  try {
    const { year, month, amount } = req.body;
    const budget = await prisma.budget.upsert({
      where: {
        month_year: {
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: {
        amount: parseFloat(amount),
      },
      create: {
        year: parseInt(year),
        month: parseInt(month),
        amount: parseFloat(amount),
      },
    });
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: "Failed to save budget" });
  }
});

// Analytics routes
app.get("/api/analytics/monthly", requireAuth, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
      include: {
        category: true,
      },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: 0,
      categories: {},
    }));

    expenses.forEach((expense) => {
      const month = expense.date.getMonth();
      monthlyData[month].total += parseFloat(expense.amount);

      if (!monthlyData[month].categories[expense.category.name]) {
        monthlyData[month].categories[expense.category.name] = 0;
      }
      monthlyData[month].categories[expense.category.name] += parseFloat(
        expense.amount
      );
    });

    res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Database setup endpoint (untuk production setup) - hanya bisa diakses setelah login
app.get("/api/setup", requireAuth, async (req, res) => {
  try {
    const { setupDatabase } = require("./scripts/setup-db");
    const result = await setupDatabase();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Setup failed: " + error.message,
    });
  }
});

// Initialize default data
async function initializeData() {
  try {
    // Create default categories
    const categoriesCount = await prisma.category.count();
    if (categoriesCount === 0) {
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
    }

    // Create default sources
    const sourcesCount = await prisma.source.count();
    if (sourcesCount === 0) {
      await prisma.source.createMany({
        data: [
          { name: "Dompet", color: "#84CC16", icon: "👛" },
          { name: "Bank", color: "#3B82F6", icon: "🏦" },
          { name: "E-Wallet", color: "#F59E0B", icon: "📱" },
          { name: "Kartu Kredit", color: "#EF4444", icon: "💳" },
        ],
      });
    }
  } catch (error) {
    console.error("Failed to initialize data:", error);
  }
}

// Start server (only in non-serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Initializing application...");

    // Test database connection before starting
    const dbConnected = await testDatabaseConnection();
    if (dbConnected) {
      console.log("✅ Database connection successful");
      try {
        await initializeData();
        console.log("✅ Default data initialization completed");
      } catch (error) {
        console.error("❌ Failed to initialize default data:", error);
      }
    } else {
      console.error(
        "❌ Database connection failed - some features may not work"
      );
    }

    console.log("🚀 Application ready!");
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

// Health check endpoints
const {
  healthCheck,
  simpleHealthCheck,
  dbConnectionTest,
} = require("./api/health");

// Comprehensive health check
app.get("/api/health", healthCheck);

// Simple health check (minimal response)
app.get("/api/health/simple", simpleHealthCheck);

// Database connection test only
app.get("/api/health/db", dbConnectionTest);

// Check authentication status endpoint
app.get("/api/auth/status", async (req, res) => {
  const token =
    req.headers["x-auth-token"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  console.log(
    "Auth status check - Token:",
    token ? token.substring(0, 20) + "..." : "None"
  );
  console.log("Valid tokens count:", validTokens.size);
  if (token && (await isValidToken(token))) {
    console.log("Token is valid");
    res.json({
      authenticated: true,
      message: "Token is valid",
    });
  } else {
    console.log("Token is invalid or not found");
    res.json({
      authenticated: false,
      message: "No valid token found",
    });
  }
});

module.exports = app;
