# 🏆 LoL Esports Crawler & Viewer

Hệ thống crawl và hiển thị dữ liệu LoL Esports với giao diện web hiện đại, **100% serverless** với Redis cache, deploy sẵn sàng cho Vercel.

## 🚀 Tính năng

### 📊 Data Crawler
- Crawl dữ liệu từ LoL Esports API theo ngày
- **Lưu trữ trực tiếp vào Redis** (không có file operations)
- Retry mechanism và error handling
- **Vercel serverless compatible**
- Auto-merge events và deduplicate

### 🌐 Web Interface
- Giao diện hiện đại với League of Legends theme
- Hiển thị matches theo format card layout nhóm theo ngày
- Pagination với Load More functionality
- Real-time filtering theo league, state, search
- Statistics dashboard
- Responsive design cho mobile
- Múi giờ Việt Nam (UTC+7)
- **Empty state với quick actions**

### 🔧 API Endpoints
- `GET /api/events` - Danh sách events với pagination
- `GET /api/events-by-date` - Events grouped theo ngày
- `GET /api/leagues` - Danh sách unique leagues
- `GET /api/stats` - Thống kê tổng quan
- `POST /api/crawl` - Crawl dữ liệu mới
- `POST /api/crawl/sample` - **Tải dữ liệu mẫu cho demo**
- `GET /api/events/:id` - Chi tiết event
- `GET /api/cache/info` - Thông tin cache
- `DELETE /api/cache` - Xóa cache
- `GET /api/banners` - Lấy banners (public)
- `GET /api/video` - Lấy video (public)

### 🔐 Admin Panel
- **Login system**: Session-based authentication
- **Banner management**: Quản lý 2 nhóm banner (banner1, banner2)
- **Video management**: Nhúng YouTube video
- **Access**: `/admin` - Trang quản trị
- **Credentials**: Cấu hình qua environment variables

#### Admin API Endpoints
- `POST /api/admin/login` - Đăng nhập admin
- `POST /api/admin/logout` - Đăng xuất admin
- `GET /api/admin/check` - Kiểm tra session
- `GET /api/admin/banners` - Lấy danh sách banners
- `POST /api/admin/banners/:type` - Thêm banner (type: banner1|banner2)
- `PUT /api/admin/banners/:type/:id` - Sửa banner
- `DELETE /api/admin/banners/:type/:id` - Xóa banner
- `GET /api/admin/video` - Lấy thông tin video
- `POST /api/admin/video` - Cập nhật video YouTube
- `DELETE /api/admin/video` - Xóa video

### 💾 Redis Cache Architecture
- **Primary storage**: Upstash Redis cho production
- **Fallback**: Local memory cache for development
- **Smart TTL**: Events (5 min), Leagues (10 min), Stats (2 min)
- **Serverless optimized**: Không có filesystem dependencies
- **Auto-initialization**: Sample data nếu cache trống

## 📋 Cấu trúc dữ liệu

### Parsed Event Data
```javascript
{
  id: "string",
  league: {
    image: "string",
    name: "string", 
    slug: "string"
  },
  matchFormat: "BO1|BO3|BO5",
  matchTeams: [
    {
      name: "string",
      code: "string",
      image: "string",
      gameWins: number,
      outcome: "win|loss|null"
    }
  ],
  startTime: "ISO date",
  state: "unstarted|inProgress|completed",
  type: "match",
  blockName: "string",
  tournament: {
    name: "string",
    id: "string"
  }
}
```

## 🛠️ Cài đặt Local

### 1. Clone repository
```bash
git clone <repo-url>
cd crawl
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Redis (optional - có fallback local cache)
```bash
# Tạo file .env với Redis config
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 4. Start server
```bash
npm start
# hoặc development mode
npm run dev
```

### 5. Mở browser
```
http://localhost:3000
```

**Note**: App sẽ tự động tải dữ liệu mẫu nếu cache trống.

## ☁️ Deploy lên Vercel

### 1. Setup Upstash Redis

