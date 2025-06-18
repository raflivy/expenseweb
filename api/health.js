const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Health Check Endpoint
 * Checks database connectivity and returns system status
 */
async function healthCheck(req, res) {
  const startTime = Date.now();
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
      // Get database info (simplified for better compatibility)
    let dbInfo = {};
    try {
      const versionResult = await prisma.$queryRaw`SELECT version() as version`;
      const dbResult = await prisma.$queryRaw`SELECT current_database() as database_name`;
      dbInfo = {
        version: versionResult[0]?.version || "Unknown",
        database_name: dbResult[0]?.database_name || "Unknown",
        user_name: "Connected",
        server_info: "Available"
      };
    } catch (infoError) {
      console.warn("Warning: Could not get detailed database info:", infoError.message);
      dbInfo = {
        version: "Unknown",
        database_name: "Connected",
        user_name: "Connected", 
        server_info: "Basic connection successful"
      };
    }// Get table counts for additional info (with error handling)
    let categoryCount = 0;
    let sourceCount = 0;
    let expenseCount = 0;
    let budgetCount = 0;
    
    try {
      categoryCount = await prisma.category.count();
      sourceCount = await prisma.source.count();
      expenseCount = await prisma.expense.count();
      budgetCount = await prisma.budget.count();
    } catch (countError) {
      console.warn("Warning: Could not get table counts:", countError.message);
    }
    
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        connected: true,
        info: dbInfo,        stats: {
          categories: categoryCount,
          sources: sourceCount,
          expenses: expenseCount,
          budgets: budgetCount
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        port: process.env.PORT || 3000,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        hasAdminPassword: !!process.env.ADMIN_PASSWORD_HASH
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      }
    });
    
  } catch (error) {
    console.error("Health check failed:", error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        connected: false,
        error: error.message,
        code: error.code || "UNKNOWN"
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        port: process.env.PORT || 3000,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        hasAdminPassword: !!process.env.ADMIN_PASSWORD_HASH
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      }
    });
  }
}

/**
 * Simple Health Check (minimal response)
 */
async function simpleHealthCheck(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ 
      status: "ok", 
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: "error", 
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Database Connection Test Only
 */
async function dbConnectionTest(req, res) {
  const startTime = Date.now();
  
  try {
    // Test basic connection
    await prisma.$connect();
    
    // Test query execution
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, 'connection_test' as test`;
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      connected: true,
      responseTime: `${responseTime}ms`,
      serverTime: result[0].current_time,
      test: result[0].test,
      message: "Database connection successful"
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    res.status(503).json({
      connected: false,
      responseTime: `${responseTime}ms`,
      error: error.message,
      code: error.code || "UNKNOWN",
      message: "Database connection failed"
    });
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  healthCheck,
  simpleHealthCheck,
  dbConnectionTest
};
