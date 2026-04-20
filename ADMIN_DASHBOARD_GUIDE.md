# dWallet Admin Dashboard - Complete Setup Guide

## Overview
The dWallet Admin Dashboard is a fully functional, centralized control panel that allows administrators to manage and monitor all aspects of the dWallet ecosystem from a single interface.

## Features

### 1. **System Overview** 📊
- Real-time system metrics and KPIs
- User statistics (total, active 24h)
- Transaction volume tracking
- Contract status monitoring
- Threat level display
- System health checks
- Quick action buttons for common operations

### 2. **User Management** 👥
- View all registered users
- Search by wallet address or referral code
- Filter users by status (active, suspended, banned)
- View detailed user profiles
- Suspend/activate/ban users
- Monitor KYC status
- Track user balances and transaction counts

### 3. **Contract Control** 📜
- Direct interaction with smart contracts
- Pause/unpause contracts
- Trigger circuit breakers
- Reset circuit breakers
- Set fees and parameters
- View contract addresses
- Action logging and audit trail
- Confirmation modals for critical operations

### 4. **Security Monitor** 🛡️
- Real-time threat level monitoring
- Active security alerts
- Circuit breaker status and control
- Anomaly detection thresholds
- Security metrics (blocked threats, checks)
- Alert resolution workflow
- Monitoring pause/resume functionality

### 5. **Token Management** 💎
- Token statistics (supply, circulating, burned)
- Mint new tokens
- Burn tokens (irreversible)
- View token holders
- Monitor large transfers
- Freeze addresses
- Market cap and price tracking

### 6. **Transaction Monitor** 🔄
- Real-time transaction tracking
- Filter by transaction type (transfer, swap, stake, mint, burn)
- Search by transaction hash
- View detailed transaction information
- Transaction status monitoring
- Gas usage tracking
- Link to blockchain explorers

### 7. **Settings & Configuration** ⚙️
- System settings (maintenance mode, new users)
- Transaction limits configuration
- Security settings (session timeout, login attempts)
- API rate limiting
- Environment information display
- Contract address management
- Export/import configurations

## Access & Authentication

### Method 1: Admin Wallet
Add your wallet address to the environment variable:
```env
VITE_ADMIN_WALLETS=0xYourWalletAddress1,0xYourWalletAddress2
```

### Method 2: Admin Key
Set an admin authentication key:
```env
VITE_ADMIN_KEY=your-secure-admin-key-here
```

## Setup Instructions

### 1. Environment Configuration
Add the following to your `.env` file:

```env
# Admin Dashboard Configuration
VITE_ADMIN_KEY=your-secure-admin-key
VITE_ADMIN_WALLETS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Contract Addresses (for Contract Control panel)
VITE_DWT_TOKEN_ADDRESS=0x...
VITE_DEX_ROUTER_ADDRESS=0x...
VITE_STAKING_ADDRESS=0x...
VITE_NFT_MEMBERSHIP_ADDRESS=0x...
VITE_LAYER7_SECURITY_ADDRESS=0x...

# Network Configuration
VITE_NETWORK_NAME=Sepolia
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

### 2. Access the Dashboard
Navigate to: `http://localhost:5173/admin`

Or in production: `https://your-domain.com/admin`

### 3. Authentication
- If your connected wallet matches `VITE_ADMIN_WALLETS`, you'll be auto-authenticated
- Otherwise, enter the admin key from `VITE_ADMIN_KEY`

## Security Features

### Authentication
- Dual authentication methods (wallet + key)
- Session management
- Automatic logout functionality

### Access Control
- Only authorized admins can access the dashboard
- All actions are logged and traceable
- Confirmation modals for critical operations

### Audit Trail
- All contract interactions are logged
- User action history
- Timestamp tracking

## Smart Contract Integration

The admin dashboard is designed to interact with your deployed smart contracts. To enable full functionality:

### 1. Update Contract ABIs
In `src/components/admin/ContractControl.jsx`, add your contract ABIs:

```javascript
const DWT_TOKEN_ABI = [
  "function pause() external",
  "function unpause() external",
  "function mint(address to, uint256 amount) external",
  "function burn(uint256 amount) external",
  // ... add all contract functions
]
```

### 2. Enable Contract Interactions
Replace the placeholder code with actual ethers.js interactions:

```javascript
const signer = provider.getSigner()
const contract = new ethers.Contract(contractAddress, ABI, signer)
const tx = await contract.functionName(params)
await tx.wait()
```

### 3. Event Listeners
Add real-time event monitoring:

```javascript
contract.on("Transfer", (from, to, value) => {
  // Update UI with new transfer
})
```

## API Integration (Optional)

For enhanced functionality, connect to your backend API:

```javascript
// Example: Fetch real user data
const response = await fetch('/api/admin/users')
const users = await response.json()

// Example: Update settings
await fetch('/api/admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(settings)
})
```

## Customization

### Adding New Panels
1. Create a new component in `src/components/admin/`
2. Import it in `AdminDashboard.jsx`
3. Add it to the panels array
4. Style it using the existing admin CSS classes

### Modifying Styles
All admin styles are in `src/index.css` under the "ADMIN DASHBOARD STYLES" section.

### Changing Theme Colors
Modify the CSS variables in `:root`:
- `--accent`: Primary color
- `--green`: Success color
- `--red`: Danger/error color
- `--yellow`: Warning color

## Best Practices

### Security
1. Never commit admin keys to version control
2. Use strong, unique admin keys
3. Regularly rotate admin credentials
4. Monitor admin activity logs
5. Use environment-specific admin wallets

### Performance
1. Implement pagination for large datasets
2. Use debouncing for search inputs
3. Cache frequently accessed data
4. Implement WebSocket for real-time updates

### Maintenance
1. Regularly update contract ABIs
2. Monitor error logs
3. Test admin functions in staging first
4. Backup configurations regularly

## Troubleshooting

### Dashboard Not Loading
- Check browser console for errors
- Verify environment variables are set
- Ensure wallet is connected

### Authentication Failing
- Verify admin wallet address is correct
- Check admin key matches environment variable
- Clear browser cache and try again

### Contract Actions Not Working
- Ensure contracts are deployed and addresses are correct
- Verify ABI matches deployed contract
- Check wallet has necessary permissions
- Confirm sufficient gas for transactions

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Advanced analytics and reporting
- [ ] Multi-signature approval workflow
- [ ] Export data to CSV/PDF
- [ ] Mobile-responsive improvements
- [ ] Role-based access control
- [ ] Automated alert notifications
- [ ] Dashboard customization options
- [ ] Integration with monitoring services
- [ ] Historical data visualization

## Support

For issues or questions:
- Check the browser console for error messages
- Review this documentation
- Contact the development team
- Create an issue in the repository

## License

This admin dashboard is part of the dWallet project and follows the same licensing terms.

---

**Version:** 5.0.0  
**Last Updated:** 2024-01-20  
**Status:** Production Ready