1. Truy cập [Upstash Console](https://console.upstash.com/)
2. Tạo Redis database mới (region: closest to your users)
3. Copy **REST URL** và **REST Token**

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Setup environment variables
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN

# Redeploy với env vars
vercel --prod
```

#### Option B: GitHub Integration
1. Push code lên GitHub repository
2. Connect repository với Vercel
3. Thêm Environment Variables:
   - `UPSTASH_REDIS_REST_URL`: Your Redis REST URL
   - `UPSTASH_REDIS_REST_TOKEN`: Your Redis token
4. Deploy

### 3. Verify deployment
- Check `/api/cache/info` để verify Redis connection
- Test crawl và cache functionality
- Sử dụng "🎯 Dữ liệu mẫu" nếu cache trống

## 📁 Cấu trúc project

```
├── server.js             # Express server với integrated crawler
├── dataParser.js         # Parser cho raw data
├── lib/
│   └── redis.js         # Redis cache utilities
├── scripts/
│   └── test-redis.js    # Redis connection test
├── package.json         # Dependencies và scripts
├── vercel.json          # Vercel deployment config
├── .gitignore           # Git ignore patterns
└── public/              # Frontend files
    ├── index.html       # Giao diện chính
    └── app.js           # Frontend JavaScript
```

## 🎮 Cách sử dụng

### 1. Xem dữ liệu hiện có
- Mở website đã deploy hoặc localhost:3000
- Nếu cache trống, sử dụng "🎯 Dữ liệu mẫu" để load sample data
- Browse qua các matches theo nhóm ngày
- Sử dụng filters để lọc theo league, state
- Search theo tên team hoặc league

### 2. Crawl dữ liệu mới
- Section "🚀 Cập Nhật Dữ Liệu" ở đầu trang
- Chọn start date và end date
- Click "🔄 Cập nhật"
- Dữ liệu mới sẽ được merge với existing data

### 3. Dữ liệu mẫu
- Click "🎯 Dữ liệu mẫu" để load demo data
- Crawl events từ ngày hôm qua đến hôm nay
- Perfect cho testing và demo

### 4. Load More
- Click "Tải thêm trận đấu" để xem thêm
- Pagination tự động với lazy loading

## 🎨 UI Features

### Color Scheme (League of Legends Theme)
- Background: Dark blue gradient (`#0F1419` → `#1E2328`)
- Primary gold: `#C89B3C`
- Text: `#F0E6D2` (primary), `#CDBE91` (secondary)
- Borders: `#463714`

### Date Grouping Layout
- **Date headers**: Background vàng với tên ngày đầy đủ
- **Events in date**: Container riêng cho mỗi ngày
- **Card layout**: League logo, team info, thời gian VN
- **Empty state**: Quick actions khi không có data
- **Responsive**: Mobile-friendly layout

## 🔧 Configuration

### Server Settings (server.js)
```javascript
const PORT = process.env.PORT || 3000;

// Integrated crawler settings
const crawler = new LoLEsportsCrawler({
  delay: 2000,    // Delay giữa requests (ms)
  retries: 3      // Số lần retry khi fail
});
```

### Redis Cache Settings (lib/redis.js)
```javascript
const CACHE_DURATION = {
  events: 300,    // 5 minutes
  leagues: 600,   // 10 minutes  
  stats: 120      // 2 minutes
};
```

## 📊 API Usage Examples

### Get events với filters
```bash
GET /api/events?page=1&limit=10&league=lpl&state=completed
```

### Crawl new data
```bash
POST /api/crawl
Content-Type: application/json

{
  "startDate": "2025-07-30T00:00:00.000Z",
  "endDate": "2025-07-31T23:59:59.999Z"
}
```

### Load sample data
```bash
POST /api/crawl/sample
```

### Get cache info
```bash
GET /api/cache/info
# Response: { type: "Redis (Upstash)", cachedEvents: 50, lastEventTime: "..." }
```

### Clear cache
```bash
DELETE /api/cache
```

## 🔍 Troubleshooting

### Crawler Issues
- **Rate limiting**: Crawler đã có built-in retry với exponential backoff
- **Network errors**: Check internet connection
- **Empty results**: Verify date range có events

### Redis Issues
- **Connection failed**: Check UPSTASH environment variables
- **Cache not working**: Verify Redis credentials trên Upstash console
- **Fallback to local**: App sẽ tự động fallback nếu Redis unavailable

### Vercel Deployment Issues
- **Function timeout**: Crawler optimized cho serverless
- **Environment variables**: Ensure Redis vars are set properly
- **Cold starts**: First request có thể chậm, subsequent requests fast

### Empty Data Issues
- **No events showing**: Click "🎯 Dữ liệu mẫu" để load sample data
- **Cache expired**: Sử dụng crawl functionality để refresh
- **API errors**: Check `/api/cache/info` để xem cache status

## 🌍 Environment Variables

### Required for Production (Vercel)
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Optional
```bash
PORT=3000  # Local development port
NODE_ENV=production  # Auto-set by Vercel
```

## 🧪 Testing Redis Connection

```bash
# Test Redis connectivity
npm run test-redis

# Expected output:
# ✅ Redis connected successfully
# ✅ Data matches - Redis working correctly!
# 💡 Your app is ready for Vercel deployment!
```

## 📝 TODO / Future Enhancements

- [ ] Real-time updates với WebSocket
- [ ] Export data to CSV/Excel
- [ ] Advanced filtering (date range, tournament)
- [ ] Team/Player statistics
- [ ] Dark/Light theme toggle
- [ ] Database integration (PostgreSQL on Vercel)
- [ ] User preferences và favorites
- [ ] Push notifications cho live matches
- [ ] CDN cho images
- [ ] Rate limiting cho API
- [ ] Background jobs cho scheduled crawling

## 🚀 Performance & Architecture

### Serverless Optimizations
- **No file operations**: 100% Redis-based storage
- **Smart caching**: TTL-based với auto-refresh
- **Merged data**: Deduplicated events across crawls  
- **Fast cold starts**: Optimized imports và initialization
- **Graceful fallbacks**: Local cache khi Redis unavailable

### Caching Strategy
- **Events**: 5-minute TTL, auto-merge new data
- **Leagues**: 10-minute TTL, extracted từ events
- **Stats**: 2-minute TTL, computed on-demand
- **Auto-invalidation**: Smart cache clearing

### Vercel Benefits
- **Global edge**: Low latency worldwide
- **Auto-scaling**: Handle traffic spikes
- **Zero config**: Deploy với single command
- **Environment**: Production-ready security

## � Admin Panel Usage

### 1. Truy cập Admin Panel
```bash
# Local development
http://localhost:3000/admin

# Production
https://your-domain.vercel.app/admin
```

### 2. Đăng nhập
- **Username**: Cấu hình trong `ADMIN_USERNAME` (mặc định: `admin`)
- **Password**: Cấu hình trong `ADMIN_PASSWORD` (mặc định: `admin123`)
- **Session**: Tự động hết hạn sau 24 giờ

### 3. Quản lý Banner
- **Banner 1 & Banner 2**: 2 nhóm banner riêng biệt
- **Thêm banner**: Nhập Image URL và Link URL
- **Xóa banner**: Click nút "Xóa" trên từng banner
- **Lưu trữ**: Permanent trong Redis (key: `banner1`, `banner2`)

### 4. Quản lý Video
- **YouTube URL**: Nhập link video YouTube bất kỳ
- **Auto-embed**: Tự động tạo embed URL cho website
- **Lưu trữ**: Permanent trong Redis (key: `video_frame`)

### 5. Hiển thị trên Website
- **Banner API**: `GET /api/banners` - Lấy tất cả banners
- **Video API**: `GET /api/video` - Lấy video hiện tại
- **Public access**: Không cần authentication

## �🔧 Development Commands

```bash
# Development
npm run dev          # Start với nodemon
npm start           # Production start
npm run test-redis  # Test Redis connection

# Deployment
vercel              # Deploy to Vercel
vercel --prod       # Production deployment
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License. 