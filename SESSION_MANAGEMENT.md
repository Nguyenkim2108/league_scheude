# Session Management với Redis

## Tổng quan

Hệ thống đã được chuyển từ sử dụng Map (in-memory) sang Redis để lưu trữ phiên đăng nhập admin. Điều này mang lại nhiều lợi ích:

### Lợi ích của việc sử dụng Redis

1. **Persistence**: Sessions được lưu trữ bền vững, không mất khi restart server
2. **Scalability**: Có thể scale across multiple server instances
3. **TTL (Time To Live)**: Tự động xóa sessions hết hạn
4. **Performance**: Redis là in-memory database, rất nhanh
5. **Reliability**: Fallback to local cache nếu Redis không available

## Cấu trúc Session

```javascript
{
  username: "admin",
  loginTime: "2024-01-01T00:00:00.000Z",
  expiresAt: 1704067200000, // 24 hours from login
  lastAccess: 1703980800000  // Updated on each request
}
```

## API Endpoints

### 1. Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "message": "Đăng nhập thành công",
  "expiresAt": 1704067200000
}
```

### 2. Check Session
```http
GET /api/admin/check
Authorization: Bearer <sessionId>
```

**Response:**
```json
{
  "success": true,
  "session": {
    "username": "admin",
    "loginTime": "2024-01-01T00:00:00.000Z",
    "expiresAt": 1704067200000
  }
}
```

### 3. Logout
```http
POST /api/admin/logout
Authorization: Bearer <sessionId>
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

### 4. Session Management
```http
GET /api/admin/sessions
Authorization: Bearer <sessionId>
```

**Response:**
```json
{
  "success": true,
  "message": "Session management active",
  "note": "Individual session management available via session ID"
}
```

### 5. Cleanup Sessions
```http
POST /api/admin/sessions/cleanup
Authorization: Bearer <sessionId>
```

**Response:**
```json
{
  "success": true,
  "message": "Sessions sẽ tự động hết hạn sau 24 giờ",
  "note": "Redis TTL handles automatic cleanup"
}
```

## Cấu hình

### Environment Variables
```env
# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Redis configuration (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Session Configuration
- **TTL**: 24 giờ (86400 giây)
- **Auto-extend**: Session được extend mỗi khi có request
- **Auto-cleanup**: Redis tự động xóa sessions hết hạn

## Fallback Mechanism

Nếu Redis không available, hệ thống sẽ fallback về local cache:

```javascript
// Redis không available -> sử dụng local Map
if (!redis) {
  this.localCache.set(key, {
    data: sessionData,
    timestamp: Date.now(),
    permanent: false
  });
}
```

## Testing

Chạy test session management:

```bash
node scripts/test-session-management.js
```

## Security Features

1. **Session ID Generation**: Sử dụng random string + timestamp
2. **TTL Protection**: Sessions tự động hết hạn sau 24 giờ
3. **Authorization Header**: Bearer token authentication
4. **Session Validation**: Kiểm tra session tồn tại và chưa hết hạn
5. **Auto Logout**: Tự động logout khi session hết hạn

## Migration từ Map sang Redis

### Trước đây (Map):
```javascript
const sessions = new Map();
sessions.set(sessionId, sessionData);
const session = sessions.get(sessionId);
sessions.delete(sessionId);
```

### Bây giờ (Redis):
```javascript
await createSession(sessionId, sessionData);
const session = await getSession(sessionId);
await deleteSession(sessionId);
```

## Monitoring

### Session Statistics
- Tổng số active sessions
- Session expiration times
- Failed login attempts
- Session cleanup logs

### Health Checks
- Redis connectivity
- Session creation/deletion success rate
- TTL enforcement

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check environment variables
   - Verify Redis service is running
   - System will fallback to local cache

2. **Session Expired Unexpectedly**
   - Check server time synchronization
   - Verify TTL configuration
   - Check Redis memory usage

3. **Login Issues**
   - Verify admin credentials
   - Check session creation logs
   - Monitor Redis performance

### Debug Commands

```javascript
// Check Redis availability
console.log(cache.isRedisAvailable());

// Test Redis permissions
const permissions = await cache.testPermissions();
console.log(permissions);

// Get cache info
console.log(cache.getCacheInfo());
``` 