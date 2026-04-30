/**
 * Layer 11 Supply Chain Contract Configuration
 * Deployed: April 28, 2026 on Base Sepolia
 * All 12 contracts with complete ABIs for frontend integration
 */

// Latest deployed contract addresses
export const LAYER11_ADDRESSES = {
  baseSepolia: {
    SUPPLY_CHAIN_MANAGER: '0xe4C245C903eabb46D38161621c45dEbF38A6c970',
    INVOICE_NFT: '0xF6EC8c2F8F7C84D88b821E42555d7000975dCB7e',
    ESCROW: '0x7C56125c6A48262B0dE2de8B3c8A6c42cF6dcc3f',
    IDENTITY_REGISTRY: '0xD3Bc2d4bA3f15bb46D9ABca9d3837c8CD04B8806',
    ORACLE_ADAPTER: '0x49803164EfB948ba8136d605584695660CBc9895',
    DISPUTE_RESOLUTION: '0xA55FAc792317AE09Ed625eEB002fE76a8d83d771',
    FINANCING_POOL: '0x9F4414946Eb9783a8C57F2d346D4E2FCB3531F9b',
    ADVANCED_FINANCING: '0xC5C1E9CADAa6BCFc152D8856F4B12069C35b8dD7',
    INSURANCE: '0xF65Fa97D8542E4f9D4b29BD44a272da90788d5c3',
    RETURNS: '0xDf5457c02F982c5e58039a19ADc1FBd5e771a4Fb',
    MILESTONE_DIST: '0x1Ad1f97C98c894c37CdC18631EF9B95C6Bb67660',
    INVOICE_MARKETPLACE: '0x24033D116096F5C860aE7250df97c85593e6Bd3b',
    MOCK_DWT: '0x682EaED4f87d7b3d787aeFEB61a723Cf7d7dD69a',
    MOCK_USDC: '0xaE75b3166A553E1aaEf5EC515CF130B17410B894'
  }
}

