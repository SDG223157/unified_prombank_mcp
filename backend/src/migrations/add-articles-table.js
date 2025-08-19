const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addArticlesTable() {
  try {
    console.log('🔧 Starting articles table migration...');

    // Check if migration already applied
    try {
      const existingTable = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'articles'
      `;
      
      if (Number(existingTable[0].count) > 0) {
        console.log('✅ Migration already applied - articles table exists');
        return {
          success: true,
          message: 'Migration already applied - articles table exists',
          alreadyMigrated: true
        };
      }
    } catch (error) {
      console.log('Table check failed, proceeding with migration...');
    }

    // Create articles table
    console.log('📝 Creating articles table...');
    await prisma.$executeRaw`
      CREATE TABLE articles (
        id VARCHAR(191) NOT NULL,
        title VARCHAR(191) NOT NULL,
        content LONGTEXT NOT NULL,
        category VARCHAR(191) NULL,
        tags JSON DEFAULT ('[]'),
        prompt_id VARCHAR(191) NULL,
        user_id VARCHAR(191) NOT NULL,
        word_count INT NULL,
        char_count INT NULL,
        metadata JSON DEFAULT ('{}'),
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        
        PRIMARY KEY (id),
        KEY articles_user_id_fkey (user_id),
        KEY articles_prompt_id_fkey (prompt_id),
        KEY articles_category_idx (category),
        KEY articles_created_at_idx (created_at),
        
        CONSTRAINT articles_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users (id) 
          ON DELETE CASCADE ON UPDATE CASCADE,
        
        CONSTRAINT articles_prompt_id_fkey 
          FOREIGN KEY (prompt_id) REFERENCES prompts (id) 
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    console.log('✅ Articles table created successfully');

    return {
      success: true,
      message: 'Articles table migration completed successfully'
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Allow this script to be run directly
if (require.main === module) {
  addArticlesTable()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addArticlesTable };
