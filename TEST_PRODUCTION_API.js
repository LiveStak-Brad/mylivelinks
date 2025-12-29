// Test what the actual production API is returning
// Open your browser console and run this:

fetch('https://mylivelinks.com/api/profile/CannaStreams')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    if (data.error) {
      console.error('ERROR:', data.error);
    }
  })
  .catch(err => console.error('Fetch failed:', err));

