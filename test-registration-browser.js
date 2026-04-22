// Copy and paste this in your browser console after creating a wallet
// This will manually register the user

async function testRegistration() {
  // Get the wallet address from localStorage
  const storageKey = 'dwallet_encrypted'
  const encrypted = localStorage.getItem(storageKey)
  
  if (!encrypted) {
    console.error('❌ No wallet found in localStorage!')
    console.log('Make sure you created a wallet first.')
    return
  }
  
  console.log('✅ Found encrypted wallet in localStorage')
  console.log('Encrypted length:', encrypted.length)
  
  // You'll need to decrypt it to get the address, but let's just test the API directly
  // Replace this with your actual wallet address
  const testAddress = prompt('Enter your wallet address (starts with 0x):')
  
  if (!testAddress || !testAddress.startsWith('0x')) {
    console.error('❌ Invalid wallet address!')
    return
  }
  
  console.log('📝 Testing registration for:', testAddress)
  
  try {
    const response = await fetch('http://localhost:3001/api/admin/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress: testAddress
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Registration successful!', data)
      alert('User registered successfully! Check User Management.')
    } else {
      console.error('❌ Registration failed:', data.error)
      alert('Registration failed: ' + data.error)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    alert('Error: ' + error.message)
  }
}

// Run the test
testRegistration()
