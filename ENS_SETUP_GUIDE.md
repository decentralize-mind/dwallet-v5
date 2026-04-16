# ENS Record Setup - Step by Step Guide

**Goal**: Point `dwallet.eth` to your IPFS-hosted frontend

**IPFS Hash**: `bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly`

---

## 📋 Prerequisites

Before starting, make sure you have:

- [ ] MetaMask or compatible Web3 wallet installed
- [ ] ETH in your wallet for gas fees (~$5-20)
- [ ] Ownership of `dwallet.eth` domain
- [ ] Browser: Chrome, Firefox, or Brave recommended

---

## 🎯 Step-by-Step Instructions

### Step 1: Go to ENS Manager

**URL**: https://app.ens.domains

![ENS Manager Homepage](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FnwRsZJHxJkQKdXkQKjLl%2Fimage.png)

1. Open https://app.ens.domains in your browser
2. Click **"Connect"** button in the top right corner

---

### Step 2: Connect Your Wallet

![Connect Wallet](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Fimage.png)

1. Select your wallet type (MetaMask, WalletConnect, etc.)
2. Approve the connection request in your wallet
3. Wait for connection to be established

---

### Step 3: Find Your Domain

![Search Domain](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Fsearch.png)

1. In the search bar, type: `dwallet.eth`
2. Press Enter or click Search
3. Click on your domain name in the results

---

### Step 4: Access Domain Management

![Domain Management](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Fdomain.png)

1. You'll see your domain management page
2. Scroll down to the **"Records"** section
3. Click **"Edit Records"** or **"Add Record"** button

---

### Step 5: Add Content Hash Record

![Add Content Record](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Frecords.png)

1. Look for **"Content"** or **"Content Hash"** field
2. If not visible, click **"Add Record"**
3. Select **"Content"** from the dropdown menu

---

### Step 6: Enter IPFS Hash

![Enter IPFS Hash](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Fcontent.png)

1. In the Content field, select **"IPFS"** from the protocol dropdown
2. Enter this hash:
   ```
   bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly
   ```

   Or use the full URI:
   ```
   ipfs://bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly
   ```

**⚠️ IMPORTANT**: Double-check the hash is exactly as shown above!

---

### Step 7: Save and Confirm Transaction

![Save Transaction](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Fsave.png)

1. Click **"Save"** or **"Confirm"** button
2. MetaMask will pop up with a transaction
3. Review the gas fee (should be $5-20)
4. Click **"Confirm"** to approve the transaction

---

### Step 8: Wait for Confirmation

![Transaction Confirmation](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Fconfirm.png)

1. Wait for the transaction to be confirmed (~15 seconds on Ethereum mainnet)
2. You can view the transaction on Etherscan
3. Once confirmed, you'll see a success message

---

### Step 9: Verify the Update

![Verify Update](https://docs.ens.domains/~gitbook/image?url=https%3A%2F%2F3573478794-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fx-gc-mp.appspot.com%2Fo%2Fproducts%252FJqDkGQQmJHsLmJrJYnHv%2Fuploads%2FQKkxRsJHxJkQKdXkQKjLl%2Fverify.png)

1. Go back to your domain page
2. Scroll to the Records section
3. You should see:
   ```
   Content: ipfs://bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly
   ```

---

## ✅ Step 10: Test Your ENS Domain

After the transaction is confirmed, test these URLs:

### ENS via Limo Gateway
```
https://dwallet.eth.limo
```

### ENS via Link Gateway
```
https://dwallet.eth.link
```

### Native ENS Support
- **Brave Browser**: Type `dwallet.eth` in address bar
- **Opera Browser**: Type `dwallet.eth` in address bar
- **MetaMask Mobile Browser**: Type `dwallet.eth`

---

## 🔍 Verification Commands

### Verify ENS Content Hash via Command Line

```bash
# Using cast (Foundry)
cast resolve-contenthash dwallet.eth

# Expected output:
# ipfs://bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly
```

### Verify via Etherscan

1. Go to https://etherscan.io
2. Search for: `dwallet.eth`
3. Go to the ENS Registry contract
4. Check the Content Hash record

---

## ⚠️ Troubleshooting

### "You don't own this name" Error
- Make sure you're connected with the wallet that owns `dwallet.eth`
- Check ownership on Etherscan

### Transaction Fails
- **Out of gas**: Increase gas limit in MetaMask
- **Low ETH balance**: Add more ETH to your wallet
- **High gas prices**: Wait for lower gas times (weekends are usually cheaper)

### Content Hash Not Showing
- Wait 1-2 minutes for the page to refresh
- Clear browser cache and reload
- Check Etherscan to see if transaction was successful

### ENS Gateway Not Working
- Wait 5-10 minutes for DNS propagation
- Try different gateways (.limo, .link)
- Clear browser DNS cache

---

## 📝 Quick Reference

**Your IPFS Hash**:
```
bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly
```

**Full Content URI**:
```
ipfs://bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly
```

**ENS Manager**:
```
https://app.ens.domains
```

**Test URLs**:
```
https://dwallet.eth.limo
https://dwallet.eth.link
```

---

## 🎉 Success Checklist

After completing the ENS setup, verify:

- [ ] ENS transaction confirmed on Etherscan
- [ ] Content Hash shows on ENS domain page
- [ ] https://dwallet.eth.limo loads your frontend
- [ ] https://dwallet.eth.link loads your frontend
- [ ] Frontend loads correctly via ENS
- [ ] All features work (wallet, swap, etc.)

---

## 📞 Need Help?

- **ENS Documentation**: https://docs.ens.domains
- **ENS Discord**: https://chat.ens.domains
- **IPFS Documentation**: https://docs.ipfs.tech
- **dWallet Support**: [Your support channel]

---

*Guide created: 2026-04-16*  
*dWallet v5 - Decentralized Frontend on IPFS + ENS*
