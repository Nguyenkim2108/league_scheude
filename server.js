require('dotenv').config()
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const LoLDataParser = require('./dataParser.js');
const cache = require('./lib/redis.js');
const path = require('path'); // Added missing import

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Session management using Redis
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Session helper functions
async function createSession(sessionId, sessionData) {
  const session = {
    ...sessionData,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  // Store session in Redis with TTL (24 hours)
  await cache.set(`session:${sessionId}`, session, 24 * 60 * 60);
  return session;
}

async function getSession(sessionId) {
  const session = await cache.get(`session:${sessionId}`);
  if (!session) return null;
  
  // Check if session is expired
  if (Date.now() > session.expiresAt) {
    await deleteSession(sessionId);
    return null;
  }
  
  return session;
}

async function updateSession(sessionId, sessionData) {
  const session = await getSession(sessionId);
  if (!session) return null;
  
  // Update session data
  const updatedSession = {
    ...session,
    ...sessionData,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // Extend to 24 hours
  };
  
  // Store updated session in Redis with TTL
  await cache.set(`session:${sessionId}`, updatedSession, 24 * 60 * 60);
  return updatedSession;
}

async function deleteSession(sessionId) {
  await cache.del(`session:${sessionId}`);
}

async function sessionExists(sessionId) {
  const session = await getSession(sessionId);
  return session !== null;
}

// Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Middleware to check admin authentication
async function requireAdminAuth(req, res, next) {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId || !(await sessionExists(sessionId))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Extend session
    await updateSession(sessionId, { lastAccess: Date.now() });
    req.adminSession = session;
    next();
  } catch (error) {
    console.error('Error in requireAdminAuth:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * LoL Esports Crawler Class - Integrated into server
 */
class LoLEsportsCrawler {
  constructor(config = {}) {
    this.baseURL = 'https://lolesports.com/api/gql';
    this.headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
      'apollographql-client-name': 'Esports Web',
      'apollographql-client-version': 'b6d7821',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'pragma': 'no-cache',
      'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'referrer': 'https://lolesports.com/en-GB',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      ...config.headers
    };
    this.delay = config.delay || 2000;
    this.retries = config.retries || 3;
  }

  // Gửi GET request với query parameters
  async sendQuery(operationName, variables, extensions) {
    const queryParams = new URLSearchParams({
      operationName,
      variables: JSON.stringify(variables),
      extensions: JSON.stringify(extensions)
    });
    console.log(queryParams.toString());
    const url = `${this.baseURL}?${queryParams.toString()}`;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 30000,
          withCredentials: true
        });

        if (response.data.errors) {
          console.log(`⚠️  GraphQL errors:`, response.data.errors);
        }

        return response.data;

      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error.response?.status || error.message);

        if (error.response?.status === 429) {
          console.log('🚫 Rate limited, waiting longer...');
          await this.sleep(this.delay * 3);
        }

        if (attempt === this.retries) {
          throw error;
        }

        await this.sleep(this.delay * Math.pow(2, attempt - 1));
      }
    }
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * ADMIN AUTHENTICATION ROUTES
 */

/**
 * POST /api/admin/login
 * Admin login
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username và password là bắt buộc' });
    }
    
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Username hoặc password không đúng' });
    }
    
    // Create session
    const sessionId = generateSessionId();
    const session = await createSession(sessionId, {
      username: ADMIN_USERNAME,
      loginTime: new Date().toISOString()
    });
    
    res.json({
      success: true,
      sessionId,
      message: 'Đăng nhập thành công',
      expiresAt: session.expiresAt
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập admin:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * POST /api/admin/logout
 * Admin logout
 */
