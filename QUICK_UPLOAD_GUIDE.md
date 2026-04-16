# 📤 Quick Upload Guide - dWallet to IPFS

## ✅ Your Build is Ready!

The `dist/` folder has been rebuilt with the correct relative paths and is ready to upload.

**Location**: `/Users/macbookpri/Downloads/dwallet-v5/dist/`

---

## 🎯 Easiest Method: Pinata Web Interface (2 minutes)

### Step 1: Open Pinata Upload Page

Click here: **https://app.pinata.cloud/developers/pinning-files**

Or navigate manually:
1. Go to https://app.pinata.cloud
2. Log in with your account
3. Click **"Developers"** in the left sidebar
4. Click **"Pin File to IPFS"**

---

### Step 2: Choose "Folder" Upload

You'll see 3 options:
- Single File ❌
- **Folder ✅** ← Click this one!
- JSON ❌

---

### Step 3: Select Your dist Folder

A file picker will open. Navigate to:

```
/Users/macbookpri/Downloads/dwallet-v5/
```

Then:
1. Click on the **`dist`** folder (don't open it, just select it)
2. Click **"Open"** or **"Choose"**

---

### Step 4: Add Metadata (Optional)

You can add a name and tags:

**Name**: `dWallet-Frontend-2026-04-16`

**Keyvalues** (optional):
```
project: dWallet v5
type: frontend
version: 5.0.0
```

---

### Step 5: Upload

Click **"Upload"** button and wait ~1-2 minutes.

---

### Step 6: Copy Your IPFS Hash

After upload completes, you'll see:

```
✅ Upload Successful!

IPFS Hash: bafybeiXXXXXXXXXXXXXXX...
```

**Copy this hash** - this is your new IPFS CID!

---

## ✅ After You Get the Hash

**Reply to me with the hash** and I will:

1. ✅ Test it immediately
2. ✅ Verify all assets load correctly  
3. ✅ Confirm no 404 errors
4. ✅ Update all documentation
5. ✅ Provide ENS setup instructions
6. ✅ Generate community announcements

---

## 🔍 What to Expect

### Before (Old Hash - Broken):
```
❌ https://ipfs.io/ipfs/bafybeihvjxqxiykleaqf5pzziox2tljh5zrxt4tpnfwrowb2uusnz2kx6y
   → 404 errors on assets
   → Assets tried to load from wrong path
```

### After (New Hash - Fixed):
```
✅ https://ipfs.io/ipfs/YOUR_NEW_HASH/
   → All assets load correctly
   → Website works perfectly
   → No errors in console
```

---

## 📋 Quick Checklist

- [x] Fix vite.config.js (DONE)
- [x] Rebuild frontend (DONE)
- [ ] Upload dist/ folder to Pinata (**YOUR ACTION - 2 min**)
- [ ] Copy new IPFS hash (**YOUR ACTION**)
- [ ] Share hash with me (**YOUR ACTION**)
- [ ] I'll test and verify (I'll do this)
- [ ] Update ENS record (We'll do this together)

---

## 💡 Why Manual Upload?

The Pinata web interface is actually the **recommended method** because:

✅ Handles directory structures perfectly  
✅ Preserves file hierarchy  
✅ No API complications  
✅ Visual confirmation  
✅ Instant feedback  

The API methods we tried have limitations with directory uploads on macOS.

---

## 🚀 Ready?

**Just do this:**

1. Open: https://app.pinata.cloud/developers/pinning-files
2. Click: "Folder"
3. Select: `/Users/macbookpri/Downloads/dwallet-v5/dist/`
4. Upload and copy the hash
5. Paste the hash here

**That's it!** I'll handle the rest. 🎉

---

## 🆘 Troubleshooting

### Can't find the dist folder?
It should be at: `/Users/macbookpri/Downloads/dwallet-v5/dist/`

In the file picker:
1. Press `Cmd+Shift+G` (Mac)
2. Paste: `/Users/macbookpri/Downloads/dwallet-v5/`
3. Select the `dist` folder

### Upload fails?
- Check your internet connection
- Try refreshing the page
- Make sure you're selecting the folder, not files inside it

### Need help?
Just let me know what step you're stuck on!

---

**Ready when you are!** 🚀
