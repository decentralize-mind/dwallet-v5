# 🚀 Production Deployment Checklist

## Pre-Deployment Verification

### ✅ Environment Configuration

- [ ] **API Keys Configured**
  - [ ] `VITE_ETHERSCAN_KEY` - Set ✓ (Already configured)
  - [ ] `VITE_POLYGONSCAN_KEY` - Set ✓ (Already configured)
  - [ ] `VITE_BSCSCAN_KEY` - Set ✓ (Already configured)
  - [ ] `VITE_INFURA_KEY` - Set ✓ (Already configured)
  - [ ] `REDIS_URL` - Set for production rate limiting
  - [ ] `VITE_CHAINALYSIS_KEY` - Optional (enhanced threat intel)
  - [ ] `VITE_TRM_LABS_KEY` - Optional (enhanced threat intel)

- [ ] **Environment Variables Verified**
  ```bash
  # Check all required vars are set
  node -e "console.log('ETHERSCAN:', !!process.env.VITE_ETHERSCAN_KEY)"
  node -e "console.log('INFURA:', !!process.env.VITE_INFURA_KEY)"
  node -e "console.log('REDIS:', !!process.env.REDIS_URL)"
  ```

### ✅ Dependencies Installation

- [ ] **All dependencies installed**
  ```bash
  npm install
  npm install ioredis  # For production rate limiting
  ```

- [ ] **No critical vulnerabilities**
  ```bash
  npm audit
  # Fix if needed: npm audit fix
  ```

### ✅ Security Features Testing

- [ ] **Run security test suite**
  ```bash
  node scripts/test-security-features.js
  ```

- [ ] **Verify threat intelligence**
  - Test known scam addresses (should be blocked)
  - Test mixer addresses (should warn)
  - Test legitimate addresses (should pass)

- [ ] **Verify multi-sig workflow**
  - Transactions >$50k require 2-of-3 signatures
  - Transactions >$100k require 3-of-5 signatures + 24h timelock
  - Transactions <$50k proceed normally

- [ ] **Verify transaction simulation**
  - Invalid transactions detected before sending
  - Gas estimates accurate
  - Failures prevented on-chain

- [ ] **Verify rate limiting**
  - Server-side rate limiting active (with Redis)
  - Client-side rate limiting active (always)
  - Proper HTTP headers returned

### ✅ Backward Compatibility

- [ ] **Existing functionality preserved**
  - Wallet creation/import works
  - Normal transactions (<$50k) work without multi-sig
  - Balance fetching works
  - Transaction history loads
  - DeFi operations work (swap, stake, lend)

- [ ] **Graceful degradation tested**
  - Works without Redis (falls back to in-memory)
  - Works without Chainalysis/TRM Labs APIs
  - Works if threat intelligence check fails
  - Works if simulation fails (logs warning)

### ✅ CSP & Security Headers

- [ ] **Content Security Policy verified**
  - `'unsafe-eval'` removed from script-src
  - No console errors related to CSP
  - All scripts load correctly

- [ ] **Security headers present**
  ```bash
  curl -I https://your-domain.com
  ```
  Should include:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Content-Security-Policy: ...` (without 'unsafe-eval')

### ✅ Performance Testing

- [ ] **Load time acceptable**
  - Initial load < 3 seconds
  - Transaction validation < 500ms
  - Threat check < 200ms (cached)
  - Simulation < 500ms (cached)

- [ ] **Memory usage stable**
  - No memory leaks in long sessions
  - Private keys properly cleared from memory
  - Cache doesn't grow unbounded

### ✅ Error Handling

- [ ] **User-friendly error messages**
  - No technical jargon shown to users
  - Clear action items provided
  - No sensitive data in errors

- [ ] **Error logging working**
  - Errors logged to console (dev)
  - Errors sent to monitoring (prod, if configured)
  - Error reporter configured (optional)

---

## Deployment Steps

### Step 1: Final Code Review

```bash
# Check for any uncommitted changes
git status

# Review all security-related changes
git diff HEAD~10 -- src/utils/
git diff HEAD~10 -- vercel.json
```

### Step 2: Run Full Test Suite

```bash
# Security features test
node scripts/test-security-features.js

# Existing tests (if any)
npm test

# Build test
npm run build
```

### Step 3: Deploy to Staging/Pre-production

```bash
# Deploy to pre-production environment
vercel --preproduction

