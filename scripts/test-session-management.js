const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

async function testSessionManagement() {
  console.log('🧪 Testing Session Management with Redis...\n');

  try {
    // Test 1: Login
    console.log('1. Testing Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, ADMIN_CREDENTIALS);
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('Session ID:', loginResponse.data.sessionId);
      console.log('Expires at:', new Date(loginResponse.data.expiresAt).toLocaleString());
      
      const sessionId = loginResponse.data.sessionId;
      const headers = { Authorization: `Bearer ${sessionId}` };

      // Test 2: Check session
      console.log('\n2. Testing Session Check...');
      const checkResponse = await axios.get(`${BASE_URL}/api/admin/check`, { headers });
      
      if (checkResponse.data.success) {
        console.log('✅ Session check successful');
        console.log('Username:', checkResponse.data.session.username);
        console.log('Login time:', checkResponse.data.session.loginTime);
      }

      // Test 3: Test session management endpoints
      console.log('\n3. Testing Session Management Endpoints...');
      
      // Get sessions list
      const sessionsResponse = await axios.get(`${BASE_URL}/api/admin/sessions`, { headers });
      console.log('✅ Sessions endpoint:', sessionsResponse.data.message);

      // Test cleanup
      const cleanupResponse = await axios.post(`${BASE_URL}/api/admin/sessions/cleanup`, {}, { headers });
      console.log('✅ Cleanup endpoint:', cleanupResponse.data.message);

      // Test 4: Logout
      console.log('\n4. Testing Logout...');
      const logoutResponse = await axios.post(`${BASE_URL}/api/admin/logout`, {}, { headers });
      
      if (logoutResponse.data.success) {
        console.log('✅ Logout successful');
      }

      // Test 5: Try to access protected endpoint after logout
      console.log('\n5. Testing Access After Logout...');
      try {
        await axios.get(`${BASE_URL}/api/admin/check`, { headers });
        console.log('❌ Should not be able to access after logout');
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('✅ Correctly blocked after logout');
        } else {
          console.log('❌ Unexpected error:', error.response?.status);
        }
      }

    } else {
      console.log('❌ Login failed:', loginResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }

  console.log('\n🏁 Session Management Test Complete');
}

// Run the test
testSessionManagement(); 