# 📤 Manual Pinata Upload Guide

**Issue**: The automated scripts encountered Pinata API limitations with directory uploads.

**Solution**: Upload directly via Pinata's web interface (easiest and most reliable).

---

## 🎯 Step-by-Step Manual Upload

### Step 1: Go to Pinata Upload Page

Open your browser and navigate to:
```
https://app.pinata.cloud/developers/pinning-files
```

Or from the dashboard:
1. Go to https://app.pinata.cloud
2. Click **"Developers"** in the left sidebar
3. Click **"Pin File to IPFS"**

---

### Step 2: Select Upload Method

You'll see three options:
- **Single File** ❌ (Don't use this)
- **Folder** ✅ **(USE THIS)**
- **JSON** ❌ (Don't use this)

Click on **"Folder"** option.

---

### Step 3: Upload Your dist Folder

1. Click **"Browse"** or drag & drop
2. Navigate to: `/Users/macbookpri/Downloads/dwallet-v5/dist/`
3. **Select the entire `dist` folder** (not the files inside)
4. Wait for upload to complete

**Important**: Upload the **folder**, not individual files!

---

### Step 4: Add Metadata (Optional)

You can add metadata for organization:

**Name**: `dWallet-Frontend-2026-04-16`

**Keyvalues** (optional):
```json
{
  "project": "dWallet v5",
  "type": "frontend",
  "version": "5.0.0",
  "date": "2026-04-16"
}
```

---

### Step 5: Wait for Upload

The upload will process all 14 files:
- `index.html` (main entry point)
- `assets/` folder (JS, CSS files)
- `favicon.svg`
- `robots.txt`
- `sw.js`
- Other files

Upload time: ~1-2 minutes (depends on internet speed)

---

### Step 6: Get Your IPFS Hash

Once upload completes, you'll see:
- **IPFS Hash (CID)**: Click to copy
- **Gateway Links**: Direct access URLs

**Copy the IPFS Hash** - you'll need it for ENS setup!

---

## ✅ Verify Your Upload

After uploading, test the gateway links:

### Pinata Gateway
```
https://YOUR_HASH.ipfs.pinata.cloud
```

### IPFS.io Gateway
```
https://ipfs.io/ipfs/YOUR_HASH
```

### Cloudflare Gateway
```
https://cloudflare-ipfs.com/ipfs/YOUR_HASH
```

**Replace `YOUR_HASH` with your actual IPFS hash**

---

## 🔧 Current Status

### Previous Deployment (ZIP file - Not Working)
- **Hash**: `bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly`
- **Issue**: Uploaded as ZIP, serves binary data instead of website
- **Status**: ❌ Don't use this hash

### New Deployment (Folder Upload - Required)
- **Method**: Manual folder upload via Pinata web interface
- **Status**: ⏳ Waiting for you to upload

---

## 📋 Checklist

- [ ] Open https://app.pinata.cloud/developers/pinning-files
- [ ] Select "Folder" upload option
- [ ] Upload the `dist` folder from `/Users/macbookpri/Downloads/dwallet-v5/dist/`
- [ ] Wait for upload to complete
- [ ] Copy the new IPFS hash
- [ ] Test the gateway link: `https://YOUR_HASH.ipfs.pinata.cloud`
- [ ] Verify the website loads correctly
- [ ] Update ENS record with new hash
- [ ] Share with community

---

## 🎓 Why Manual Upload?

Pinata's API has limitations:
1. ❌ Can't upload multiple files via simple API
2. ❌ ZIP files serve as downloads, not websites
3. ✅ Folder upload via web interface works perfectly
4. ✅ Properly preserves directory structure for web hosting

**The web interface is actually the recommended method** for deploying websites to IPFS via Pinata!

---

## 🆘 Troubleshooting

### Upload Fails
- Check your internet connection
- Ensure you're uploading the `dist` folder, not files inside it
- Try refreshing the page and trying again

### Website Doesn't Load
- Wait 2-5 minutes for propagation
- Make sure `index.html` is in the root of the folder
- Check browser console for errors (F12)

### Wrong Hash
- The old hash (`bafybeidhx...`) was a ZIP file
- You need a NEW hash from folder upload
- Each upload creates a unique hash

---

## 📞 Need Help?

- **Pinata Documentation**: https://docs.pinata.cloud
- **Pinata Discord**: https://discord.gg/pinata
- **IPFS Docs**: https://docs.ipfs.tech

---

**Ready to upload?** Go to: https://app.pinata.cloud/developers/pinning-files

*This is the fastest and most reliable method!* 🚀
