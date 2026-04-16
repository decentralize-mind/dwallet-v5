# 🚰 Quick Guide: Getting Testnet Tokens

## Your Current Situation

**Wallet Address:** `0x5d5af2f531a46afe719dadc5830e899d4d066447`

**Current Balances:** 
- ❌ Ethereum Mainnet: 0 ETH
- ❌ Sepolia Testnet: 0 ETH  
- ❌ Base: 0 ETH
- ❌ Base Sepolia: 0 ETH

---

## ✅ Solution: Get FREE Testnet Tokens

### Option 1: From Dashboard (EASIEST) ⭐

1. Open your dWallet app
2. If on **Sepolia** or **Base Sepolia** network with low balance
3. Click the **"🚰 Get ETH Faucet"** button in the action row
4. Faucet opens automatically
5. Paste your wallet address
6. Wait for tokens to arrive (~30 seconds)

### Option 2: From Send Modal

1. Click **Send** button
2. If balance is zero, you'll see a red warning banner
3. Click any of the faucet links shown:
   - **For Sepolia**: Alchemy, Chainlink, or Infura
   - **For Base Sepolia**: Base or Coinbase
4. Follow faucet instructions
5. Return to wallet after receiving tokens

### Option 3: Direct Links

#### Sepolia Testnet ETH (Recommended for Testing)
- 🔗 **Alchemy Faucet**: https://sepoliafaucet.com/
- 🔗 **Chainlink Faucet**: https://faucets.chain.link/sepolia
- 🔗 **Infura Faucet**: https://www.infura.io/faucet/sepolia

**Limits:** Once per 24 hours per faucet  
**Amount:** ~0.5-1 ETH per claim  
**Time:** 15-60 seconds

#### Base Sepolia Testnet ETH
- 🔗 **Base Faucet**: https://faucets.chain.link/base-sepolia
- 🔗 **Coinbase Faucet**: https://faucet.base.org/

**Limits:** Once per 24 hours  
**Amount:** ~0.1 ETH  
**Time:** 30-60 seconds

---

## 🛠️ Browser Console Helper (ADVANCED)

Open browser console (F12) and paste:

```javascript
// Load faucet helper
await import('/scripts/faucet-helper.js')
```

Then use commands:
```javascript
openFaucet("sepolia", 0)     // Opens first Sepolia faucet
checkBalances()              // Check all balances
```

---

## 💡 Step-by-Step Process

### For First-Time Setup:

1. **Switch to Sepolia Network**
   - Click network selector (top center)
   - Choose "Ethereum Sepolia (testnet)"

2. **Get Testnet ETH**
   - Click "🚰 Get ETH Faucet" button
   - OR go to https://sepoliafaucet.com/
   - Paste: `0x5d5af2f531a46afe719dadc5830e899d4d066447`
   - Complete CAPTCHA if required
   - Click "Send"

3. **Wait for Confirmation**
   - Takes 15-60 seconds
   - Can check on Etherscan: https://sepolia.etherscan.io/
   - Search your wallet address

4. **Verify Balance**
   - Wallet should show updated balance
   - Should see ~0.5-1 ETH

5. **Try Sending**
   - Click Send
   - Enter recipient: `0xa97d7dB42A89a005dA23E5BDFc7BE7A65Bf00a19`
   - Click MAX button (auto-reserves gas)
   - Confirm transaction

---

## ⚠️ Common Issues & Solutions

### "Insufficient Funds" Error
**Cause:** Not enough ETH for transfer + gas  
**Solution:** 
- Use MAX button (automatically reserves gas)
- Or reduce send amount
- Or get more testnet tokens from faucet

### Transaction Fails After Submitting
**Cause:** Gas costs more than estimated  
**Solution:**
- Wait for gas prices to drop
- Send smaller amount
- Check gas tracker in app

### Faucet Says "Already Claimed"
**Cause:** 24-hour limit per faucet  
**Solution:**
- Try different faucet (Chainlink vs Alchemy)
- Or wait 24 hours
- Each faucet has independent timer

### Balance Not Updating
**Cause:** Network delay or wrong network  
**Solution:**
- Refresh page (F5)
- Check you're on correct network (Sepolia, not Mainnet)
- Wait up to 2 minutes for confirmation

---

## 📊 What You Need for Different Actions

| Action | Network | Token Needed | Amount Needed |
|--------|---------|--------------|---------------|
| Send 0.01 ETH | Sepolia | ETH | 0.0104+ ETH |
| Send 0.1 ETH | Sepolia | ETH | 0.1004+ ETH |
| Swap Tokens | Sepolia | ETH | Amount + gas |
| Deploy Contract | Sepolia | ETH | 0.05+ ETH |
| Send on Mainnet | Ethereum | Real ETH | Purchase required |

---

## 🎯 Pro Tips

1. **Always use MAX button** for native tokens - it auto-calculates gas
2. **Keep 0.001 ETH buffer** for unexpected gas increases
3. **Multiple faucets = more tokens** - claim from all every 24h
4. **Test small first** - send 0.001 ETH before larger amounts
5. **Watch console logs** - press F12 to see detailed debugging

---

## 🔍 Diagnostic Commands

Check your status anytime:

```bash
# Terminal command
node scripts/check-balance.cjs
```

Or in browser console (F12):
```javascript
// If faucet helper loaded:
checkBalances()

// Or just look at wallet UI - shows balance clearly
```

---

## 📞 Quick Reference

**Your Wallet:** `0x5d5af2f531a46afe719dadc5830e899d4d066447`

**Recipient (from your error):** `0xa97d7dB42A89a005dA23E5BDFc7BE7A65Bf00a19`

**Typical Gas Cost:** 0.0004-0.001 ETH (varies by network)

**Faucet Limits:** ~0.5-1 ETH per 24h per faucet

**Minimum to Send 0.01 ETH:** 0.0104 ETH (0.01 + gas)

---

## ✅ Success Checklist

Before sending:
- [ ] On correct network (Sepolia/Base Sepolia)
- [ ] Have sufficient balance (amount + gas)
- [ ] Recipient address is correct
- [ ] Using MAX button or left gas buffer
- [ ] Reviewed transaction details

After sending:
- [ ] Transaction hash appears
- [ ] Can view on block explorer
- [ ] Balance updated correctly
- [ ] Recipient received funds

---

## 🎉 You're All Set!

Your wallet now has:
✅ Smart validation that prevents failed transactions  
✅ MAX button that auto-reserves gas  
✅ Direct faucet access for easy testing  
✅ Clear error messages with solutions  
✅ Balance warnings when funds are low  

**Next step:** Click the "🚰 Get ETH Faucet" button and start testing! 🚀
