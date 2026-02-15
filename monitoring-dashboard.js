/**
 * Real-time Monitoring Dashboard for Enhanced Background Verification System
 * 
 * This script provides a real-time monitoring interface for the verification system
 * with live updates, alerts, and performance metrics.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

class VerificationMonitor {
  constructor() {
    this.isRunning = false;
    this.updateInterval = 30000; // 30 seconds
    this.alertThresholds = {
      errorRate: 10, // 10%
      memoryUsage: 400, // 400MB
      responseTime: 5000, // 5 seconds
      pendingTransactions: 100 // 100 pending transactions
    };
    this.history = {
      errorRates: [],
      memoryUsage: [],
      responseTimes: [],
      pendingCounts: []
    };
    this.maxHistoryLength = 20; // Keep last 20 data points
  }

  /**
   * Start the monitoring dashboard
   */
  async start() {
    console.log('🚀 Starting Enhanced Verification System Monitor...\n');
    console.log('📊 Dashboard Configuration:');
    console.log(`   Update Interval: ${this.updateInterval / 1000}s`);
    console.log(`   Error Rate Alert: >${this.alertThresholds.errorRate}%`);
    console.log(`   Memory Alert: >${this.alertThresholds.memoryUsage}MB`);
    console.log(`   Response Time Alert: >${this.alertThresholds.responseTime}ms`);
    console.log(`   Pending Transactions Alert: >${this.alertThresholds.pendingTransactions}`);
    console.log('\n' + '='.repeat(80) + '\n');

    this.isRunning = true;
    
    // Initial update
    await this.updateDashboard();
    
    // Set up periodic updates
    this.intervalId = setInterval(() => {
      this.updateDashboard().catch(error => {
        console.error('❌ Dashboard update failed:', error.message);
      });
    }, this.updateInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down monitor...');
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Stop the monitoring dashboard
   */
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log('✅ Monitor stopped');
  }

  /**
   * Update the dashboard with latest data
   */
  async updateDashboard() {
    try {
      const [verificationData, systemData, transactionData] = await Promise.all([
        this.fetchVerificationStats(),
        this.fetchSystemStats(),
        this.fetchTransactionStats()
      ]);

      // Clear console and show header
      console.clear();
      this.showHeader();
      
      // Show main metrics
      this.showVerificationStatus(verificationData);
      this.showSystemHealth(systemData);
      this.showTransactionMetrics(transactionData);
      
      // Update history and show trends
      this.updateHistory(verificationData, systemData, transactionData);
      this.showTrends();
      
      // Check for alerts
      this.checkAlerts(verificationData, systemData, transactionData);
      
      console.log('\n' + '='.repeat(80));
      console.log(`📅 Last Updated: ${new Date().toLocaleString()}`);
      console.log(`🔄 Next Update: ${new Date(Date.now() + this.updateInterval).toLocaleString()}`);
      console.log('Press Ctrl+C to stop monitoring');

    } catch (error) {
      console.error('❌ Failed to update dashboard:', error.message);
    }
  }

  /**
   * Fetch verification service statistics
   */
  async fetchVerificationStats() {
    const response = await fetch(`${BASE_URL}/health/verification`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  /**
   * Fetch system health statistics
   */
  async fetchSystemStats() {
    const response = await fetch(`${BASE_URL}/health/system`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  /**
   * Fetch transaction statistics
   */
  async fetchTransactionStats() {
    const response = await fetch(`${BASE_URL}/health/transactions`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  /**
   * Show dashboard header
   */
  showHeader() {
    console.log('🔍 ENHANCED VERIFICATION SYSTEM MONITOR v2.0.0');
    console.log('='.repeat(80));
    console.log();
  }

  /**
   * Show verification service status
   */
  showVerificationStatus(data) {
    const status = data.status === 'healthy' ? '✅' : '❌';
    const running = data.isRunning ? '🟢' : '🔴';
    
    console.log('📊 VERIFICATION SERVICE STATUS');
    console.log('-'.repeat(40));
    console.log(`${status} Overall Status: ${data.status.toUpperCase()}`);
    console.log(`${running} Service Running: ${data.isRunning ? 'YES' : 'NO'}`);
    console.log(`⏱️ Uptime: ${data.uptime || 'N/A'}`);
    console.log(`🔄 Last Run: ${data.lastRun ? new Date(data.lastRun).toLocaleString() : 'Never'}`);
    console.log(`⚡ Last Duration: ${data.lastRunDuration || 0}ms`);
    console.log();
    
    if (data.statistics) {
      console.log('📈 PERFORMANCE METRICS');
      console.log('-'.repeat(40));
      console.log(`🎯 Total Runs: ${data.statistics.totalRuns || 0}`);
      console.log(`📦 Transactions Processed: ${data.statistics.totalTransactionsProcessed || 0}`);
      console.log(`❌ Total Errors: ${data.statistics.totalErrors || 0}`);
      console.log(`📊 Success Rate: ${data.statistics.successRate || '100%'}`);
      console.log(`⚠️ Error Rate: ${data.statistics.errorRate || '0%'}`);
      console.log();
    }
    
    if (data.configuration) {
      console.log('⚙️ CONFIGURATION');
      console.log('-'.repeat(40));
      console.log(`📦 Batch Size: ${data.configuration.batchSize || 'N/A'}`);
      console.log(`⏰ Cron Interval: ${data.configuration.cronInterval || 'N/A'}`);
      console.log(`⏳ API Delay: ${data.configuration.apiDelay || 'N/A'}`);
      console.log(`🔄 Max Retries: ${data.configuration.maxRetries || 'N/A'}`);
      console.log();
    }
  }

  /**
   * Show system health information
   */
  showSystemHealth(data) {
    const overallStatus = data.status === 'healthy' ? '✅' : '⚠️';
    
    console.log('🖥️ SYSTEM HEALTH');
    console.log('-'.repeat(40));
    console.log(`${overallStatus} Overall: ${data.status.toUpperCase()}`);
    console.log(`⏱️ Uptime: ${data.uptime || 'N/A'}`);
    
    if (data.components) {
      const dbStatus = data.components.database?.status === 'healthy' ? '✅' : '⚠️';
      const memStatus = data.components.memory?.status === 'healthy' ? '✅' : '⚠️';
      const verifyStatus = data.components.verification?.status === 'healthy' ? '✅' : '⚠️';
      
      console.log(`${dbStatus} Database: ${data.components.database?.queryTime || 'N/A'}`);
      console.log(`${memStatus} Memory: ${data.components.memory?.heapUsed || 'N/A'}`);
      console.log(`${verifyStatus} Verification: ${data.components.verification?.errorRate || '0%'} error rate`);
    }
    console.log();
  }

  /**
   * Show transaction metrics
   */
  showTransactionMetrics(data) {
    console.log('💳 TRANSACTION METRICS');
    console.log('-'.repeat(40));
    
    if (data.totals) {
      console.log(`📊 Total: ${data.totals.all || 0}`);
      console.log(`⏳ Pending: ${data.totals.pending || 0}`);
      console.log(`✅ Completed: ${data.totals.completed || 0}`);
      console.log(`❌ Expired: ${data.totals.expired || 0}`);
    }
    
    if (data.recent) {
      console.log(`📅 Last 24h: ${data.recent.last24Hours || 0}`);
      console.log(`⏰ Last Hour: ${data.recent.lastHour || 0}`);
    }
    
    if (data.percentages) {
      console.log(`📈 Completion Rate: ${data.percentages.completionRate || '0%'}`);
      console.log(`⏳ Pending Rate: ${data.percentages.pendingRate || '0%'}`);
    }
    console.log();
  }

  /**
   * Update historical data
   */
  updateHistory(verificationData, systemData, transactionData) {
    // Extract error rate
    const errorRateStr = verificationData.statistics?.errorRate || '0%';
    const errorRate = parseFloat(errorRateStr.replace('%', ''));
    this.addToHistory('errorRates', errorRate);
    
    // Extract memory usage
    const memoryStr = systemData.components?.memory?.heapUsed || '0MB';
    const memoryUsage = parseFloat(memoryStr.replace('MB', ''));
    this.addToHistory('memoryUsage', memoryUsage);
    
    // Extract response time (use last run duration as proxy)
    const responseTime = verificationData.lastRunDuration || 0;
    this.addToHistory('responseTimes', responseTime);
    
    // Extract pending transactions
    const pendingCount = transactionData.totals?.pending || 0;
    this.addToHistory('pendingCounts', pendingCount);
  }

  /**
   * Add data point to history
   */
  addToHistory(metric, value) {
    this.history[metric].push(value);
    if (this.history[metric].length > this.maxHistoryLength) {
      this.history[metric].shift();
    }
  }

  /**
   * Show trend analysis
   */
  showTrends() {
    console.log('📈 TRENDS (Last 20 data points)');
    console.log('-'.repeat(40));
    
    Object.keys(this.history).forEach(metric => {
      const data = this.history[metric];
      if (data.length > 1) {
        const current = data[data.length - 1];
        const previous = data[data.length - 2];
        const trend = current > previous ? '📈' : current < previous ? '📉' : '➡️';
        const change = Math.abs(current - previous);
        
        let metricName = metric.replace(/([A-Z])/g, ' $1').toLowerCase();
        metricName = metricName.charAt(0).toUpperCase() + metricName.slice(1);
        
        console.log(`${trend} ${metricName}: ${current} (${change > 0 ? '±' + change : 'no change'})`);
      }
    });
    console.log();
  }

  /**
   * Check for alerts and warnings
   */
  checkAlerts(verificationData, systemData, transactionData) {
    const alerts = [];
    
    // Check error rate
    const errorRateStr = verificationData.statistics?.errorRate || '0%';
    const errorRate = parseFloat(errorRateStr.replace('%', ''));
    if (errorRate > this.alertThresholds.errorRate) {
      alerts.push(`🚨 HIGH ERROR RATE: ${errorRate}% (threshold: ${this.alertThresholds.errorRate}%)`);
    }
    
    // Check memory usage
    const memoryStr = systemData.components?.memory?.heapUsed || '0MB';
    const memoryUsage = parseFloat(memoryStr.replace('MB', ''));
    if (memoryUsage > this.alertThresholds.memoryUsage) {
      alerts.push(`🚨 HIGH MEMORY USAGE: ${memoryUsage}MB (threshold: ${this.alertThresholds.memoryUsage}MB)`);
    }
    
    // Check response time
    const responseTime = verificationData.lastRunDuration || 0;
    if (responseTime > this.alertThresholds.responseTime) {
      alerts.push(`🚨 SLOW RESPONSE TIME: ${responseTime}ms (threshold: ${this.alertThresholds.responseTime}ms)`);
    }
    
    // Check pending transactions
    const pendingCount = transactionData.totals?.pending || 0;
    if (pendingCount > this.alertThresholds.pendingTransactions) {
      alerts.push(`🚨 HIGH PENDING COUNT: ${pendingCount} (threshold: ${this.alertThresholds.pendingTransactions})`);
    }
    
    // Check if service is not running
    if (!verificationData.isRunning) {
      alerts.push(`🚨 VERIFICATION SERVICE NOT RUNNING`);
    }
    
    // Check if system is unhealthy
    if (systemData.status !== 'healthy') {
      alerts.push(`🚨 SYSTEM HEALTH: ${systemData.status.toUpperCase()}`);
    }
    
    // Display alerts
    if (alerts.length > 0) {
      console.log('🚨 ALERTS');
      console.log('-'.repeat(40));
      alerts.forEach(alert => console.log(alert));
      console.log();
    } else {
      console.log('✅ NO ALERTS - All systems operating normally');
      console.log();
    }
  }

  /**
   * Generate summary report
   */
  async generateReport() {
    console.log('📋 Generating System Report...\n');
    
    try {
      const [verificationData, systemData, transactionData] = await Promise.all([
        this.fetchVerificationStats(),
        this.fetchSystemStats(),
        this.fetchTransactionStats()
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        verification: {
          status: verificationData.status,
          isRunning: verificationData.isRunning,
          uptime: verificationData.uptime,
          statistics: verificationData.statistics,
          performance: verificationData.performance
        },
        system: {
          status: systemData.status,
          uptime: systemData.uptime,
          components: systemData.components
        },
        transactions: {
          totals: transactionData.totals,
          recent: transactionData.recent,
          percentages: transactionData.percentages
        }
      };

      console.log('📊 SYSTEM REPORT');
      console.log('='.repeat(50));
      console.log(JSON.stringify(report, null, 2));
      
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
      return null;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const monitor = new VerificationMonitor();
  
  switch (command) {
    case 'start':
    case 'monitor':
      await monitor.start();
      break;
      
    case 'report':
      await monitor.generateReport();
      break;
      
    case 'check':
      await monitor.updateDashboard();
      break;
      
    default:
      console.log('🔍 Enhanced Verification System Monitor v2.0.0');
      console.log('');
      console.log('Usage:');
      console.log('  node monitoring-dashboard.js start    - Start real-time monitoring');
      console.log('  node monitoring-dashboard.js report   - Generate one-time report');
      console.log('  node monitoring-dashboard.js check    - Single health check');
      console.log('');
      console.log('Examples:');
      console.log('  node monitoring-dashboard.js start');
      console.log('  API_BASE_URL=http://localhost:4000/api/v1 node monitoring-dashboard.js start');
      break;
  }
}

// Export for use as module
module.exports = VerificationMonitor;

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}