# Or use your deployment script
./deploy-preproduction.sh
```

### Step 4: Verify Staging Deployment

- [ ] Access staging URL
- [ ] Test wallet creation/import
- [ ] Test small transaction (<$50k)
- [ ] Verify transaction simulation runs
- [ ] Verify threat intelligence checks
- [ ] Check browser console for errors
- [ ] Verify CSP headers in Network tab

### Step 5: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or use your deployment script
./deploy-production.sh
```

### Step 6: Post-Deployment Verification

- [ ] **Health checks**
  ```bash
  # Main site loads
  curl https://your-domain.com
  
  # Security headers present
  curl -I https://your-domain.com
  ```

- [ ] **Functional tests**
  - [ ] Create/import wallet
  - [ ] Check balances
  - [ ] Send small test transaction
  - [ ] Verify transaction appears in history
  - [ ] Test DeFi features (swap, stake)

- [ ] **Security features active**
  - [ ] Try sending to known scam address (should block)
  - [ ] Check network tab for rate limit headers
  - [ ] Verify CSP headers without 'unsafe-eval'

---

## Rollback Plan

If issues are detected:

### Immediate Rollback

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy previous commit
git checkout <previous-commit>
vercel --prod
```

### Disable Specific Features (If Needed)

If a specific security feature causes issues:

1. **Threat Intelligence** (graceful degradation already built-in)
   - Will continue to work even if API fails
   - No action needed

2. **Transaction Simulation** (graceful degradation built-in)
   - Falls back to allowing transaction if simulation fails
   - Logs warning but doesn't block

3. **Multi-Sig** (threshold-based)
   - Can adjust thresholds in `src/utils/multisigSupport.js`
   - Change `MULTISIG_CONFIG.thresholds` to higher values

4. **Rate Limiting** (fails open)
   - Server-side: Fails open if Redis unavailable
   - Client-side: Uses localStorage (always works)

---

## Monitoring & Alerting

### Set Up Monitoring

- [ ] **Error tracking**
  ```javascript
  // Configure error reporter in src/utils/errorHandling.js
  errorReporter.configure({
    enabled: true,
    endpoint: 'https://your-error-tracking.com/api/report',
    apiKey: process.env.ERROR_TRACKING_KEY
  })
  ```

- [ ] **Performance monitoring**
  - Set up Vercel Analytics
  - Monitor Core Web Vitals
  - Track transaction success rate

- [ ] **Security event logging**
  - Monitor blocked transactions (threat intelligence)
  - Monitor multi-sig proposals
  - Monitor rate limit violations

### Key Metrics to Track

1. **Transaction Success Rate**
   - Should be > 95%
   - Simulation should catch most failures

2. **Threat Intelligence Blocks**
   - Track number of blocked transactions
   - Review false positives

3. **Multi-Sig Usage**
   - Track proposals created
   - Track approval completion rate

4. **Rate Limit Triggers**
   - Monitor how often limits are hit
   - Adjust if too restrictive

---

## Post-Deployment Tasks

### Week 1

- [ ] Monitor error logs daily
- [ ] Review blocked transactions for false positives
- [ ] Check rate limiting effectiveness
- [ ] Gather user feedback

### Week 2-4

- [ ] Analyze security event data
- [ ] Update threat databases if needed
- [ ] Optimize rate limits based on usage patterns
- [ ] Document any issues found

### Ongoing

- [ ] Update threat intelligence databases monthly
- [ ] Review and rotate API keys quarterly
- [ ] Monitor for new security vulnerabilities
- [ ] Keep dependencies updated

---

## Support Contacts

- **Technical Issues**: Check `SECURITY_ENHANCEMENTS_GUIDE.md`
- **API Keys**: 
  - Etherscan: https://etherscan.io/myapikey
  - Chainalysis: https://www.chainalysis.com/
  - TRM Labs: https://www.trmlabs.com/
- **Redis Setup**: https://redis.io/docs/getting-started/

---

## Deployment Sign-Off

- [ ] All pre-deployment checks passed
- [ ] Staging deployment verified
- [ ] Production deployment successful
- [ ] Post-deployment verification complete
- [ ] Monitoring configured
- [ ] Team notified of new features

**Deployed by**: ________________  
**Date**: ________________  
**Version**: ________________  

---

**Last Updated**: April 16, 2026  
**Status**: Ready for Production Deployment ✅
