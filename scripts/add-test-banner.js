const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const BANNER_URL = 'https://images.unsplash.com/photo-1753561881904-37dee26b7a2d?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

async function addTestBanner() {
  console.log('🎯 Adding test banner with your specified URL...\n');
  
  try {
    // Login
    console.log('Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }
    
    const sessionId = loginResponse.data.sessionId;
    console.log('✅ Login successful');
    
    // Add banner to banner1
    console.log('\nAdding banner to banner1...');
    const banner1Response = await axios.post(`${BASE_URL}/api/admin/banners/banner1`, {
      image_url: BANNER_URL,
      link_href: 'https://unsplash.com/photos/abstract-painting-1753561881904-37dee26b7a2d'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner1Response.data.success) {
      console.log('✅ Banner added to banner1');
      console.log(`   ID: ${banner1Response.data.banner.id}`);
      console.log(`   URL: ${BANNER_URL}`);
    }
    
    // Add banner to banner2
    console.log('\nAdding banner to banner2...');
    const banner2Response = await axios.post(`${BASE_URL}/api/admin/banners/banner2`, {
      image_url: BANNER_URL,
      link_href: 'https://unsplash.com/photos/abstract-painting-1753561881904-37dee26b7a2d'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner2Response.data.success) {
      console.log('✅ Banner added to banner2');
      console.log(`   ID: ${banner2Response.data.banner.id}`);
      console.log(`   URL: ${BANNER_URL}`);
    }
    
    console.log('\n🎉 Test banners added successfully!');
    console.log('📝 You can now view them at http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

// Run if called directly
if (require.main === module) {
  addTestBanner();
}

module.exports = addTestBanner;
