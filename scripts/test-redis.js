const cache = require('../lib/redis.js');

async function testRedis() {
  console.log('🧪 Testing Redis Connection và Permissions...\n');
  
  try {
    // Test connection info
    const cacheInfo = cache.getCacheInfo();
    console.log('📊 Cache Info:', cacheInfo);
    
    if (!cacheInfo.isRedis) {
      console.log('\n⚠️  Redis không được cấu hình - sử dụng cache local');
      console.log('   1. Tạo account tại https://console.upstash.com/');
      console.log('   2. Tạo Redis database');
      console.log('   3. Thêm UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN vào .env');
      return;
    }
    
    // Test permissions
    console.log('\n🔍 Testing Redis permissions...');
    const permTest = await cache.testPermissions();
    console.log('📋 Permissions results:', permTest.permissions);
    
    // Test basic operations with permissions-aware approach
    console.log('\n🔄 Testing cache operations...');
    const testKey = 'test:connection';
    const testData = { 
      message: 'Hello Redis!', 
      timestamp: new Date().toISOString(),
      random: Math.random()
    };
    
    // Test SET operation
    console.log('📝 Testing SET operation...');
    await cache.set(testKey, testData, 60); // 1 minute TTL
    console.log('✅ Data set successfully');
    
    // Test GET operation
    console.log('📥 Testing GET operation...');
    const retrievedData = await cache.get(testKey);
    console.log('📥 Retrieved data:', retrievedData);
    
    if (JSON.stringify(testData) === JSON.stringify(retrievedData)) {
      console.log('✅ Data matches - Basic Redis working correctly!');
    } else {
      console.log('❌ Data mismatch - potential serialization issue');
    }
    
    // Test delete/invalidate operation
    console.log('\n🗑️  Testing delete/invalidate operation...');
    if (permTest.permissions.del) {
      await cache.del(testKey);
      console.log('✅ Using DEL command');
    } else {
      await cache.invalidate(testKey);
      console.log('✅ Using invalidation (SET to null)');
    }
    
    const deletedData = await cache.get(testKey);
    
    if (deletedData === null || deletedData === 'null') {
      console.log('✅ Delete/invalidate operation successful');
    } else {
      console.log('❌ Delete/invalidate operation failed');
    }
    
    // Test with actual app data structure
    console.log('\n📋 Testing with app data structure...');
    const sampleEvents = [
      {
        id: '123',
        league: { name: 'LPL', slug: 'lpl', image: 'test.jpg' },
        startTime: new Date().toISOString(),
        state: 'unstarted',
        matchTeams: [
          { name: 'Team A', code: 'TMA', gameWins: 0 },
          { name: 'Team B', code: 'TMB', gameWins: 0 }
        ]
      },
      {
        id: '456', 
        league: { name: 'LCK', slug: 'lck', image: 'test2.jpg' },
        startTime: new Date().toISOString(),
        state: 'completed',
        matchTeams: [
          { name: 'Team C', code: 'TMC', gameWins: 2 },
          { name: 'Team D', code: 'TMD', gameWins: 1 }
        ]
      }
    ];
    
    await cache.set('events:test', sampleEvents, 300);
    const retrievedEvents = await cache.get('events:test');
    
    if (retrievedEvents && retrievedEvents.length === 2) {
      console.log('✅ App data structure test passed');
      console.log(`   Events count: ${retrievedEvents.length}`);
      console.log(`   First event: ${retrievedEvents[0].league.name} - ${retrievedEvents[0].matchTeams[0].name} vs ${retrievedEvents[0].matchTeams[1].name}`);
    } else {
      console.log('❌ App data structure test failed');
    }
    
    // Cleanup
    await cache.invalidate('events:test');
    
    // Permission analysis và recommendations
    console.log('\n📊 Permission Analysis:');
    const perms = permTest.permissions;
    
    if (perms.get && perms.set) {
      console.log('✅ Basic caching: WORKING');
    } else {
      console.log('❌ Basic caching: FAILED - Check Redis credentials');
    }
    
    if (perms.setex) {
      console.log('✅ TTL support: WORKING (using SETEX)');
    } else if (perms.set) {
      console.log('⚠️  TTL support: LIMITED (using SET only)');
    } else {
      console.log('❌ TTL support: FAILED');
    }
    
    if (perms.del) {
      console.log('✅ Cache invalidation: OPTIMAL (using DEL)');
    } else if (perms.set) {
      console.log('⚠️  Cache invalidation: WORKAROUND (using SET to null)');
    } else {
      console.log('❌ Cache invalidation: FAILED');
    }
    
    console.log('\n🎉 Redis test completed!');
    
    // Final recommendations
    console.log('\n💡 Recommendations:');
    if (perms.get && perms.set) {
      console.log('✅ Your Redis setup is functional for this app');
      if (!perms.setex) {
        console.log('⚠️  Consider upgrading Redis plan for TTL support');
      }
      if (!perms.del) {
        console.log('⚠️  DEL command restricted, using fallback methods');
      }
      console.log('🚀 Ready for production deployment!');
    } else {
      console.log('❌ Redis setup needs attention:');
      console.log('   1. Verify UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN');
      console.log('   2. Check Redis instance status on Upstash dashboard');
      console.log('   3. Ensure Redis plan allows basic operations');
      console.log('   4. App will fallback to local memory cache');
    }
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check environment variables in .env file');
    console.log('   2. Verify Redis instance is active on Upstash');
    console.log('   3. Check network connectivity');
    console.log('   4. Verify Redis credentials are correct');
    console.log('   5. App will automatically fallback to local cache');
    
    if (error.message.includes('NOPERM') || error.message.includes('no permissions')) {
      console.log('\n⚠️  PERMISSIONS ISSUE DETECTED:');
      console.log('   - Your Redis instance has limited permissions');
      console.log('   - App will use workaround methods');
      console.log('   - Consider upgrading your Redis plan for full features');
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testRedis();
}

module.exports = testRedis;