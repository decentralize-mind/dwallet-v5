/**
 * 🛰️ REAL-TIME ANOMALY DETECTION MONITORING SERVICE
 * 
 * This service monitors the dWallet protocol for suspicious activity
 * and reports threat levels to the on-chain AnomalyDetector contract.
 * 
 * Features:
 * - Real-time volume spike detection
 * - Transaction frequency monitoring
 * - Whale activity tracking
 * - Price deviation alerts
 * - Automatic circuit breaker triggers
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Network
  RPC_URL: process.env.RPC_URL || "http://127.0.0.1:8545",
  PRIVATE_KEY: process.env.MONITOR_PRIVATE_KEY,
  
  // Contract Addresses (update after deployment)
  ANOMALY_DETECTOR_ADDRESS: process.env.ANOMALY_DETECTOR_ADDRESS || "0x...",
  LAYER7_SECURITY_ADDRESS: process.env.LAYER7_SECURITY_ADDRESS || "0x...",
  DWT_TOKEN_ADDRESS: process.env.DWT_TOKEN_ADDRESS || "0x...",
  
  // Threat Thresholds
  THREAT_THRESHOLDS: {
    VOLUME_SPIKE: 5.0,        // 5x normal volume
    TX_COUNT_SPIKE: 3.0,      // 3x normal tx count
    PRICE_DEVIATION: 0.03,    // 3% price deviation
    WHALE_ACTIVITY: 100_000,  // $100k+ single transaction
    LARGE_TRANSFER: 50_000,   // $50k+ transfer alert
    FREQUENT_TX_PER_BLOCK: 50, // Max tx per address per block
  },
  
  // Monitoring Intervals
  CHECK_INTERVAL_MS: 5000,    // Check every 5 seconds
  BASELINE_UPDATE_BLOCKS: 100, // Update baseline every 100 blocks
  
  // Alert Channels
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  DISCORD_WEBHOOK: process.env.DISCORD_WEBHOOK,
};

// Threat Level Enum (matches Solidity)
const ThreatLevel = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// ─────────────────────────────────────────────────────────────────────
//  ANOMALY DETECTOR CLASS
// ─────────────────────────────────────────────────────────────────────

class AnomalyMonitoringService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.anomalyDetector = null;
    this.layer7Security = null;
    this.dwtToken = null;
    
    // Metrics storage
    this.baselineMetrics = {
      avgVolumePerBlock: 0,
      avgTxCountPerBlock: 0,
      avgTransactionSize: 0,
    };
    
    this.currentBlockMetrics = {
      volume: 0,
      txCount: 0,
      transactions: [],
    };
    
    this.whaleWatchList = new Set();
    this.alertCooldown = new Map();
    
    console.log("🚀 Initializing Anomaly Monitoring Service...");
  }
  
  /**
   * Initialize contracts and providers
   */
  async initialize() {
    try {
      // Setup provider and wallet
      this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
      
      console.log("📡 Connected to:", CONFIG.RPC_URL);
      console.log("👛 Monitor Address:", await this.wallet.getAddress());
      
      // Load contract ABIs (simplified for demo - use full ABIs in production)
      const anomalyDetectorABI = [
        "function detectAnomaly(bytes32 layerId, address user, uint256 amount) external returns (uint8)",
        "function getCurrentBlockUsage() external view returns (uint256 volume, uint256 txCount)",
        "function getLayerMetrics(bytes32 layerId) external view returns (tuple(uint256 volumeLastBlock, uint256 txCountLastBlock, uint256 uniqueUsersLastHour, uint256 avgTransactionSize, uint256 priceDeviationBps, uint256 largeTxCount, uint256 failedTxCount))",
        "function updateBaselines() external",
        "event AnomalyDetected(bytes32 indexed layerId, address indexed user, uint256 amount, uint8 level, string reason)"
      ];
      
      const layer7SecurityABI = [
        "function pause() external",
        "function tripCircuitBreaker(string calldata reason) external",
        "function paused() external view returns (bool)",
        "function circuitBroken() external view returns (bool)"
      ];
      
      const erc20ABI = [
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "event Transfer(address indexed from, address indexed to, uint256 value)"
      ];
      
      // Deploy or connect to contracts
      this.anomalyDetector = new ethers.Contract(
        CONFIG.ANOMALY_DETECTOR_ADDRESS,
        anomalyDetectorABI,
        this.wallet
      );
      
      this.layer7Security = new ethers.Contract(
        CONFIG.LAYER7_SECURITY_ADDRESS,
        layer7SecurityABI,
        this.wallet
      );
      
      this.dwtToken = new ethers.Contract(
        CONFIG.DWT_TOKEN_ADDRESS,
        erc20ABI,
        this.provider
      );
      
      console.log("✅ Contracts initialized successfully");
      
      // Setup event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error("❌ Initialization Error:", error);
      throw error;
    }
  }
  
  /**
   * Setup blockchain event listeners
   */
  setupEventListeners() {
    console.log("📡 Setting up event listeners...");
    
    // Listen for large transfers
    if (this.dwtToken) {
      this.dwtToken.on("Transfer", async (from, to, value, event) => {
        await this.handleTransferEvent(from, to, value, event);
      });
    }
    
    // Listen for anomaly detections
    if (this.anomalyDetector) {
      this.anomalyDetector.on("AnomalyDetected", async (layerId, user, amount, level, reason, event) => {
        await this.handleAnomalyEvent(layerId, user, amount, level, reason, event);
      });
    }
  }
  
  /**
   * Handle Transfer events
   */
  async handleTransferEvent(from, to, value, event) {
    const valueEth = ethers.formatEther(value);
    const blockNumber = event.log.blockNumber;
    
    // Update current block metrics
    this.currentBlockMetrics.volume += parseFloat(valueEth);
    this.currentBlockMetrics.txCount++;
    this.currentBlockMetrics.transactions.push({
      from,
      to,
      value: valueEth,
      block: blockNumber,
    });
    
    // Check for whale activity
    if (parseFloat(valueEth) >= CONFIG.THREAT_THRESHOLDS.WHALE_ACTIVITY) {
      console.warn(`🐋 WHALE ALERT: ${valueEth} DWT transferred from ${from} to ${to}`);
      await this.sendAlert({
        level: 'HIGH',
        title: '🐋 Whale Activity Detected',
        message: `${valueEth} DWT transferred`,
        data: { from, to, value: valueEth, txHash: event.log.transactionHash }
      });
    }
    
    // Track large transfers
    if (parseFloat(valueEth) >= CONFIG.THREAT_THRESHOLDS.LARGE_TRANSFER) {
      console.warn(`⚠️ Large Transfer: ${valueEth} DWT from ${from}`);
    }
  }
  
  /**
   * Handle on-chain anomaly detection events
   */
  async handleAnomalyEvent(layerId, user, amount, level, reason, event) {
    console.log(`🚨 Anomaly Detected - Level ${level}: ${reason}`);
    console.log(`   Layer: ${layerId}, User: ${user}, Amount: ${amount}`);
    
    // Auto-pause for critical threats
    if (level >= ThreatLevel.CRITICAL) {
      console.error("🚨 CRITICAL THREAT - Triggering emergency pause!");
      await this.triggerEmergencyPause(reason);
    }
    
    // Send alert
    await this.sendAlert({
      level: this.getThreatLevelName(level),
      title: `🚨 Anomaly Detected - ${reason}`,
      message: `Layer: ${layerId}, User: ${user}, Amount: ${amount}`,
      data: { layerId, user, amount: amount.toString(), reason, txHash: event.log.transactionHash }
    });
  }
  
  /**
   * Main monitoring loop
   */
  async startMonitoring() {
    console.log("🔍 Starting real-time monitoring...");
    
    while (true) {
      try {
        await this.performMonitoringCycle();
        await this.sleep(CONFIG.CHECK_INTERVAL_MS);
      } catch (error) {
        console.error("❌ Monitoring Error:", error);
        await this.sleep(CONFIG.CHECK_INTERVAL_MS * 2);
      }
    }
  }
  
  /**
   * Single monitoring cycle
   */
  async performMonitoringCycle() {
    const currentBlock = await this.provider.getBlockNumber();
    
    // Get current block usage from contract
    const [volume, txCount] = await this.anomalyDetector.getCurrentBlockUsage();
    
    console.log(`📊 Block ${currentBlock}: Volume=${ethers.formatEther(volume)}, Txs=${txCount}`);
    
    // Analyze metrics
    const analysis = await this.analyzeMetrics(volume, txCount);
    
    // Report anomalies
    if (analysis.threatLevel > ThreatLevel.NONE) {
      console.warn(`⚠️ Threat detected: Level ${analysis.threatLevel} - ${analysis.reason}`);
      
      // Report to on-chain detector
      try {
        const tx = await this.anomalyDetector.detectAnomaly(
          ethers.encodeBytes32String("LAYER_2_DEX"), // Example layer
          this.wallet.address,
          volume
        );
        await tx.wait();
      } catch (error) {
        console.error("Failed to report anomaly on-chain:", error);
      }
    }
    
    // Update baselines periodically
    if (currentBlock % CONFIG.BASELINE_UPDATE_BLOCKS === 0) {
      console.log("📈 Updating baseline metrics...");
      try {
        const tx = await this.anomalyDetector.updateBaselines();
        await tx.wait();
        console.log("✅ Baselines updated");
      } catch (error) {
        console.error("Failed to update baselines:", error);
      }
    }
  }
  
  /**
   * Analyze current metrics against thresholds
   */
  async analyzeMetrics(volume, txCount) {
    const result = {
      threatLevel: ThreatLevel.NONE,
      reason: "",
    };
    
    // Check volume spike
    if (this.baselineMetrics.avgVolumePerBlock > 0) {
      const volumeRatio = parseFloat(ethers.formatEther(volume)) / this.baselineMetrics.avgVolumePerBlock;
      
      if (volumeRatio >= CONFIG.THREAT_THRESHOLDS.VOLUME_SPIKE) {
        result.threatLevel = ThreatLevel.HIGH;
        result.reason = "VOLUME_SPIKE";
        console.warn(`📊 Volume Spike: ${volumeRatio.toFixed(2)}x normal (${ethers.formatEther(volume)} vs ${this.baselineMetrics.avgVolumePerBlock})`);
      }
    }
    
    // Check transaction count spike
    if (this.baselineMetrics.avgTxCountPerBlock > 0) {
      const txRatio = txCount / this.baselineMetrics.avgTxCountPerBlock;
      
      if (txRatio >= CONFIG.THREAT_THRESHOLDS.TX_COUNT_SPIKE) {
        result.threatLevel = Math.max(result.threatLevel, ThreatLevel.MEDIUM);
        result.reason = "TX_FREQUENCY_SPIKE";
        console.warn(`📊 TX Spike: ${txRatio.toFixed(2)}x normal (${txCount} vs ${this.baselineMetrics.avgTxCountPerBlock})`);
      }
    }
    
    // Check absolute limits
    if (txCount >= CONFIG.THREAT_THRESHOLDS.FREQUENT_TX_PER_BLOCK) {
      result.threatLevel = Math.max(result.threatLevel, ThreatLevel.HIGH);
      result.reason = "EXCESSIVE_TX_COUNT";
    }
    
    return result;
  }
  
  /**
   * Trigger emergency pause via Layer7Security
   */
  async triggerEmergencyPause(reason) {
    try {
      console.log("🚨 TRIGGERING EMERGENCY PAUSE!");
      
      // Check if already paused
      const isPaused = await this.layer7Security.paused();
      const isCircuitBroken = await this.layer7Security.circuitBroken();
      
      if (!isPaused && !isCircuitBroken) {
        const tx = await this.layer7Security.tripCircuitBreaker(reason);
        await tx.wait();
        console.log("✅ Circuit breaker tripped successfully");
        
        await this.sendAlert({
          level: 'CRITICAL',
          title: '🚨 CIRCUIT BREAKER TRIPPED',
          message: `Reason: ${reason}`,
          data: { timestamp: Date.now(), reason }
        });
      } else {
        console.log("⚠️ System already paused or circuit broken");
      }
    } catch (error) {
      console.error("❌ Failed to trigger emergency pause:", error);
    }
  }
  
  /**
   * Send alert to notification channels
   */
  async sendAlert(alert) {
    const { level, title, message, data } = alert;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ALERT [${level}]: ${title}`);
    console.log(`${message}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Rate limiting for alerts
    const cooldownKey = `${level}-${title}`;
    const lastAlertTime = this.alertCooldown.get(cooldownKey) || 0;
    const now = Date.now();
    
    // Skip if in cooldown (5 minutes for same alert)
    if (now - lastAlertTime < 5 * 60 * 1000) {
      console.log("⏭️ Skipping alert (cooldown active)");
      return;
    }
    
    this.alertCooldown.set(cooldownKey, now);
    
    // Send to Telegram
    if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
      await this.sendTelegramAlert(alert);
    }
    
    // Send to Discord
    if (CONFIG.DISCORD_WEBHOOK) {
      await this.sendDiscordAlert(alert);
    }
  }
  
  /**
   * Send Telegram alert
   */
  async sendTelegramAlert(alert) {
    try {
      const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const chatId = CONFIG.TELEGRAM_CHAT_ID;
      
      const emoji = {
        NONE: 'ℹ️',
        LOW: '⚠️',
        MEDIUM: '🟠',
        HIGH: '🔴',
        CRITICAL: '🚨'
      };
      
      const text = `
${emoji[alert.level]} *${alert.title}*

${alert.message}

_Time_: ${new Date().toISOString()}
_Level_: ${alert.level}
      `.trim();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
      
      if (response.ok) {
        console.log("✅ Telegram alert sent");
      }
    } catch (error) {
      console.error("❌ Telegram alert failed:", error.message);
    }
  }
  
  /**
   * Send Discord alert
   */
  async sendDiscordAlert(alert) {
    try {
      const colorMap = {
        NONE: 0x00FF00,
        LOW: 0xFFFF00,
        MEDIUM: 0xFFA500,
        HIGH: 0xFF0000,
        CRITICAL: 0x8B0000
      };
      
      const embed = {
        title: alert.title,
        description: alert.message,
        color: colorMap[alert.level],
        fields: [
          {
            name: "Severity",
            value: alert.level.toString(),
            inline: true
          },
          {
            name: "Timestamp",
            value: new Date().toISOString(),
            inline: true
          }
        ],
        footer: {
          text: "dWallet Security Monitor"
        }
      };
      
      const response = await fetch(CONFIG.DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [embed]
        })
      });
      
      if (response.ok) {
        console.log("✅ Discord alert sent");
      }
    } catch (error) {
      console.error("❌ Discord alert failed:", error.message);
    }
  }
  
  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get threat level name from number
   */
  getThreatLevelName(level) {
    const names = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return names[level] || 'UNKNOWN';
  }
}

// ─────────────────────────────────────────────────────────────────────
//  MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.clear();
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   🔍 dWallet Anomaly Detection Monitoring Service    ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");
  
  const monitor = new AnomalyMonitoringService();
  
  try {
    await monitor.initialize();
    console.log("\n✅ Service initialized successfully\n");
    
    // Start monitoring
    await monitor.startMonitoring();
  } catch (error) {
    console.error("\n❌ Fatal Error:", error);
    process.exit(1);
  }
}

// Run the monitor
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