app.post('/api/admin/logout', requireAdminAuth, async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('Lỗi khi đăng xuất admin:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * GET /api/admin/check
 * Check admin session
 */
app.get('/api/admin/check', requireAdminAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      session: {
        username: req.adminSession.username,
        loginTime: req.adminSession.loginTime,
        expiresAt: req.adminSession.expiresAt
      }
    });
  } catch (error) {
    console.error('Lỗi khi check admin session:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * GET /api/admin/sessions
 * Get all active sessions (admin only)
 */
app.get('/api/admin/sessions', requireAdminAuth, async (req, res) => {
  try {
    // Since we can't easily get all session keys from Upstash Redis,
    // we'll return a simplified response
    res.json({
      success: true,
      message: 'Session management active',
      note: 'Individual session management available via session ID'
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách sessions:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * DELETE /api/admin/sessions/:sessionId
 * Delete specific session (admin only)
 */
app.delete('/api/admin/sessions/:sessionId', requireAdminAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await deleteSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session đã được xóa'
    });
  } catch (error) {
    console.error('Lỗi khi xóa session:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * POST /api/admin/sessions/cleanup
 * Cleanup expired sessions (admin only)
 */
app.post('/api/admin/sessions/cleanup', requireAdminAuth, async (req, res) => {
  try {
    // Since we can't easily scan all keys in Upstash Redis,
    // we'll rely on TTL for automatic cleanup
    res.json({
      success: true,
      message: 'Sessions sẽ tự động hết hạn sau 24 giờ',
      note: 'Redis TTL handles automatic cleanup'
    });
  } catch (error) {
    console.error('Lỗi khi cleanup sessions:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * BANNER MANAGEMENT ROUTES
 */

/**
 * GET /api/admin/banners
 * Lấy danh sách banners
 */
app.get('/api/admin/banners', requireAdminAuth, async (req, res) => {
  try {
    const banner1 = await cache.get('banner1') || [];
    const banner2 = await cache.get('banner2') || [];
    
    res.json({
      success: true,
      banners: {
        banner1,
        banner2
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy banners:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * POST /api/admin/banners/:type
 * Thêm banner mới (type: banner1 hoặc banner2)
 */
app.post('/api/admin/banners/:type', requireAdminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { image_url, link_href } = req.body;
    
    if (type !== 'banner1' && type !== 'banner2') {
      return res.status(400).json({ error: 'Type phải là banner1 hoặc banner2' });
    }
    
    if (!image_url || !link_href) {
      return res.status(400).json({ error: 'image_url và link_href là bắt buộc' });
    }
    
    // Validate URL format
    try {
      new URL(image_url);
      new URL(link_href);
    } catch (error) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }
    
    // Get current banners
    const currentBanners = await cache.get(type) || [];
    
    // Add new banner
    const newBanner = {
      id: Date.now().toString(),
      image_url,
      link_href,
      created_at: new Date().toISOString()
    };
    
    currentBanners.push(newBanner);
    
    // Save to Redis without TTL
    await cache.set(type, currentBanners, null);
    
    res.json({
      success: true,
      message: `Banner đã được thêm vào ${type}`,
      banner: newBanner,
      total: currentBanners.length
    });
  } catch (error) {
    console.error('Lỗi khi thêm banner:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * PUT /api/admin/banners/:type/:id
 * Cập nhật banner
 */
app.put('/api/admin/banners/:type/:id', requireAdminAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { image_url, link_href } = req.body;
    
    if (type !== 'banner1' && type !== 'banner2') {
      return res.status(400).json({ error: 'Type phải là banner1 hoặc banner2' });
    }
    
    if (!image_url || !link_href) {
      return res.status(400).json({ error: 'image_url và link_href là bắt buộc' });
    }
    
    // Validate URL format
    try {
      new URL(image_url);
      new URL(link_href);
    } catch (error) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }
    
    // Get current banners
    const currentBanners = await cache.get(type) || [];
    const bannerIndex = currentBanners.findIndex(banner => banner.id === id);
    
    if (bannerIndex === -1) {
      return res.status(404).json({ error: 'Không tìm thấy banner' });
    }
    
    // Update banner
    currentBanners[bannerIndex] = {
      ...currentBanners[bannerIndex],
      image_url,
      link_href,
      updated_at: new Date().toISOString()
    };
    
    // Save to Redis without TTL
    await cache.set(type, currentBanners, null);
    
    res.json({
      success: true,
      message: 'Banner đã được cập nhật',
      banner: currentBanners[bannerIndex]
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật banner:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * DELETE /api/admin/banners/:type/:id
 * Xóa banner
 */
app.delete('/api/admin/banners/:type/:id', requireAdminAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type !== 'banner1' && type !== 'banner2') {
      return res.status(400).json({ error: 'Type phải là banner1 hoặc banner2' });
    }
    
    // Get current banners
    const currentBanners = await cache.get(type) || [];
    const bannerIndex = currentBanners.findIndex(banner => banner.id === id);
    
    if (bannerIndex === -1) {
      return res.status(404).json({ error: 'Không tìm thấy banner' });
    }
    
    // Remove banner
    const deletedBanner = currentBanners.splice(bannerIndex, 1)[0];
    
    // Save to Redis without TTL
    await cache.set(type, currentBanners, null);
    
    res.json({
      success: true,
      message: 'Banner đã được xóa',
      deletedBanner,
      remaining: currentBanners.length
    });
  } catch (error) {
    console.error('Lỗi khi xóa banner:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * VIDEO MANAGEMENT ROUTES
 */

/**
 * GET /api/admin/video
 * Lấy thông tin video hiện tại
 */
app.get('/api/admin/video', requireAdminAuth, async (req, res) => {
  try {
    const videoFrame = await cache.get('video_frame') || null;
    
    res.json({
      success: true,
      video: videoFrame
    });
  } catch (error) {
    console.error('Lỗi khi lấy video:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * POST /api/admin/video
 * Cập nhật video frame
 */
app.post('/api/admin/video', requireAdminAuth, async (req, res) => {
  try {
    const { youtube_url } = req.body;
    
    if (!youtube_url) {
      return res.status(400).json({ error: 'youtube_url là bắt buộc' });
    }
    
    // Validate YouTube URL and extract video ID
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = youtube_url.match(youtubeRegex);
    
    if (!match) {
      return res.status(400).json({ error: 'URL YouTube không hợp lệ' });
    }
    
    const videoId = match[1];
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    
    const videoData = {
      youtube_url,
      video_id: videoId,
      embed_url: embedUrl,
      updated_at: new Date().toISOString()
    };
    
    // Save to Redis without TTL
    await cache.set('video_frame', videoData, null);
    
    res.json({
      success: true,
      message: 'Video đã được cập nhật',
      video: videoData
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật video:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * DELETE /api/admin/video
 * Xóa video
 */
app.delete('/api/admin/video', requireAdminAuth, async (req, res) => {
  try {
    await cache.del('video_frame');
    
    res.json({
      success: true,
      message: 'Video đã được xóa'
    });
  } catch (error) {
    console.error('Lỗi khi xóa video:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * SOCIAL LINKS MANAGEMENT ROUTES
 */

/**
 * GET /api/admin/socials
 * Lấy danh sách social links
 */
app.get('/api/admin/socials', requireAdminAuth, async (req, res) => {
  try {
    const socials = await cache.get('socials') || [];
    
    res.json({
      success: true,
      socials
    });
  } catch (error) {
    console.error('Lỗi khi lấy socials:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * POST /api/admin/socials
 * Cập nhật social links
 */
app.post('/api/admin/socials', requireAdminAuth, async (req, res) => {
  try {
    const { socials } = req.body;
    
    if (!Array.isArray(socials)) {
      return res.status(400).json({ error: 'socials phải là array' });
    }
    
    // Validate social links
    for (const social of socials) {
      if (!social.type || !social.link) {
        return res.status(400).json({ error: 'Mỗi social phải có type và link' });
      }
      
      // Validate URL format (except for tel: links)
      if (!social.link.startsWith('tel:') && !social.link.startsWith('mailto:')) {
        try {
          new URL(social.link);
        } catch (error) {
          return res.status(400).json({ error: `URL không hợp lệ cho ${social.type}: ${social.link}` });
        }
      }
    }
    
    // Save to Redis without TTL
    await cache.set('socials', socials, null);
    
    res.json({
      success: true,
      message: 'Social links đã được cập nhật',
      socials
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật socials:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * POPUP MANAGEMENT ROUTES
 */

/**
 * GET /api/admin/popup
 * Lấy thông tin popup
 */
app.get('/api/admin/popup', requireAdminAuth, async (req, res) => {
  try {
    const popup = await cache.get('popup') || null;
    
    res.json({
      success: true,
      popup
    });
  } catch (error) {
    console.error('Lỗi khi lấy popup:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * POST /api/admin/popup
 * Cập nhật popup
 */
app.post('/api/admin/popup', requireAdminAuth, async (req, res) => {
  try {
    const { image_url, link_url } = req.body;
    
    if (!image_url || !link_url) {
      return res.status(400).json({ error: 'image_url và link_url là bắt buộc' });
    }
    
    // Validate URL format
    try {
      new URL(image_url);
      new URL(link_url);
    } catch (error) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }
    
    const popupData = {
      image_url,
      link_url,
      updated_at: new Date().toISOString()
    };
    
    // Save to Redis without TTL
    await cache.set('popup', popupData, null);
    
    res.json({
      success: true,
      message: 'Popup đã được cập nhật',
      popup: popupData
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật popup:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * DELETE /api/admin/popup
 * Xóa popup
 */
app.delete('/api/admin/popup', requireAdminAuth, async (req, res) => {
  try {
    await cache.del('popup');
    
    res.json({
      success: true,
      message: 'Popup đã được xóa'
    });
  } catch (error) {
    console.error('Lỗi khi xóa popup:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * PUBLIC ROUTES FOR BANNER AND VIDEO DISPLAY
 */

/**
 * GET /api/banners
 * Lấy banners cho hiển thị public (không cần auth)
 */
app.get('/api/banners', async (req, res) => {
  try {
    const banner1 = await cache.get('banner1') || [];
    const banner2 = await cache.get('banner2') || [];
    
    res.json({
      success: true,
      banners: {
        banner1,
        banner2
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy banners public:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * GET /api/socials
 * Lấy social links cho hiển thị public (không cần auth)
 */
app.get('/api/socials', async (req, res) => {
  try {
    const socials = await cache.get('socials') || [];
    
    res.json({
      success: true,
      socials
    });
  } catch (error) {
    console.error('Lỗi khi lấy socials public:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * GET /api/popup
 * Lấy thông tin popup cho hiển thị public (không cần auth)
 */
app.get('/api/popup', async (req, res) => {
  try {
    const popup = await cache.get('popup') || null;
    
    res.json({
      success: true,
      popup
    });
  } catch (error) {
    console.error('Lỗi khi lấy popup public:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * GET /api/video
 * Lấy video cho hiển thị public (không cần auth)
 */
app.get('/api/video', async (req, res) => {
  try {
    const videoFrame = await cache.get('video_frame') || null;
    
    res.json({
      success: true,
      video: videoFrame
    });
  } catch (error) {
    console.error('Lỗi khi lấy video public:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * Clear all cache with permissions-safe approach
 */
async function clearCache() {
  try {
    await cache.clear();
    console.log('🗑️  Cache đã được xóa');
  } catch (error) {
    console.error('Lỗi khi clear cache:', error.message);
  }
}

/**
 * Get events từ Redis cache theo range cụ thể
 */
async function getCachedEventsByRange(startDate, endDate) {
  try {
    const cacheKey = `events:${startDate}:${endDate}`;
    const cachedEvents = await cache.get(cacheKey);
    
    // Handle null string (from invalidation)
    if (cachedEvents === 'null' || cachedEvents === null) {
      return null; // Return null to indicate cache miss
    }
    
    return cachedEvents || null;
  } catch (error) {
    console.error('Lỗi khi get cached events by range:', error.message);
    return null;
  }
}

/**
 * Cache events theo range cụ thể
 */
async function cacheEventsByRange(startDate, endDate, events) {
  try {
    const cacheKey = `events:${startDate}:${endDate}`;
    await cache.set(cacheKey, events, 300); // 5 minutes cache
    console.log(`✅ Đã cache ${events.length} events cho range ${startDate} - ${endDate}`);
  } catch (error) {
    console.error('Lỗi khi cache events by range:', error.message);
  }
}

/**
 * Crawl events theo range cụ thể và cache
 */
async function crawlAndCacheEventsByRange(startDate, endDate) {
  try {
    console.log(`🔄 Crawling events cho range ${startDate} - ${endDate}`);
    
    const crawler = new LoLEsportsCrawler({
      delay: 1500
    });
    
    const variables = {
      hl: 'vi-VN',
      sport: 'lol',
      eventDateStart: new Date(startDate).toISOString(),
      eventDateEnd: new Date(endDate).toISOString(),
      eventState: ['inProgress', 'completed', 'unstarted'],
      eventType: 'all',
      vodType: ['recap'],
      pageSize: 300,
      leagues: ["98767991310872058","98767991314006698"]
    };

    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '7246add6f577cf30b304e651bf9e25fc6a41fe49aeafb0754c16b5778060fc0a'
      }
    };

    const response = await crawler.sendQuery('homeEvents', variables, extensions);
    const allEvents = LoLDataParser.parseEvents(response.data);
    
    if (allEvents.length > 0) {
      // Sort events by time
      const sortedEvents = LoLDataParser.sortEventsByTime(allEvents, 'asc');
      
      // Cache the events
      await cacheEventsByRange(startDate, endDate, sortedEvents);
      
      console.log(`✅ Đã crawl và cache ${sortedEvents.length} events cho range ${startDate} - ${endDate}`);
      return sortedEvents;
    }
    
    // Cache empty result
    await cacheEventsByRange(startDate, endDate, []);
    return [];
    
  } catch (error) {
    console.error('Lỗi khi crawl events by range:', error.message);
    throw error;
  }
}

/**
 * Get default date range (yesterday, today, tomorrow) - Vietnam timezone
 */
function getDefaultDateRange() {
  // Get current date in Vietnam timezone
  const now = new Date();
  const vietnamTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
  
  // Create dates for yesterday, today, tomorrow in Vietnam timezone
  const today = new Date(vietnamTime);
  const yesterday = new Date(vietnamTime);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(vietnamTime);
  tomorrow.setDate(today.getDate() + 1);
  
  // Format as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    startDate: formatDate(yesterday),
    endDate: formatDate(tomorrow)
  };
}

/**
 * Get extended date range (add 3 more days to the end)
 */
function getExtendedDateRange(currentEndDate) {
  const endDate = new Date(currentEndDate);
  const extendedEndDate = new Date(endDate);
  extendedEndDate.setDate(endDate.getDate() + 3);
  
  // Format as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    startDate: currentEndDate,
    endDate: formatDate(extendedEndDate)
  };
}

/**
 * GET /api/cache/info
 * Lấy thông tin cache
 */
app.get('/api/cache/info', async (req, res) => {
  try {
    const cacheInfo = cache.getCacheInfo();
    const dateRange = getDefaultDateRange();
    
    // Get current range data
    const events = await getCachedEventsByRange(dateRange.startDate, dateRange.endDate) || [];
    
    // Test permissions if Redis is available
    let permissions = null;
    if (cacheInfo.isRedis) {
      permissions = await cache.testPermissions();
    }
    
    res.json({
      ...cacheInfo,
      cachedEvents: events.length,
      lastEventTime: events.length > 0 ? events[events.length - 1]?.startTime : null,
      currentRange: dateRange,
      permissions
    });
  } catch (error) {
    console.error('Lỗi khi lấy cache info:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * DELETE /api/cache
 * Xóa cache
 */
app.delete('/api/cache', async (req, res) => {
  try {
    await clearCache();
    res.json({ success: true, message: 'Cache đã được xóa' });
  } catch (error) {
    console.error('Lỗi khi xóa cache:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * GET /api/events
 * Lấy danh sách events theo range với continuous loading
 */
app.get('/api/events', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Use default range if not provided
    let dateRange = { startDate, endDate };
    if (!startDate || !endDate) {
      dateRange = getDefaultDateRange();
    }

    // Try to get from cache first
    let events = await getCachedEventsByRange(dateRange.startDate, dateRange.endDate);
    
    if (!events) {
      // Cache miss, crawl new data
      events = await crawlAndCacheEventsByRange(dateRange.startDate, dateRange.endDate);
    }
    
    // Format time cho frontend với múi giờ Việt Nam
    const formattedEvents = events.map(event => ({
      ...event,
      formattedTime: LoLDataParser.formatTime(event.startTime, 'vi-VN')
    }));
    
    res.json({
      events: formattedEvents,
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy events:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

/**
 * GET /api/events/:id
 * Lấy chi tiết một event
 */
app.get('/api/events/:id', async (req, res) => {
  try {
    // For single event, we need to search in a reasonable range
    const dateRange = getDefaultDateRange();
    const events = await crawlAndCacheEventsByRange(dateRange.startDate, dateRange.endDate);
    
    const event = events.find(e => e.id === req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
    }
    
    const formattedEvent = {
      ...event,
      formattedTime: LoLDataParser.formatTime(event.startTime, 'vi-VN')
    };
    
    res.json({ event: formattedEvent });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết event:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

app.get('/test', (req, res) => {
  console.log("📌 Hit test route");
  res.send("Server is working!");
});
// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Lỗi server:', error);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});
app.use(express.static('public')); // Serve static HTML files




// Initialize and start server
async function startServer() {
  try {
    // Test Redis permissions on startup
    if (cache.isRedisAvailable()) {
      console.log('🧪 Testing Redis permissions...');
      const permTest = await cache.testPermissions();
      console.log('📋 Redis permissions:', permTest.permissions);
      
      if (!permTest.permissions.get) {
        console.log('⚠️  Redis GET not working, falling back to local cache');
      }
      if (!permTest.permissions.setex && permTest.permissions.set) {
        console.log('⚠️  Redis SETEX not allowed, using SET instead');
      }
      if (!permTest.permissions.del) {
        console.log('⚠️  Redis DEL not allowed, using invalidation instead');
      }
    }
    
    // Load default range data on startup (non-blocking)
    console.log('🔄 Loading default range data...');
    const defaultRange = getDefaultDateRange();
    crawlAndCacheEventsByRange(defaultRange.startDate, defaultRange.endDate).catch(error => {
      console.log('⚠️ Lỗi khi load dữ liệu mặc định:', error.message);
    });
    
    console.log(`🚀 LoL Esports Server đang chạy trên port ${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   GET    /api/events           - Events theo range (continuous loading)`);
    console.log(`   GET    /api/events/:id       - Chi tiết event`);
    console.log(`   GET    /api/cache/info       - Thông tin cache`);
    console.log(`   DELETE /api/cache            - Xóa cache`);
    console.log(`   GET    /api/banners          - Lấy banners (public)`);
    console.log(`   GET    /api/video            - Lấy video (public)`);
    console.log(`   GET    /api/socials          - Lấy social links (public)`);
    console.log(`   GET    /api/popup            - Lấy popup (public)`);
    console.log(`🔐 Admin endpoints:`);
    console.log(`   POST   /api/admin/login      - Admin login`);
    console.log(`   POST   /api/admin/logout     - Admin logout`);
    console.log(`   GET    /api/admin/check      - Check session`);
    console.log(`   GET    /api/admin/banners    - Quản lý banners`);
    console.log(`   POST   /api/admin/banners/:type - Thêm banner`);
    console.log(`   PUT    /api/admin/banners/:type/:id - Sửa banner`);
    console.log(`   DELETE /api/admin/banners/:type/:id - Xóa banner`);
    console.log(`   GET    /api/admin/video      - Quản lý video`);
    console.log(`   POST   /api/admin/video      - Cập nhật video`);
    console.log(`   DELETE /api/admin/video      - Xóa video`);
    console.log(`   GET    /api/admin/socials    - Quản lý social links`);
    console.log(`   POST   /api/admin/socials    - Cập nhật social links`);
    console.log(`   GET    /api/admin/popup      - Quản lý popup`);
    console.log(`   POST   /api/admin/popup      - Cập nhật popup`);
    console.log(`   DELETE /api/admin/popup      - Xóa popup`);
    console.log(`📱 Giao diện:`);
    console.log(`   http://localhost:${PORT}      - Trang chính`);
    console.log(`   http://localhost:${PORT}/admin - Trang admin`);
    console.log(`🇻🇳 Múi giờ: Việt Nam (UTC+7)`);
    console.log(`💾 Cache: ${cache.getCacheInfo().type}`);
    console.log(`☁️  Serverless: File operations disabled`);
    console.log(`� Admin Login: ${ADMIN_USERNAME}/${ADMIN_PASSWORD}`);
    console.log(`📅 Default range: ${defaultRange.startDate} - ${defaultRange.endDate}`);
  } catch (error) {
    console.error('Lỗi khi khởi động server:', error);
  }
}

// Start the server
app.listen(PORT, async () => {
  await startServer();
  console.log(`Server is running on port ${PORT}`);
});
process.on("SIGINT", () => {
  console.log("Close server");
  process.exit(1);
});
process.on("SIGTERM", () => {
  console.log("Close server");
  process.exit(1);
});

