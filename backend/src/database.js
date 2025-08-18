// Temporarily bypass Prisma and use direct MySQL connection
const mysql = require('mysql2/promise');

// Create a simple database wrapper that mimics Prisma interface
class SimpleDatabaseClient {
  constructor() {
    this.connection = null;
  }

  async $connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'ro8k4k8k00ws8k8ooc8ow008',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'mysql',
        password: process.env.DB_PASSWORD,
        database: process.env.MYSQL_DATABASE || 'default',
        ssl: false
      });
    }
    return this.connection;
  }

  async $disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async $queryRaw(query) {
    await this.$connect();
    const [rows] = await this.connection.execute('SELECT 1 as test');
    return rows;
  }
}

// Use simple client instead of Prisma for now
const PrismaClient = SimpleDatabaseClient;

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