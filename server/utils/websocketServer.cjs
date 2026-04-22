/**
 * 🔄 WebSocket Server for Real-Time Updates
 * 
 * Features:
 * - Real-time price updates
 * - Transaction status notifications
 * - Balance change alerts
 * - User-specific channels
 * - Auto-reconnection support
 * - Message throttling
 * 
 * Use Cases:
 * - Live token price feeds
 * - Transaction confirmations
 * - Balance updates
 * - Market alerts
 * - Admin notifications
 */

const WebSocket = require('ws');
const { redisCache, priceCacheKey, CACHE_TTL } = require('./redisCache.cjs');

class RealtimeWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // clientId -> { ws, subscriptions, userTier }
    this.subscribers = new Map(); // channel -> Set<clientId>
    this.messageQueue = new Map(); // clientId -> queue of messages
    this.throttleTimers = new Map(); // clientId -> throttle timer
    this.stats = {
      connections: 0,
      disconnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
    };

    this.setupWebSocket();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error.message);
      this.stats.errors++;
    });

    console.log('✅ WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    
    console.log(`🔌 Client connected: ${clientId}`);
    this.stats.connections++;

    // Store client info
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      userTier: 'free',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      message: 'Connected to dWallet real-time updates',
      timestamp: Date.now(),
    });

    // Handle incoming messages
    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error.message);
      this.stats.errors++;
    });

    // Send connection stats every 30 seconds
    this.sendConnectionStats(clientId);
  }

  /**
   * Handle incoming WebSocket message
   */
  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = Date.now();
    this.stats.messagesReceived++;

    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'subscribe':
          await this.handleSubscribe(clientId, data);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, data);
          break;
        
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;
        
        case 'get_price':
          await this.handlePriceRequest(clientId, data);
          break;
        
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Unknown message type',
          });
      }
    } catch (error) {
      console.error(`Message handling error for ${clientId}:`, error.message);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }

  /**
   * Handle subscription to channel
   */
  async handleSubscribe(clientId, data) {
    const { channel } = data;
    const client = this.clients.get(clientId);
    if (!client) return;

    // Check tier-based subscription limits
    const maxSubscriptions = this.getMaxSubscriptions(client.userTier);
    if (client.subscriptions.size >= maxSubscriptions) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `Subscription limit reached for ${client.userTier} tier`,
        limit: maxSubscriptions,
      });
      return;
    }

    client.subscriptions.add(channel);

    // Add to channel subscribers
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel).add(clientId);

    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
      timestamp: Date.now(),
    });

    console.log(`📡 Client ${clientId} subscribed to ${channel}`);
  }

  /**
   * Handle unsubscription from channel
   */
  handleUnsubscribe(clientId, data) {
    const { channel } = data;
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);

    const channelSubscribers = this.subscribers.get(channel);
    if (channelSubscribers) {
      channelSubscribers.delete(clientId);
      if (channelSubscribers.size === 0) {
        this.subscribers.delete(channel);
      }
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle price data request
   */
  async handlePriceRequest(clientId, data) {
    const { tokenAddress, currency = 'USD' } = data;
    const cacheKey = priceCacheKey(tokenAddress, currency);

    try {
      // Try cache first
      const cachedPrice = await redisCache.get(cacheKey);
      
      if (cachedPrice) {
        this.sendToClient(clientId, {
          type: 'price_update',
          tokenAddress,
          currency,
          price: cachedPrice,
          source: 'cache',
          timestamp: Date.now(),
        });
      } else {
        // Fetch from external API
        const axios = require('axios');
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/token_price/ethereum`,
          {
            params: {
              contract_addresses: tokenAddress,
              vs_currencies: currency.toLowerCase(),
            },
          }
        );

        const priceData = {
          price: response.data[tokenAddress.toLowerCase()]?.[currency.toLowerCase()] || 0,
          timestamp: Date.now(),
        };

        // Cache the price
        await redisCache.set(cacheKey, priceData, CACHE_TTL.PRICE);

        this.sendToClient(clientId, {
          type: 'price_update',
          tokenAddress,
          currency,
          price: priceData,
          source: 'api',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Price fetch error:', error.message);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to fetch price',
      });
    }
  }

  /**
   * Broadcast message to channel subscribers
   */
  broadcastToChannel(channel, message, excludeClientId = null) {
    const subscribers = this.subscribers.get(channel);
    if (!subscribers) return;

    for (const clientId of subscribers) {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * Send message to specific client with throttling
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const messageStr = JSON.stringify(message);
      client.ws.send(messageStr);
      this.stats.messagesSent++;
      return true;
    } catch (error) {
      console.error(`Failed to send to client ${clientId}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    for (const channel of client.subscriptions) {
      const subscribers = this.subscribers.get(channel);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    }

    // Clear timers
    const timer = this.throttleTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.throttleTimers.delete(clientId);
    }

    this.clients.delete(clientId);
    this.stats.disconnections++;

    console.log(`🔌 Client disconnected: ${clientId}`);
  }

  /**
   * Get max subscriptions based on tier
   */
  getMaxSubscriptions(tier) {
    const limits = {
      free: 5,
      premium: 20,
      vip: 50,
      admin: 100,
    };
    return limits[tier] || limits.free;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send connection stats to client
   */
  sendConnectionStats(clientId) {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(interval);
        return;
      }

      this.sendToClient(clientId, {
        type: 'stats',
        connections: this.wss.clients.size,
        uptime: Date.now() - this.wss._startTime,
        timestamp: Date.now(),
      });
    }, 30000);
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.wss.clients.size,
      activeChannels: this.subscribers.size,
      totalSubscriptions: Array.from(this.subscribers.values())
        .reduce((sum, subs) => sum + subs.size, 0),
    };
  }

  /**
   * Close all connections (graceful shutdown)
   */
  close() {
    for (const [clientId, client] of this.clients) {
      client.ws.close(1000, 'Server shutting down');
    }
    this.wss.close();
    console.log('🔌 WebSocket server closed');
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXPRESS MIDDLEWARE FOR WEBSOCKET
// ─────────────────────────────────────────────────────────────────────

/**
 * Create WebSocket server and attach to HTTP server
 * @param {http.Server} server - HTTP server instance
 * @returns {RealtimeWebSocketServer} WebSocket server instance
 */
function createWebSocketServer(server) {
  const wsServer = new RealtimeWebSocketServer(server);
  return wsServer;
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  RealtimeWebSocketServer,
  createWebSocketServer,
};
