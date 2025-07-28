const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let sessionId = null;

// Test banner URL from Unsplash
const TEST_BANNER_URL = 'https://images.unsplash.com/photo-1753561881904-37dee26b7a2d?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

async function testBannerManagement() {
  console.log('🧪 Testing Banner Management...\n');
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }
    
    sessionId = loginResponse.data.sessionId;
    console.log('✅ Login successful');
    
    // Step 2: Clear existing banners (get current banners and delete them)
    console.log('\n2. Clearing existing banners...');
    const getBannersResponse = await axios.get(`${BASE_URL}/api/admin/banners`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (getBannersResponse.data.success) {
      const { banner1, banner2 } = getBannersResponse.data.banners;
      
      // Delete all banner1 items
      for (const banner of banner1) {
        try {
          const deleteResponse = await axios.delete(`${BASE_URL}/api/admin/banners/banner1/${banner.id}`, {
            headers: { 'Authorization': `Bearer ${sessionId}` }
          });
          if (deleteResponse.data.success) {
            console.log(`✅ Deleted banner1: ${banner.id}`);
          }
        } catch (error) {
          console.log(`❌ Failed to delete banner1: ${banner.id}`);
        }
      }
      
      // Delete all banner2 items
      for (const banner of banner2) {
        try {
          const deleteResponse = await axios.delete(`${BASE_URL}/api/admin/banners/banner2/${banner.id}`, {
            headers: { 'Authorization': `Bearer ${sessionId}` }
          });
          if (deleteResponse.data.success) {
            console.log(`✅ Deleted banner2: ${banner.id}`);
          }
        } catch (error) {
          console.log(`❌ Failed to delete banner2: ${banner.id}`);
        }
      }
    }
    
    // Step 3: Add test banners
    console.log('\n3. Adding test banners...');
    
    // Add Banner 1 - Test banner với Unsplash image
    const banner1Response = await axios.post(`${BASE_URL}/api/admin/banners/banner1`, {
      image_url: TEST_BANNER_URL,
      link_href: 'https://unsplash.com/'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner1Response.data.success) {
      console.log('✅ Added test banner1 with Unsplash image');
    }
    
    // Add Banner 1 - Second banner
    const banner1_2Response = await axios.post(`${BASE_URL}/api/admin/banners/banner1`, {
      image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link_href: 'https://riot.com/'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner1_2Response.data.success) {
      console.log('✅ Added second test banner1');
    }
    
    // Add Banner 2 - Test banner
    const banner2Response = await axios.post(`${BASE_URL}/api/admin/banners/banner2`, {
      image_url: 'https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link_href: 'https://lolesports.com/'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner2Response.data.success) {
      console.log('✅ Added test banner2');
    }
    
    // Add Banner 2 - Second banner
    const banner2_2Response = await axios.post(`${BASE_URL}/api/admin/banners/banner2`, {
      image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link_href: 'https://leagueoflegends.com/'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner2_2Response.data.success) {
      console.log('✅ Added second test banner2');
    }
    
    // Step 4: Verify banners
    console.log('\n4. Verifying added banners...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/admin/banners`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (verifyResponse.data.success) {
      const { banner1, banner2 } = verifyResponse.data.banners;
      console.log(`✅ Banner1 count: ${banner1.length}`);
      console.log(`✅ Banner2 count: ${banner2.length}`);
      
      // Show banner details
      banner1.forEach((banner, index) => {
        console.log(`   Banner1[${index}]: ID=${banner.id}, Link=${banner.link_href}`);
      });
      
      banner2.forEach((banner, index) => {
        console.log(`   Banner2[${index}]: ID=${banner.id}, Link=${banner.link_href}`);
      });
    }
    
    // Step 5: Test edit functionality
    console.log('\n5. Testing edit functionality...');
    const editResponse = await axios.get(`${BASE_URL}/api/admin/banners`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (editResponse.data.success && editResponse.data.banners.banner1.length > 0) {
      const firstBanner = editResponse.data.banners.banner1[0];
      const editResult = await axios.put(`${BASE_URL}/api/admin/banners/banner1/${firstBanner.id}`, {
        image_url: TEST_BANNER_URL,
        link_href: 'https://updated-link.com/'
      }, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      
      if (editResult.data.success) {
        console.log('✅ Successfully edited banner');
        console.log(`   Updated link: ${editResult.data.banner.link_href}`);
      }
    }
    
    // Step 6: Test public API
    console.log('\n6. Testing public API...');
    const publicResponse = await axios.get(`${BASE_URL}/api/banners`);
    
    if (publicResponse.data.success) {
      console.log('✅ Public API working');
      console.log(`   Public Banner1 count: ${publicResponse.data.banners.banner1.length}`);
      console.log(`   Public Banner2 count: ${publicResponse.data.banners.banner2.length}`);
    }
    
    console.log('\n🎉 Banner management test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Open http://localhost:3000 to see banners on main page');
    console.log('   2. Open http://localhost:3000/admin to manage banners');
    console.log('   3. Test edit/delete functionality in admin panel');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run test if called directly
if (require.main === module) {
  testBannerManagement();
}

module.exports = testBannerManagement;
