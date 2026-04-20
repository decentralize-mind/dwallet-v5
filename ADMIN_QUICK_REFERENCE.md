# Admin Dashboard - Quick Reference Card

## 🚀 Quick Start

```bash
# Terminal 1: Start Backend
node server/admin-server.js

# Terminal 2: Start Frontend  
npm run dev

# Access: http://localhost:5173/admin
```

---

## 🔑 Environment Variables

Add to `.env`:
```env
ADMIN_SERVER_PORT=3001
ADMIN_SECRET_KEY=your-secret-key-min-32-chars
JWT_SECRET=your-jwt-secret-min-64-chars
ADMIN_WALLETS=0xYourWallet1,0xYourWallet2
ADMIN_ALLOWED_ORIGINS=http://localhost:5173
VITE_ADMIN_API_URL=http://localhost:3001
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Login with key or wallet
- `POST /api/admin/auth/2fa/setup` - Setup 2FA
- `POST /api/admin/auth/2fa/verify` - Verify 2FA token
- `POST /api/admin/auth/2fa/disable` - Disable 2FA
- `GET /api/admin/auth/2fa/status` - Check 2FA status

### System
- `GET /api/admin/health` - Health check (no auth)
- `GET /api/admin/stats` - System statistics

### IP Lists
- `GET /api/admin/ip-lists/whitelist` - Get whitelist
- `POST /api/admin/ip-lists/whitelist/add` - Add IP
- `POST /api/admin/ip-lists/whitelist/remove` - Remove IP
- `GET /api/admin/ip-lists/banned` - Get banned IPs
- `POST /api/admin/ip-lists/ban` - Ban IP
- `POST /api/admin/ip-lists/unban` - Unban IP
- `GET /api/admin/ip-lists/activity` - Activity logs
- `GET /api/admin/ip-lists/stats` - Statistics

### Users
- `GET /api/admin/users` - List users (with filters)
- `POST /api/admin/users/:id/suspend` - Suspend user
- `POST /api/admin/users/:id/activate` - Activate user

### Security
- `GET /api/admin/security/alerts` - Get alerts
- `POST /api/admin/security/alerts/:id/resolve` - Resolve alert
- `POST /api/admin/security/circuit-breaker/trigger` - Trigger
- `POST /api/admin/security/circuit-breaker/reset` - Reset

### Tokens
- `POST /api/admin/tokens/mint` - Mint tokens
- `POST /api/admin/tokens/burn` - Burn tokens

### Contracts
- `POST /api/admin/contracts/:id/pause` - Pause contract
- `POST /api/admin/contracts/:id/unpause` - Unpause contract

### Audit
- `GET /api/admin/audit-logs` - Get audit logs

---

## 🔐 Authentication

### Login with Key
```javascript
await adminAPI.loginWithKey('your-admin-key')
```

### Login with Wallet
```javascript
const signer = provider.getSigner()
await adminAPI.loginWithWallet(signer)
```

### With 2FA
```javascript
// If 2FA enabled, login returns requires2FA: true
await adminAPI.loginWithKey('key', '123456') // with 2FA token
```

---

## 📊 Frontend Components

### Updated Components
1. **SystemOverview** - Auto-refreshes stats every 30s
2. **SecurityMonitor** - Live alerts, circuit breaker control
3. **SettingsPanel** - 2FA setup and management
4. **UserManagement** - User list with search/filter
5. **TokenManagement** - Mint/burn with validation
6. **ContractControl** - Pause/unpause contracts
7. **IPListsManagement** - IP whitelist/blacklist

### Using adminAPI Service
```javascript
import adminAPI from '../../services/adminAPI'

// GET request
const response = await adminAPI.get('/api/admin/stats')

// GET with query params
const users = await adminAPI.get('/api/admin/users', {
  params: { status: 'active', search: '0x123' }
})

// POST request
await adminAPI.post('/api/admin/tokens/mint', {
  address: '0x...',
  amount: '1000'
})
```

---

## 🛡️ Security Features

### Built-in Protection
- ✅ JWT authentication (8-hour expiry)
- ✅ 2FA support (TOTP)
- ✅ Rate limiting (50 req/15min general, 10 for auth)
- ✅ CORS whitelist
- ✅ Helmet security headers
- ✅ Audit logging
- ✅ Input validation
- ✅ IP validation

### Rate Limits
- Login attempts: 10 per 15 minutes
- Ban operations: 10 per 15 minutes
- General API: 50 per 15 minutes

---

## 🧪 Testing

### Run Tests
```bash
./test-admin-improvements.sh
```

### Manual Test - Health Check
```bash
curl http://localhost:3001/api/admin/health
```

### Manual Test - Auth Required
```bash
curl http://localhost:3001/api/admin/stats
# Should return: {"error":"No token provided"}
```

---

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

### CORS Errors
- Verify `ADMIN_ALLOWED_ORIGINS` includes your frontend URL
- Check frontend uses correct `VITE_ADMIN_API_URL`

### Authentication Fails
- Verify `ADMIN_SECRET_KEY` is set
- Check wallet address in `ADMIN_WALLETS`
- Ensure JWT_SECRET is minimum 32 characters

### 2FA Issues
- Check system time (TOTP is time-sensitive)
- Re-scan QR code if codes don't work
- Disable 2FA via API if locked out

---

## 📝 Code Examples

### Add IP to Whitelist (Frontend)
```javascript
await adminAPI.post('/api/admin/ip-lists/whitelist/add', {
  ip: '192.168.1.100',
  description: 'Office Network'
})
```

### Suspend User (Frontend)
```javascript
await adminAPI.post(`/api/admin/users/${userId}/suspend`, {
  reason: 'Violated terms of service'
})
```

### Get Filtered Users (Frontend)
```javascript
const response = await adminAPI.get('/api/admin/users', {
  params: {
    status: 'active',
    search: '0x742d',
    limit: 20,
    offset: 0
  }
})
```

### Trigger Circuit Breaker (Frontend)
```javascript
await adminAPI.post('/api/admin/security/circuit-breaker/trigger', {
  reason: 'Suspicious activity detected'
})
```

---

## 📈 Auto-Refresh Intervals

| Component | Interval |
|-----------|----------|
| System Overview | 30 seconds |
| Security Monitor | 60 seconds |
| IP Lists | Manual |
| User Management | Manual |
| Token Management | Manual |

---

## 🎯 Next Steps for Production

1. **Database**: Replace in-memory storage with PostgreSQL
2. **HTTPS**: Enable SSL/TLS
3. **Monitoring**: Add Datadog/Sentry
4. **Backups**: Automated database backups
5. **Load Balancer**: nginx reverse proxy
6. **Redis**: Session management
7. **Multi-sig**: For critical operations
8. **WebSockets**: Real-time updates

---

## 📚 Documentation Files

- `ADMIN_IMPROVEMENTS_COMPLETE.md` - Full implementation details
- `ADMIN_DASHBOARD_GUIDE.md` - Original setup guide
- `ADMIN_SECURITY_GUIDE.md` - Security best practices
- `ADMIN_NAVIGATION_GUIDE.md` - UI navigation guide
- `test-admin-improvements.sh` - Automated tests

---

**Version**: 5.1.0  
**Last Updated**: April 20, 2026  
**Status**: ✅ Production Ready (with database pending)
