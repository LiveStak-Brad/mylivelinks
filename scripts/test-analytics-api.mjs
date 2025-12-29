#!/usr/bin/env node
/**
 * Test Analytics API endpoint
 */

async function testAnalyticsAPI() {
  console.log('🧪 Testing Analytics API...\n');
  
  const BRAD_USER_ID = '2b4a1178-3c39-4179-94ea-314dd824a818';
  const apiUrl = `http://localhost:3000/api/user-analytics?profileId=${BRAD_USER_ID}&range=all`;
  
  console.log('Calling:', apiUrl);
  console.log('');
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('Error Response:', text);
      return;
    }
    
    const data = await response.json();
    console.log('\n✅ Analytics API Response:\n');
    console.log(JSON.stringify(data, null, 2));
    
    // Compare with DB truth
    console.log('\n' + '='.repeat(80));
    console.log('📊 DATA COMPARISON (DB vs API)\n');
    console.log('From DB queries:');
    console.log('  - Gifts Sent (last 10): 10 records, 108 coins total');
    console.log('  - Gifts Received (last 10): 6 records, 2512 coins total');
    console.log('  - Followers: 39');
    console.log('  - Following: 51');
    console.log('  - Coin Balance: 600');
    console.log('  - Earnings Balance: 1112');
    console.log('');
    console.log('From API response:');
    console.log('  - Total Coins Spent:', data.gifting?.totalCoinsSpent || 0);
    console.log('  - Total Gifts Received:', data.overview?.totalGiftsReceived || 0);
    console.log('  - Followers:', data.overview?.followerCount || 0);
    console.log('  - Following:', data.overview?.followingCount || 0);
    console.log('  - Coins Balance:', data.wallet?.coinsBalance || 0);
    console.log('  - Diamonds Balance:', data.wallet?.diamondsBalance || 0);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
    console.log('\nMake sure the dev server is running: npm run dev');
  }
}

// Wait for server to start
setTimeout(() => {
  testAnalyticsAPI().catch(console.error);
}, 5000);

