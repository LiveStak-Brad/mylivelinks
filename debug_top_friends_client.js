/**
 * Client-side debug helper for Top Friends customization
 * 
 * Open your browser console (F12) on your profile page and paste this:
 */

// Check what the API is returning
fetch('/api/profile/YOUR_USERNAME/bundle')
  .then(res => res.json())
  .then(data => {
    console.log('=== API RESPONSE DEBUG ===');
    console.log('Full response:', data);
    console.log('\n=== PROFILE DATA ===');
    console.log('show_top_friends:', data?.profile?.show_top_friends);
    console.log('top_friends_title:', data?.profile?.top_friends_title);
    console.log('top_friends_avatar_style:', data?.profile?.top_friends_avatar_style);
    console.log('top_friends_max_count:', data?.profile?.top_friends_max_count);
    
    if (data?.profile?.show_top_friends === undefined) {
      console.error('❌ show_top_friends is undefined - RPC function not returning it!');
    }
    if (data?.profile?.top_friends_title === undefined) {
      console.error('❌ top_friends_title is undefined - RPC function not returning it!');
    }
    if (data?.profile?.top_friends_avatar_style === undefined) {
      console.error('❌ top_friends_avatar_style is undefined - RPC function not returning it!');
    }
    if (data?.profile?.top_friends_max_count === undefined) {
      console.error('❌ top_friends_max_count is undefined - RPC function not returning it!');
    }
    
    if (data?.profile?.show_top_friends !== undefined) {
      console.log('✅ Fields are being returned by API!');
      console.log('Check if component is receiving them...');
    }
  })
  .catch(err => console.error('API Error:', err));

