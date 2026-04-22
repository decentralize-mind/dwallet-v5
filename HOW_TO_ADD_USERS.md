# How to Add More Users to Admin Dashboard

## Quick Guide

---

## Method 1: Add Sample Users (For Testing)

### Step 1: Open the Server File
Edit `server/admin-server.js`

### Step 2: Locate the initSampleUsers Function
Find this section around line 112:

```javascript
const initSampleUsers = () => {
  const sampleUsers = [
    // ... existing users ...
  ];
```

### Step 3: Add a New User
Add a new user object to the `sampleUsers` array:

```javascript
{
  id: 'user-006',
  address: '0xYourNewWalletAddressHere',
  referralCode: 'REF006',
  status: 'active',  // or 'suspended'
  balance: '1,000.00',
  transactions: 25,
  kycStatus: 'verified',  // or 'pending', 'not_submitted'
  joinDate: '2026-04-21',
  lastActive: 'Just now'
}
```

### Step 4: Restart the Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
node server/admin-server.js
```

### Example: Adding 3 More Users

```javascript
const initSampleUsers = () => {
  const sampleUsers = [
    // ... existing 5 users ...
    
    // NEW USER 1
    {
      id: 'user-006',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      referralCode: 'REF006',
      status: 'active',
      balance: '3,500.00',
      transactions: 156,
      kycStatus: 'verified',
      joinDate: '2026-01-15',
      lastActive: '5 minutes ago'
    },
    
    // NEW USER 2
    {
      id: 'user-007',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      referralCode: 'REF007',
      status: 'active',
      balance: '750.50',
      transactions: 34,
      kycStatus: 'pending',
      joinDate: '2026-04-10',
      lastActive: '3 hours ago'
    },
    
    // NEW USER 3
    {
      id: 'user-008',
      address: '0x9876543210fedcba9876543210fedcba98765432',
      referralCode: 'REF008',
      status: 'suspended',
      balance: '200.00',
      transactions: 8,
      kycStatus: 'not_submitted',
      joinDate: '2026-04-01',
      lastActive: '2 days ago',
      suspensionReason: 'Multiple failed login attempts',
      suspendedAt: '2026-04-19'
    }
  ];

  sampleUsers.forEach(user => {
    USERS_DB.set(user.id, user);
  });

  console.log(`✅ Initialized ${sampleUsers.length} sample users`);
};
```

---

## Method 2: Add Users via API (Dynamic)

### Create a POST Endpoint

Add this to `server/admin-server.js`:

```javascript
/**
 * POST /api/admin/users
 * Create a new user
 */
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { address, referralCode, balance, kycStatus } = req.body;
    
    // Validate required fields
    if (!address || !referralCode) {
      return res.status(400).json({ 
        error: 'Address and referral code are required' 
      });
    }
    
    // Generate user ID
    const userId = `user-${Date.now()}`;
    
    // Create user object
    const newUser = {
      id: userId,
      address,
      referralCode,
      status: 'active',
      balance: balance || '0.00',
      transactions: 0,
      kycStatus: kycStatus || 'not_submitted',
      joinDate: new Date().toISOString().split('T')[0],
      lastActive: 'Just now'
    };
    
    // Save to database
    USERS_DB.set(userId, newUser);
    
    // Log action
    logAdminAction(
      req.admin.adminId,
      'CREATE_USER',
      'user_management',
      { userId, address },
      req.adminIP
    );
    
    res.json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});
```

### Use the API to Add Users

```bash
# First, get your auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"type":"key","credentials":{"adminKey":"YOUR_ADMIN_KEY"}}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# Create a new user
curl -X POST http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xNewUserAddress123456789012345678901234",
    "referralCode": "REF009",
    "balance": "500.00",
    "kycStatus": "verified"
  }'
```

---

## Method 3: Import from CSV/JSON

### Create an Import Script

Create `scripts/import-users.js`:

```javascript
const fs = require('fs');

// Read users from JSON file
const usersData = JSON.parse(fs.readFileSync('users-to-import.json', 'utf8'));

console.log(`Importing ${usersData.length} users...`);

// You would need to send these to your API or add directly to USERS_DB
usersData.forEach((user, index) => {
  console.log(`User ${index + 1}: ${user.address}`);
});

console.log('Import complete!');
```

### Create users-to-import.json

```json
[
  {
    "address": "0xAddress1...",
    "referralCode": "REF010",
    "balance": "1000.00",
    "kycStatus": "verified"
  },
  {
    "address": "0xAddress2...",
    "referralCode": "REF011",
    "balance": "2500.50",
    "kycStatus": "pending"
  }
]
```

---

## User Object Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique identifier (e.g., 'user-001') |
| `address` | string | ✅ Yes | Ethereum wallet address |
| `referralCode` | string | ✅ Yes | Unique referral code |
| `status` | string | ✅ Yes | 'active', 'suspended', or 'banned' |
| `balance` | string | No | User's token balance |
| `transactions` | number | No | Number of transactions |
| `kycStatus` | string | No | 'verified', 'pending', 'not_submitted' |
| `joinDate` | string | No | Registration date (YYYY-MM-DD) |
| `lastActive` | string | No | Last activity timestamp |
| `suspensionReason` | string | Conditional | Required if status='suspended' |
| `suspendedAt` | string | Conditional | Suspension date if status='suspended' |

---

## Verification

After adding users, verify they appear in the dashboard:

### Option 1: Via API
```bash
curl -s http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | python3 -m json.tool
```

### Option 2: Via Browser
1. Open `http://localhost:5173/admin`
2. Login with admin key
3. Navigate to "👥 User Management"
4. Users should appear in the table

---

## Tips

✅ **Unique IDs**: Each user must have a unique `id`  
✅ **Valid Addresses**: Use proper Ethereum addresses (0x...)  
✅ **Referral Codes**: Keep them unique and memorable  
✅ **Status Values**: Only use 'active', 'suspended', or 'banned'  
✅ **KYC Values**: Use 'verified', 'pending', or 'not_submitted'  
✅ **Restart Server**: Always restart after modifying sample users  

---

## Troubleshooting

### Users Not Showing?
1. Check server console for errors
2. Verify `initSampleUsers()` is called on startup
3. Restart the server
4. Check browser console for API errors

### Duplicate User Error?
- Ensure each user has a unique `id`
- Ensure each user has a unique `referralCode`

### API Returns Empty Array?
- Verify authentication token is valid
- Check if USERS_DB is populated
- Look for filter parameters that might exclude users

---

## Need More Help?

See these files for reference:
- `server/admin-server.js` - Server implementation
- `src/components/admin/UserManagement.jsx` - Frontend component
- `USER_MANAGEMENT_TEST_RESULTS.md` - API test results

---

**Last Updated:** April 21, 2026  
**Status:** ✅ Ready to Use
