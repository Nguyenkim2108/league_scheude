const { Redis } = require('@upstash/redis');

// Initialize Redis client
let redis = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    console.log('✅ Redis connected successfully');
  } else {
    console.log('⚠️  Redis không được cấu hình - sử dụng cache local');
  }
} catch (error) {
  console.error('❌ Lỗi kết nối Redis:', error.message);
}

/**
 * Redis cache utility functions with permissions-safe operations
 */
class RedisCache {
  constructor() {
    this.localCache = new Map(); // Fallback local cache
    this.CACHE_DURATION = 5 * 60; // 5 minutes in seconds for Redis TTL
  }

  /**
   * Get data from cache
   * @param {string} key 
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      if (redis) {
        const data = await redis.get(key);
        return data;
      } else {
        // Fallback to local cache
        const cached = this.localCache.get(key);
        if (cached) {
          // Check if it's permanent or within TTL
          if (cached.permanent || Date.now() - cached.timestamp < this.CACHE_DURATION * 1000) {
            return cached.data;
          }
        }
        return null;
      }
    } catch (error) {
      console.error(`Lỗi khi get cache ${key}:`, error.message);
      // Fallback to local cache
      const cached = this.localCache.get(key);
      if (cached) {
        if (cached.permanent || Date.now() - cached.timestamp < this.CACHE_DURATION * 1000) {
          return cached.data;
        }
      }
      return null;
    }
  }

  /**
   * Set data to cache with fallback methods
   * @param {string} key 
   * @param {any} data 
   * @param {number|null} ttl - TTL in seconds (optional, null for no expiration)
   * @returns {Promise<void>}
   */
  async set(key, data, ttl = this.CACHE_DURATION) {
    try {
      if (redis) {
        try {
          if (ttl === null || ttl === undefined || ttl === 0) {
            // No TTL - permanent storage
            await redis.set(key, JSON.stringify(data));
          } else {
            // Try SETEX first (preferred method with TTL)
            await redis.setex(key, ttl, JSON.stringify(data));
          }
        } catch (error) {
          if (error.message.includes('NOPERM') || error.message.includes('no permissions')) {
            // Fallback to SET without TTL if SETEX not allowed
            console.log(`⚠️ SETEX not allowed for ${key}, trying SET`);
            await redis.set(key, JSON.stringify(data));
          } else {
            throw error;
          }
        }
      } else {
        // Fallback to local cache
        this.localCache.set(key, {
          data,
          timestamp: Date.now(),
          permanent: ttl === null || ttl === undefined || ttl === 0
        });
      }
    } catch (error) {
      console.error(`Lỗi khi set cache ${key}:`, error.message);
      // Always fallback to local cache on any error
      this.localCache.set(key, {
        data,
        timestamp: Date.now(),
        permanent: ttl === null || ttl === undefined || ttl === 0
      });
    }
  }

  /**
   * Delete cache key with fallback methods
   * @param {string} key 
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      if (redis) {
        try {
          await redis.del(key);
        } catch (error) {
          if (error.message.includes('NOPERM') || error.message.includes('no permissions')) {
            // If DEL not allowed, set key to null with short TTL as alternative
            console.log(`⚠️ DEL not allowed for ${key}, setting to null`);
            try {
              await redis.set(key, 'null');
            } catch (setError) {
              // If SET also fails, just log and continue
              console.log(`⚠️ Cannot delete ${key}, falling back to local cache only`);
            }
          } else {
            throw error;
          }
        }
      } else {
        this.localCache.delete(key);
      }
    } catch (error) {
      console.error(`Lỗi khi delete cache ${key}:`, error.message);
      this.localCache.delete(key);
    }
  }

  /**
   * Clear all cache with permissions-safe approach
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      if (redis) {
        // Instead of FLUSHALL (which might not be allowed),
        // clear specific keys we know about
        const keys = ['events:all', 'leagues:all', 'stats:all'];
        
        for (const key of keys) {
          try {
            await this.del(key);
          } catch (error) {
            // Continue with other keys even if one fails
            console.log(`⚠️ Couldn't clear ${key}:`, error.message);
          }
        }
      } else {
        this.localCache.clear();
      }
    } catch (error) {
      console.error('Lỗi khi clear cache:', error.message);
      this.localCache.clear();
    }
  }

  /**
   * Invalidate cache by setting to null (permissions-safe alternative to DEL)
   * @param {string} key 
   * @returns {Promise<void>}
   */
  async invalidate(key) {
    try {
      if (redis) {
        // Set to null instead of deleting
        await redis.set(key, 'null');
      }
      this.localCache.delete(key);
    } catch (error) {
      console.error(`Lỗi khi invalidate cache ${key}:`, error.message);
      this.localCache.delete(key);
    }
  }

  /**
   * Check if Redis is available and has basic permissions
   * @returns {boolean}
   */
  isRedisAvailable() {
    return redis !== null;
  }

  /**
   * Test Redis permissions
   * @returns {Promise<Object>}
   */
  async testPermissions() {
    if (!redis) {
      return { hasRedis: false, permissions: {} };
    }

    const permissions = {
      get: false,
      set: false,
      setex: false,
      del: false
    };

    const testKey = 'test:permissions';
    
    try {
      // Test GET
      await redis.get(testKey);
      permissions.get = true;
    } catch (error) {
      console.log('GET permission test failed:', error.message);
    }

    try {
      // Test SET
      await redis.set(testKey, 'test');
      permissions.set = true;
    } catch (error) {
      console.log('SET permission test failed:', error.message);
    }

    try {
      // Test SETEX
      await redis.setex(testKey, 60, 'test');
      permissions.setex = true;
    } catch (error) {
      console.log('SETEX permission test failed:', error.message);
    }

    try {
      // Test DEL
      await redis.del(testKey);
      permissions.del = true;
    } catch (error) {
      console.log('DEL permission test failed:', error.message);
    }

    return { hasRedis: true, permissions };
  }

  /**
   * Get cache info
   * @returns {Object}
   */
  getCacheInfo() {
    return {
      type: redis ? 'Redis (Upstash)' : 'Local Memory',
      isRedis: redis !== null,
      localCacheSize: this.localCache.size
    };
  }

  /**
   * Force refresh a cache key (set to null to trigger reload)
   * @param {string} key 
   * @returns {Promise<void>}
   */
  async refresh(key) {
    await this.invalidate(key);
  }

  /**
   * Get all keys matching pattern (Redis SCAN equivalent)
   * @param {string} pattern - Key pattern to match
   * @returns {Promise<string[]>}
   */
  async keys(pattern) {
    try {
      if (redis) {
        // For Upstash Redis, we'll use a different approach since SCAN might not be available
        // We'll return an empty array for now and handle session management differently
        console.log(`⚠️ Keys pattern matching not fully supported for ${pattern}`);
        return [];
      } else {
        // For local cache, filter keys by pattern
        const keys = [];
        for (const key of this.localCache.keys()) {
          if (this.matchPattern(key, pattern)) {
            keys.push(key);
          }
        }
        return keys;
      }
    } catch (error) {
      console.error(`Lỗi khi get keys ${pattern}:`, error.message);
      return [];
    }
  }

  /**
   * Simple pattern matching for local cache
   * @param {string} key 
   * @param {string} pattern 
   * @returns {boolean}
   */
  matchPattern(key, pattern) {
    // Convert Redis pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }
}

module.exports = new RedisCache(); 