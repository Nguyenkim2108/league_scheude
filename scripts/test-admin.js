const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let sessionId = null;

async function testAdminAPI() {
  console.log('🧪 Testing Admin API...\n');
  
  try {
    // Test 1: Admin Login
    console.log('1. Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      sessionId = loginResponse.data.sessionId;
      console.log('✅ Login successful:', loginResponse.data.message);
      console.log('📝 Session ID:', sessionId.substring(0, 10) + '...');
    } else {
      console.log('❌ Login failed');
      return;
    }
    
    // Test 2: Check Session
    console.log('\n2. Testing Session Check...');
    const checkResponse = await axios.get(`${BASE_URL}/api/admin/check`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (checkResponse.data.success) {
      console.log('✅ Session valid:', checkResponse.data.session.username);
    }
    
    // Test 3: Add Banner 1
    console.log('\n3. Testing Add Banner 1...');
    const banner1Response = await axios.post(`${BASE_URL}/api/admin/banners/banner1`, {
      image_url: 'https://example.com/banner1.jpg',
      link_href: 'https://example.com/link1'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner1Response.data.success) {
      console.log('✅ Banner 1 added:', banner1Response.data.message);
    }
    
    // Test 4: Add Banner 2
    console.log('\n4. Testing Add Banner 2...');
    const banner2Response = await axios.post(`${BASE_URL}/api/admin/banners/banner2`, {
      image_url: 'https://example.com/banner2.jpg',
      link_href: 'https://example.com/link2'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (banner2Response.data.success) {
      console.log('✅ Banner 2 added:', banner2Response.data.message);
    }
    
    // Test 5: Get Banners
    console.log('\n5. Testing Get Banners...');
    const bannersResponse = await axios.get(`${BASE_URL}/api/admin/banners`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (bannersResponse.data.success) {
      console.log('✅ Banners retrieved:');
      console.log('   Banner 1 count:', bannersResponse.data.banners.banner1.length);
      console.log('   Banner 2 count:', bannersResponse.data.banners.banner2.length);
    }
    
    // Test 6: Add Video
    console.log('\n6. Testing Add Video...');
    const videoResponse = await axios.post(`${BASE_URL}/api/admin/video`, {
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    }, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (videoResponse.data.success) {
      console.log('✅ Video added:', videoResponse.data.message);
      console.log('   Video ID:', videoResponse.data.video.video_id);
      console.log('   Embed URL:', videoResponse.data.video.embed_url);
    }
    
    // Test 7: Get Video
    console.log('\n7. Testing Get Video...');
    const getVideoResponse = await axios.get(`${BASE_URL}/api/admin/video`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (getVideoResponse.data.success) {
      console.log('✅ Video retrieved:', getVideoResponse.data.video?.youtube_url || 'No video');
    }
    
    // Test 8: Public API - Get Banners (no auth)
    console.log('\n8. Testing Public Banners API...');
    const publicBannersResponse = await axios.get(`${BASE_URL}/api/banners`);
    
    if (publicBannersResponse.data.success) {
      console.log('✅ Public banners retrieved:');
      console.log('   Banner 1 count:', publicBannersResponse.data.banners.banner1.length);
      console.log('   Banner 2 count:', publicBannersResponse.data.banners.banner2.length);
    }
    
    // Test 9: Public API - Get Video (no auth)
    console.log('\n9. Testing Public Video API...');
    const publicVideoResponse = await axios.get(`${BASE_URL}/api/video`);
    
    if (publicVideoResponse.data.success) {
      console.log('✅ Public video retrieved:', publicVideoResponse.data.video?.youtube_url || 'No video');
    }
    
    // Test 10: Logout
    console.log('\n10. Testing Logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/api/admin/logout`, {}, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (logoutResponse.data.success) {
      console.log('✅ Logout successful:', logoutResponse.data.message);
    }
    
    // Test 11: Try accessing after logout (should fail)
    console.log('\n11. Testing Access After Logout...');
    try {
      await axios.get(`${BASE_URL}/api/admin/check`, {
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
      console.log('❌ Session should be invalid after logout');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected access after logout');
      }
    }
    
    console.log('\n🎉 All admin API tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  testAdminAPI();
}

module.exports = testAdminAPI;
