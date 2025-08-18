const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Temporary migration endpoint - REMOVE AFTER USE
router.post('/run-migration', async (req, res) => {
  try {
    console.log('🔧 Starting database migration...');

    // Check if migration already applied
    try {
      const existingTable = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'api_tokens'
      `;
      
      if (Number(existingTable[0].count) > 0) {
        return res.json({
          success: true,
          message: 'Migration already applied - api_tokens table exists',
          alreadyMigrated: true
        });
      }
    } catch (error) {
      console.log('Table check failed, proceeding with migration...');
    }

    // 1. Add new columns to prompts table
    console.log('📝 Adding new columns to prompts table...');
    await prisma.$executeRaw`
      ALTER TABLE prompts 
      ADD COLUMN variables JSON DEFAULT NULL,
      ADD COLUMN metadata JSON DEFAULT NULL,
      ADD COLUMN template_id VARCHAR(191) DEFAULT NULL,
      ADD COLUMN word_count INT DEFAULT 0,
      ADD COLUMN char_count INT DEFAULT 0,
      ADD COLUMN estimated_tokens INT DEFAULT 0
    `;

    // 2. Create api_tokens table
    console.log('🔑 Creating api_tokens table...');
    await prisma.$executeRaw`
      CREATE TABLE api_tokens (
        id VARCHAR(191) NOT NULL,
        name VARCHAR(191) NOT NULL,
        token VARCHAR(191) NOT NULL,
        user_id VARCHAR(191) NOT NULL,
        permissions JSON DEFAULT ('[]'),
        last_used_at DATETIME(3) NULL,
        expires_at DATETIME(3) NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        
        PRIMARY KEY (id),
        UNIQUE KEY api_tokens_token_key (token),
        KEY api_tokens_user_id_fkey (user_id),
        
        CONSTRAINT api_tokens_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users (id) 
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    // 3. Update existing prompts with calculated values
    console.log('📊 Updating existing prompts with calculated statistics...');
    await prisma.$executeRaw`
      UPDATE prompts 
      SET 
        word_count = CASE 
          WHEN content IS NOT NULL AND TRIM(content) != '' 
          THEN (LENGTH(TRIM(content)) - LENGTH(REPLACE(TRIM(content), ' ', '')) + 1)
          ELSE 0 
        END,
        char_count = CASE 
          WHEN content IS NOT NULL 
          THEN LENGTH(content)
          ELSE 0 
        END,
        estimated_tokens = CASE 
          WHEN content IS NOT NULL 
          THEN CEIL(LENGTH(content) / 4)
          ELSE 0 
        END,
        variables = JSON_ARRAY(),
        metadata = JSON_OBJECT()
      WHERE word_count = 0 OR char_count = 0 OR estimated_tokens = 0 
        OR variables IS NULL OR metadata IS NULL
    `;

    // 4. Verify the migration
    console.log('✅ Verifying migration...');
    
    const tableCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as api_tokens_table_exists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'api_tokens'
    `;

    const columnCheck = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN column_name = 'variables' THEN 1 END) as variables_column_exists,
        COUNT(CASE WHEN column_name = 'metadata' THEN 1 END) as metadata_column_exists,
        COUNT(CASE WHEN column_name = 'template_id' THEN 1 END) as template_id_column_exists,
        COUNT(CASE WHEN column_name = 'word_count' THEN 1 END) as word_count_column_exists,
        COUNT(CASE WHEN column_name = 'char_count' THEN 1 END) as char_count_column_exists,
        COUNT(CASE WHEN column_name = 'estimated_tokens' THEN 1 END) as estimated_tokens_column_exists
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'prompts'
    `;

    const sampleData = await prisma.$queryRaw`
      SELECT id, title, word_count, char_count, estimated_tokens 
      FROM prompts 
      LIMIT 5
    `;

    console.log('🎉 Migration completed successfully!');

    res.json({
      success: true,
      message: 'Database migration completed successfully!',
      verification: {
        apiTokensTable: Number(tableCheck[0].api_tokens_table_exists),
        newColumns: {
          variables_column_exists: Number(columnCheck[0].variables_column_exists),
          metadata_column_exists: Number(columnCheck[0].metadata_column_exists),
          template_id_column_exists: Number(columnCheck[0].template_id_column_exists),
          word_count_column_exists: Number(columnCheck[0].word_count_column_exists),
          char_count_column_exists: Number(columnCheck[0].char_count_column_exists),
          estimated_tokens_column_exists: Number(columnCheck[0].estimated_tokens_column_exists)
        },
        samplePrompts: sampleData
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message,
      details: error
    });
  }
});

// Endpoint to check migration status
router.get('/status', async (req, res) => {
  try {
    const tableExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'api_tokens'
    `;

    const hasNewColumns = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'prompts' 
      AND column_name = 'variables'
    `;

    res.json({
      migrationNeeded: Number(tableExists[0].count) === 0 || Number(hasNewColumns[0].count) === 0,
      apiTokensTableExists: Number(tableExists[0].count) > 0,
      newColumnsExist: Number(hasNewColumns[0].count) > 0
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to check migration status',
      message: error.message
    });
  }
});

// Endpoint to regenerate Prisma client (after schema changes)
router.post('/regenerate-prisma', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    console.log('🔄 Regenerating Prisma client...');
    
    // Regenerate Prisma client to pick up new schema
    await execPromise('npx prisma generate', { cwd: '/app/backend' });
    
    console.log('✅ Prisma client regenerated successfully');
    
    res.json({
      success: true,
      message: 'Prisma client regenerated successfully! Please restart the application.'
    });

  } catch (error) {
    console.error('❌ Failed to regenerate Prisma client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate Prisma client',
      message: error.message
    });
  }
});

module.exports = router; 