// Complete ABIs for all 12 contracts
export const LAYER11_ABIS = {
  SUPPLY_CHAIN_MANAGER: [
    "function createInvoice(address supplier, address buyer, uint256 amount, uint256 dueDate, string metadataURI) external returns (uint256)",
    "function fundEscrow(uint256 invoiceId) external payable returns (uint256)",
    "function confirmDelivery(uint256 escrowId, string deliveryProof) external",
    "function releaseFunds(uint256 escrowId) external",
    "function getInvoice(uint256 invoiceId) external view returns (address supplier, address buyer, uint256 amount, uint256 dueDate, uint8 status)",
    "function getEscrow(uint256 escrowId) external view returns (address buyer, address supplier, uint256 amount, uint256 invoiceId, uint8 status)",
    "function totalInvoices() external view returns (uint256)",
    "function totalEscrows() external view returns (uint256)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  INVOICE_NFT: [
    "function totalSupply() external view returns (uint256)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function getInvoice(uint256 invoiceId) external view returns (address supplier, address buyer, uint256 amount, uint256 dueDate, uint8 status, string metadataURI)",
    "function mintInvoice(address supplier, address buyer, uint256 amount, uint256 dueDate, string metadataURI) external returns (uint256)",
    "function approveInvoice(uint256 invoiceId) external",
    "function rejectInvoice(uint256 invoiceId, string reason) external",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)",
    "function MINTER_ROLE() external view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
    "function hasRole(bytes32 role, address account) external view returns (bool)",
    "function grantRole(bytes32 role, address account) external"
  ],

  ESCROW: [
    "function createEscrow(uint256 invoiceId, address supplier, uint256 amount, string orderDescription) external returns (uint256)",
    "function fundEscrow(uint256 escrowId) external payable",
    "function confirmDelivery(uint256 escrowId, string deliveryProof) external",
    "function releaseFunds(uint256 escrowId) external",
    "function refundBuyer(uint256 escrowId) external",
    "function getEscrow(uint256 escrowId) external view returns (uint256 id, address buyer, address supplier, uint256 amount, uint256 invoiceId, uint8 status, string orderDescription, uint256 createdAt, uint256 fundedAt, uint256 resolvedAt, uint256 approvalCount)",
    "function getTotalEscrows() external view returns (uint256)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  IDENTITY_REGISTRY: [
    "function registerEntity(string name, uint8 entityType, string registrationId, string documentHash) external",
    "function getEntityProfile(address entity) external view returns (string name, uint8 entityType, string registrationId, uint8 kycStatus, uint256 reputationScore, bool isBlacklisted, string documentHash)",
    "function isRegistered(address entity) external view returns (bool)",
    "function updateKYCStatus(address entity, uint8 kycStatus, string notes) external",
    "function updateReputation(address entity, uint256 score) external",
    "function blacklistEntity(address entity, string reason) external",
    "function VERIFIER_ROLE() external view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)"
  ],

  ORACLE_ADAPTER: [
    "function submitEvent(uint256 invoiceId, uint8 eventType, string proofURI) external returns (uint256)",
    "function confirmEvent(uint256 eventId) external",
    "function getOracleEvent(uint256 eventId) external view returns (uint256 invoiceId, uint8 eventType, uint256 timestamp, uint8 status, uint256 confirmations, uint256 requiredConfirmations)",
    "function registerOracle(address oracle, string name) external",
    "function ORACLE_ROLE() external view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)"
  ],

  DISPUTE_RESOLUTION: [
    "function createDispute(uint256 escrowId, string evidence) external returns (uint256)",
    "function submitEvidence(uint256 disputeId, string evidence) external",
    "function voteResolution(uint256 disputeId, bool voteForBuyer) external",
    "function executeResolution(uint256 disputeId) external",
    "function registerJudge(address judge, string name) external",
    "function getDispute(uint256 disputeId) external view returns (uint256 escrowId, uint256 createdAt, uint8 status, bool buyerWins, uint256 votesForBuyer, uint256 votesForSupplier)",
    "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
    "function JUDGE_ROLE() external view returns (bytes32)"
  ],

  FINANCING_POOL: [
    "function requestLoan(uint256 invoiceId, uint256 amount, uint256 duration) external returns (uint256)",
    "function approveLoan(uint256 loanId) external",
    "function repayLoan(uint256 loanId) external",
    "function getLoanDetails(uint256 loanId) external view returns (address borrower, uint256 principal, uint256 interest, uint256 duration, uint8 status)",
    "function getTotalLiquidity() external view returns (uint256)",
    "function depositLiquidity(uint256 amount) external",
    "function withdrawLiquidity(uint256 amount) external",
    "function pause() external",
    "function unpause() external"
  ],

  ADVANCED_FINANCING: [
    "function requestFinancing(uint256 invoiceId, uint256 amount, uint8 financingType) external returns (uint256)",
    "function approveFinancing(uint256 financingId) external",
    "function repayFinancing(uint256 financingId) external",
    "function depositFunds() external payable",
    "function withdrawFunds(uint256 amount) external",
    "function pause() external",
    "function unpause() external"
  ],

  INSURANCE: [
    "function purchasePolicy(uint256 invoiceId, uint256 coverageAmount) external payable returns (uint256)",
    "function fileClaim(uint256 policyId, string claimReason, string evidence) external returns (uint256)",
    "function approveClaim(uint256 claimId) external",
    "function rejectClaim(uint256 claimId) external",
    "function getTotalPoolBalance() external view returns (uint256)",
    "function getMinimumSolvencyRatio() external view returns (uint256)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  RETURNS: [
    "function requestReturn(uint256 invoiceId, string reason, uint256 amount) external returns (uint256)",
    "function approveReturnAndRefund(uint256 returnId, string resolutionNotes) external",
    "function rejectReturn(uint256 returnId, string resolutionNotes) external",
    "function getReturnRequest(uint256 returnId) external view returns (uint256 invoiceId, address buyer, uint256 amount, uint8 status, string reason)",
    "function pause() external",
    "function unpause() external"
  ],

  MILESTONE_DIST: [
    "function createDistribution(address beneficiary, uint256 totalAllocation, string[] milestoneNames, string[] milestoneDescriptions, uint256[] milestoneRewards) external",
    "function submitMilestoneProof(uint256 milestoneId, string proofURI) external",
    "function approveMilestone(uint256 milestoneId) external",
    "function getDistribution(address beneficiary) external view returns (address beneficiary, uint256 totalAllocation, uint256 totalReleased, uint256 milestoneCount, bool isActive)",
    "function releaseMilestonePayment(uint256 milestoneId) external"
  ],

  INVOICE_MARKETPLACE: [
    "function listInvoice(uint256 invoiceId, uint256 price) external",
    "function purchaseInvoice(uint256 listingId) external payable",
    "function cancelListing(uint256 listingId) external",
    "function getListing(uint256 listingId) external view returns (uint256 invoiceId, address seller, uint256 price, bool isActive)",
    "function pause() external",
    "function unpause() external"
  ],

  ERC20_TOKEN: [
    "function balanceOf(address account) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function name() external view returns (string)"
  ]
}

// Helper function to get contract address
export const getLayer11Address = (contractName, network = 'baseSepolia') => {
  return LAYER11_ADDRESSES[network]?.[contractName] || null
}

// Helper function to initialize all contracts
export const initializeLayer11Contracts = async (ethers, signerOrProvider) => {
  const contracts = {}
  
  for (const [name, address] of Object.entries(LAYER11_ADDRESSES.baseSepolia)) {
    if (LAYER11_ABIS[name]) {
      contracts[name] = new ethers.Contract(address, LAYER11_ABIS[name], signerOrProvider)
    }
  }
  
  return contracts
}
