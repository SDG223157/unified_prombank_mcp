const { PrismaClient } = require('@prisma/client');

let prisma = null;
let isConnecting = false;

const createPrismaClient = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

const connectWithRetry = async (retries = 5, delay = 2000) => {
  if (prisma && !isConnecting) {
    return prisma;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return prisma;
  }

  isConnecting = true;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Attempting database connection (attempt ${i + 1}/${retries})`);
      
      if (prisma) {
        await prisma.$disconnect();
      }
      
      prisma = createPrismaClient();
      
      // Test the connection
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      
      console.log(`✅ Database connected successfully on attempt ${i + 1}`);
      isConnecting = false;
      return prisma;
      
    } catch (error) {
      console.log(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      
      if (prisma) {
        try {
          await prisma.$disconnect();
        } catch (disconnectError) {
          console.log('Error disconnecting:', disconnectError.message);
        }
        prisma = null;
      }
      
      if (i < retries - 1) {
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 10000); // Exponential backoff, max 10s
      }
    }
  }
  
  isConnecting = false;
  throw new Error(`Failed to connect to database after ${retries} attempts`);
};

const getDatabase = async () => {
  if (!prisma) {
    await connectWithRetry();
  }
  return prisma;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down database connection...');
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down database connection...');
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

module.exports = {
  getDatabase,
  connectWithRetry,
  get prisma() {
    return prisma;
  }
}; 