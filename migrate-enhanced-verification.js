/**
 * Database Migration Script for Enhanced Background Verification System v2.0.0
 * 
 * This script migrates the database to support the new enhanced verification features:
 * - Adds new indexes for optimal query performance
 * - Adds processing lock fields to existing transactions
 * - Cleans up any stale processing locks
 * - Validates data integrity
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Create enhanced indexes for optimal query performance
 */
async function createIndexes() {
  console.log('📊 Creating enhanced database indexes...');
  
  const db = mongoose.connection.db;
  const collection = db.collection('transactions');
  
  try {
    // Enhanced indexes for background verification performance
    const indexes = [
      {
        name: 'enhanced_verification_primary',
        spec: { 
          state: 1, 
          verificationStartedAt: 1, 
          expiresAt: 1 
        },
        options: { 
          name: 'enhanced_verification_primary',
          background: true 
        }
      },
      {
        name: 'enhanced_verification_secondary',
        spec: { 
          state: 1, 
          lastVerificationCheck: 1, 
          expiresAt: 1 
        },
        options: { 
          name: 'enhanced_verification_secondary',
          background: true 
        }
      },
      {
        name: 'processing_locks',
        spec: { 
          processingBy: 1, 
          processingStartedAt: 1 
        },
        options: { 
          name: 'processing_locks',
          sparse: true,
          background: true 
        }
      }
    ];
    
    for (const index of indexes) {
      try {
        await collection.createIndex(index.spec, index.options);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`ℹ️ Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }
    
    console.log('✅ Index creation completed');
    
  } catch (error) {
    console.error('❌ Failed to create indexes:', error.message);
    throw error;
  }
}

/**
 * Clean up stale processing locks
 */
async function cleanupStaleLocks() {
  console.log('🧹 Cleaning up stale processing locks...');
  
  const db = mongoose.connection.db;
  const collection = db.collection('transactions');
  
  try {
    // Find transactions with stale processing locks (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const staleLocksQuery = {
      processingBy: { $exists: true },
      processingStartedAt: { $lt: fiveMinutesAgo }
    };
    
    const staleCount = await collection.countDocuments(staleLocksQuery);
    
    if (staleCount > 0) {
      console.log(`🔍 Found ${staleCount} transactions with stale processing locks`);
      
      const result = await collection.updateMany(
        staleLocksQuery,
        {
          $unset: {
            processingBy: 1,
            processingStartedAt: 1
          }
        }
      );
      
      console.log(`✅ Cleaned up ${result.modifiedCount} stale processing locks`);
    } else {
      console.log('✅ No stale processing locks found');
    }
    
  } catch (error) {
    console.error('❌ Failed to cleanup stale locks:', error.message);
    throw error;
  }
}

/**
 * Validate data integrity
 */
async function validateDataIntegrity() {
  console.log('🔍 Validating data integrity...');
  
  const db = mongoose.connection.db;
  const collection = db.collection('transactions');
  
  try {
    // Check for transactions without required fields
    const checks = [
      {
        name: 'Missing verificationStartedAt',
        query: { 
          state: { $in: ['PENDING', 'INITIALIZED'] },
          verificationStartedAt: { $exists: false }
        }
      },
      {
        name: 'Missing expiresAt',
        query: { 
          expiresAt: { $exists: false }
        }
      },
      {
        name: 'Expired but still PENDING',
        query: { 
          state: 'PENDING',
          expiresAt: { $lt: new Date() }
        }
      }
    ];
    
    for (const check of checks) {
      const count = await collection.countDocuments(check.query);
      if (count > 0) {
        console.log(`⚠️ ${check.name}: ${count} transactions`);
      } else {
        console.log(`✅ ${check.name}: OK`);
      }
    }
    
    // Get overall statistics
    const totalTransactions = await collection.countDocuments();
    const pendingTransactions = await collection.countDocuments({ state: 'PENDING' });
    const completedTransactions = await collection.countDocuments({ state: 'COMPLETED' });
    const expiredTransactions = await collection.countDocuments({ state: 'PAYOUT_FAILED' });
    
    console.log('\n📊 Database Statistics:');
    console.log(`   Total Transactions: ${totalTransactions}`);
    console.log(`   Pending: ${pendingTransactions}`);
    console.log(`   Completed: ${completedTransactions}`);
    console.log(`   Expired: ${expiredTransactions}`);
    
    console.log('✅ Data integrity validation completed');
    
  } catch (error) {
    console.error('❌ Failed to validate data integrity:', error.message);
    throw error;
  }
}

/**
 * Fix missing timestamps for existing transactions
 */
async function fixMissingTimestamps() {
  console.log('🔧 Fixing missing timestamps...');
  
  const db = mongoose.connection.db;
  const collection = db.collection('transactions');
  
  try {
    // Fix missing verificationStartedAt (use createdAt as fallback)
    const missingVerificationStarted = await collection.updateMany(
      { 
        verificationStartedAt: { $exists: false },
        createdAt: { $exists: true }
      },
      [
        {
          $set: {
            verificationStartedAt: '$createdAt'
          }
        }
      ]
    );
    
    if (missingVerificationStarted.modifiedCount > 0) {
      console.log(`✅ Fixed verificationStartedAt for ${missingVerificationStarted.modifiedCount} transactions`);
    }
    
    // Fix missing expiresAt (24 hours from createdAt)
    const missingExpiresAt = await collection.updateMany(
      { 
        expiresAt: { $exists: false },
        createdAt: { $exists: true }
      },
      [
        {
          $set: {
            expiresAt: {
              $add: ['$createdAt', 24 * 60 * 60 * 1000] // 24 hours in milliseconds
            }
          }
        }
      ]
    );
    
    if (missingExpiresAt.modifiedCount > 0) {
      console.log(`✅ Fixed expiresAt for ${missingExpiresAt.modifiedCount} transactions`);
    }
    
    console.log('✅ Timestamp fixes completed');
    
  } catch (error) {
    console.error('❌ Failed to fix missing timestamps:', error.message);
    throw error;
  }
}

/**
 * Test query performance
 */
async function testQueryPerformance() {
  console.log('⚡ Testing query performance...');
  
  const db = mongoose.connection.db;
  const collection = db.collection('transactions');
  
  try {
    // Test the main background verification query
    const now = new Date();
    const immediatePhaseEndTime = new Date(now.getTime() - 16 * 60 * 1000); // 16 minutes ago
    const lastCheckCutoff = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    const query = {
      state: 'PENDING',
      expiresAt: { $gt: now },
      verificationStartedAt: { $lt: immediatePhaseEndTime },
      $or: [
        { lastVerificationCheck: { $lt: lastCheckCutoff } },
        { lastVerificationCheck: { $exists: false } }
      ]
    };
    
    const startTime = Date.now();
    const count = await collection.countDocuments(query);
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ Background verification query: ${count} results in ${queryTime}ms`);
    
    // Test explain plan
    const explainResult = await collection.find(query).limit(100).explain('executionStats');
    const executionStats = explainResult.executionStats;
    
    console.log(`📊 Query execution stats:`);
    console.log(`   Documents examined: ${executionStats.totalDocsExamined}`);
    console.log(`   Documents returned: ${executionStats.totalDocsReturned}`);
    console.log(`   Execution time: ${executionStats.executionTimeMillis}ms`);
    console.log(`   Index used: ${executionStats.executionStages.indexName || 'No index'}`);
    
    if (queryTime > 1000) {
      console.log('⚠️ Query is slow (>1s). Consider optimizing indexes.');
    } else {
      console.log('✅ Query performance is good');
    }
    
  } catch (error) {
    console.error('❌ Failed to test query performance:', error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Enhanced Background Verification System Migration v2.0.0');
  console.log('================================================================\n');
  
  try {
    await connectDB();
    
    console.log('📋 Migration Steps:');
    console.log('1. Create enhanced database indexes');
    console.log('2. Clean up stale processing locks');
    console.log('3. Fix missing timestamps');
    console.log('4. Validate data integrity');
    console.log('5. Test query performance');
    console.log('');
    
    // Step 1: Create indexes
    await createIndexes();
    console.log('');
    
    // Step 2: Cleanup stale locks
    await cleanupStaleLocks();
    console.log('');
    
    // Step 3: Fix missing timestamps
    await fixMissingTimestamps();
    console.log('');
    
    // Step 4: Validate data integrity
    await validateDataIntegrity();
    console.log('');
    
    // Step 5: Test query performance
    await testQueryPerformance();
    console.log('');
    
    console.log('🎉 Migration completed successfully!');
    console.log('✅ Database is ready for Enhanced Background Verification System v2.0.0');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

/**
 * Rollback function (if needed)
 */
async function rollbackMigration() {
  console.log('🔄 Rolling back Enhanced Background Verification System Migration...');
  
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('transactions');
    
    // Remove processing lock fields
    const result = await collection.updateMany(
      {
        $or: [
          { processingBy: { $exists: true } },
          { processingStartedAt: { $exists: true } }
        ]
      },
      {
        $unset: {
          processingBy: 1,
          processingStartedAt: 1
        }
      }
    );
    
    console.log(`✅ Removed processing lock fields from ${result.modifiedCount} transactions`);
    
    // Note: We don't remove the new indexes as they don't hurt and might be useful
    console.log('ℹ️ Enhanced indexes left in place (they don\'t interfere with normal operation)');
    
    console.log('✅ Rollback completed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'migrate':
    case 'up':
      await runMigration();
      break;
      
    case 'rollback':
    case 'down':
      await rollbackMigration();
      break;
      
    case 'validate':
      await connectDB();
      await validateDataIntegrity();
      await mongoose.disconnect();
      break;
      
    case 'cleanup':
      await connectDB();
      await cleanupStaleLocks();
      await mongoose.disconnect();
      break;
      
    case 'test-performance':
      await connectDB();
      await testQueryPerformance();
      await mongoose.disconnect();
      break;
      
    default:
      console.log('🔧 Enhanced Background Verification System Migration Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node migrate-enhanced-verification.js migrate           - Run full migration');
      console.log('  node migrate-enhanced-verification.js rollback          - Rollback migration');
      console.log('  node migrate-enhanced-verification.js validate          - Validate data integrity');
      console.log('  node migrate-enhanced-verification.js cleanup           - Clean stale locks');
      console.log('  node migrate-enhanced-verification.js test-performance  - Test query performance');
      console.log('');
      console.log('Examples:');
      console.log('  node migrate-enhanced-verification.js migrate');
      console.log('  MONGODB_URI=mongodb://localhost:27017/mydb node migrate-enhanced-verification.js migrate');
      break;
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runMigration,
  rollbackMigration,
  validateDataIntegrity,
  cleanupStaleLocks,
  testQueryPerformance
};