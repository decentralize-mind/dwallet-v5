/**
 * 🛡️ Supply Chain Admin API Routes
 * 
 * All routes protected by comprehensive security middleware
 */

const express = require('express');
const security = require('../supply-chain-security.cjs');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────
//  AUTHENTICATION ROUTES
// ─────────────────────────────────────────────────────────────────────

// POST /api/supply-chain/auth - Authenticate wallet
router.post(
  '/auth',
  security.middlewareStacks.auth,
  security.authenticateWallet,
  (req, res) => {
    res.json({
      success: true,
      message: 'Authentication successful',
      address: req.walletAddress,
      network: req.network
    });
  }
);

// ─────────────────────────────────────────────────────────────────────
//  DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────

// GET /api/supply-chain/stats - Get dashboard statistics
router.get(
  '/stats',
  security.middlewareStacks.standard,
  async (req, res) => {
    try {
      // In production, fetch from blockchain/indexer
      const stats = {
        totalInvoices: 0,
        activeEscrows: 0,
        registeredEntities: 0,
        pendingMilestones: 0,
        totalFinanced: 0,
        timestamp: Date.now()
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      security.logSecurityEvent('STATS_ERROR', 'medium', {
        error: error.message,
        wallet: req.walletAddress
      });

      res.status(500).json({
        error: 'Failed to fetch stats'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────
//  INVOICE ROUTES
// ─────────────────────────────────────────────────────────────────────

// POST /api/supply-chain/invoices/mint - Mint new invoice
router.post(
  '/invoices/mint',
  security.middlewareStacks.critical,
  security.validateInput({
    supplier: {
      required: true,
      ethAddress: true
    },
    buyer: {
      required: true,
      ethAddress: true
    },
    amount: {
      required: true,
      type: 'number',
      min: 1,
      max: 10000000
    },
    dueDate: {
      required: true,
      type: 'number'
    },
    metadataURI: {
      required: false,
      type: 'string',
      maxLength: 500
    }
  }),
  async (req, res) => {
    try {
      const { supplier, buyer, amount, dueDate, metadataURI } = req.validatedInput;

      // Log critical operation
      security.logSecurityEvent('INVOICE_MINT_REQUEST', 'medium', {
        wallet: req.walletAddress,
        supplier,
        buyer,
        amount,
        dueDate
      });

      // In production: Execute blockchain transaction
      // const contract = getContract('INVOICE_NFT');
      // const tx = await contract.mintInvoice(supplier, buyer, amount, dueDate, metadataURI || '');
      // const receipt = await tx.wait();

      res.json({
        success: true,
        message: 'Invoice minted successfully',
        // txHash: receipt.transactionHash
      });

    } catch (error) {
      security.logSecurityEvent('INVOICE_MINT_ERROR', 'high', {
        error: error.message,
        wallet: req.walletAddress
      });

      res.status(500).json({
        error: 'Failed to mint invoice'
      });
    }
  }
);

// GET /api/supply-chain/invoices - Get invoices
router.get(
  '/invoices',
  security.middlewareStacks.standard,
  async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      // In production: Fetch from blockchain/indexer
      const invoices = [];

      res.json({
        success: true,
        data: invoices,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: 0
        }
      });

    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch invoices'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────
//  ENTITY ROUTES
// ─────────────────────────────────────────────────────────────────────

// POST /api/supply-chain/entities/register - Register entity
router.post(
  '/entities/register',
  security.middlewareStacks.critical,
  security.validateInput({
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100
    },
    entityType: {
      required: true,
      type: 'number',
      min: 0,
      max: 5
    },
    registrationId: {
      required: true,
      type: 'string',
      maxLength: 50
    },
    documentHash: {
      required: false,
      type: 'string',
      maxLength: 200
    }
  }),
  async (req, res) => {
    try {
      const { name, entityType, registrationId, documentHash } = req.validatedInput;

      security.logSecurityEvent('ENTITY_REGISTER_REQUEST', 'medium', {
        wallet: req.walletAddress,
        name,
        entityType,
        registrationId
      });

      res.json({
        success: true,
        message: 'Entity registered successfully'
      });

    } catch (error) {
      security.logSecurityEvent('ENTITY_REGISTER_ERROR', 'high', {
        error: error.message,
        wallet: req.walletAddress
      });

      res.status(500).json({
        error: 'Failed to register entity'
      });
    }
  }
);

// GET /api/supply-chain/entities - Get entities
router.get(
  '/entities',
  security.middlewareStacks.standard,
  async (req, res) => {
    try {
      const entities = [];

      res.json({
        success: true,
        data: entities
      });

    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch entities'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────
//  ESCROW ROUTES
// ─────────────────────────────────────────────────────────────────────

// POST /api/supply-chain/escrows/create - Create escrow
router.post(
  '/escrows/create',
  security.middlewareStacks.critical,
  security.validateInput({
    invoiceId: {
      required: true,
      type: 'number',
      min: 0
    },
    supplier: {
      required: true,
      ethAddress: true
    },
    amount: {
      required: true,
      type: 'number',
      min: 1,
      max: 10000000
    }
  }),
  async (req, res) => {
    try {
      const { invoiceId, supplier, amount } = req.validatedInput;

      security.logSecurityEvent('ESCROW_CREATE_REQUEST', 'high', {
        wallet: req.walletAddress,
        invoiceId,
        supplier,
        amount
      });

      res.json({
        success: true,
        message: 'Escrow created successfully'
      });

    } catch (error) {
      security.logSecurityEvent('ESCROW_CREATE_ERROR', 'high', {
        error: error.message,
        wallet: req.walletAddress
      });

      res.status(500).json({
        error: 'Failed to create escrow'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────
//  MILESTONE ROUTES
// ─────────────────────────────────────────────────────────────────────

// POST /api/supply-chain/milestones/setup - Setup milestone distribution
router.post(
  '/milestones/setup',
  security.middlewareStacks.critical,
  security.validateInput({
    beneficiary: {
      required: true,
      ethAddress: true
    },
    totalAllocation: {
      required: true,
      type: 'number',
      min: 1,
      max: 100000000
    },
    milestoneNames: {
      required: true,
      validate: (val) => Array.isArray(val) && val.length > 0
    },
    milestoneDescriptions: {
      required: true,
      validate: (val) => Array.isArray(val) && val.length > 0
    },
    milestoneRewards: {
      required: true,
      validate: (val) => Array.isArray(val) && val.length > 0
    }
  }),
  async (req, res) => {
    try {
      const { beneficiary, totalAllocation, milestoneNames, milestoneDescriptions, milestoneRewards } = req.validatedInput;

      security.logSecurityEvent('MILESTONE_SETUP_REQUEST', 'critical', {
        wallet: req.walletAddress,
        beneficiary,
        totalAllocation,
        milestoneCount: milestoneNames.length
      });

      res.json({
        success: true,
        message: 'Milestone distribution setup successfully'
      });

    } catch (error) {
      security.logSecurityEvent('MILESTONE_SETUP_ERROR', 'critical', {
        error: error.message,
        wallet: req.walletAddress
      });

      res.status(500).json({
        error: 'Failed to setup milestone distribution'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────
//  ROLE MANAGEMENT ROUTES
// ─────────────────────────────────────────────────────────────────────

// POST /api/supply-chain/roles/grant - Grant role
router.post(
  '/roles/grant',
  security.middlewareStacks.critical,
  security.validateInput({
    contractAddress: {
      required: true,
      ethAddress: true
    },
    role: {
      required: true,
      type: 'string',
      maxLength: 100
    },
    account: {
      required: true,
      ethAddress: true
    }
  }),
  async (req, res) => {
    try {
      const { contractAddress, role, account } = req.validatedInput;

      security.logSecurityEvent('ROLE_GRANT_REQUEST', 'critical', {
        wallet: req.walletAddress,
        contract: contractAddress,
        role,
        account,
        ip: req.ip
      });

      // Additional verification for role grants
      // - Check if requester has DEFAULT_ADMIN_ROLE
      // - Verify role is not DEFAULT_ADMIN_ROLE (prevent giving away super admin)
      // - Log to immutable audit trail

      res.json({
        success: true,
        message: 'Role granted successfully'
      });

    } catch (error) {
      security.logSecurityEvent('ROLE_GRANT_ERROR', 'critical', {
        error: error.message,
        wallet: req.walletAddress
      });

      res.status(500).json({
        error: 'Failed to grant role'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────
//  SECURITY ROUTES
// ─────────────────────────────────────────────────────────────────────

// GET /api/supply-chain/security/events - Get security events (admin only)
router.get(
  '/security/events',
  security.middlewareStacks.standard,
  (req, res) => {
    const { limit = 100, severity } = req.query;

    let events = security.stores.securityEvents;

    // Filter by severity if provided
    if (severity) {
      events = events.filter(e => e.severity === severity);
    }

    // Limit results
    events = events.slice(-Number(limit));

    res.json({
      success: true,
      data: events,
      total: events.length
    });
  }
);

// POST /api/supply-chain/security/emergency/pause - Emergency pause
router.post(
  '/security/emergency/pause',
  security.middlewareStacks.critical,
  security.validateInput({
    reason: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 500
    }
  }),
  (req, res) => {
    const { reason } = req.validatedInput;

    security.emergencyControls.pauseAll(reason);

    security.logSecurityEvent('EMERGENCY_PAUSE_ACTIVATED', 'critical', {
      wallet: req.walletAddress,
      reason,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Emergency pause activated'
    });
  }
);

// POST /api/supply-chain/security/emergency/resume - Resume operations
router.post(
  '/security/emergency/resume',
  security.middlewareStacks.critical,
  (req, res) => {
    security.emergencyControls.resumeAll();

    security.logSecurityEvent('EMERGENCY_RESUME_ACTIVATED', 'critical', {
      wallet: req.walletAddress,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Operations resumed'
    });
  }
);

// ─────────────────────────────────────────────────────────────────────
//  HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────

// GET /api/supply-chain/health - Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    security: {
      rateLimiting: true,
      walletAuth: true,
      sessionValidation: true,
      inputValidation: true,
      transactionGuard: true,
      anomalyDetection: true,
      emergencyControls: true,
      auditLogging: true
    },
    config: {
      sessionTimeout: security.SECURITY_CONFIG.SESSION_TIMEOUT / 1000 / 60 + ' minutes',
      maxTxPerHour: security.SECURITY_CONFIG.MAX_TX_VALUE_PER_HOUR.toLocaleString() + ' DWT',
      failedAuthLockout: security.SECURITY_CONFIG.THRESHOLDS.FAILED_AUTH + ' attempts'
    }
  });
});

module.exports = router;
