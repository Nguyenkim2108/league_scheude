# LoL Esports Schedule - Bootstrap Update

Dự án lịch thi đấu League of Legends Esports đã được cập nhật với Bootstrap 5 để cải thiện UI/UX và responsive design.

## 🆕 Cập nhật mới

### ✨ UI/UX Improvements
- **Bootstrap 5**: Chuyển từ CSS thuần sang Bootstrap 5 framework
- **Responsive Design**: Layout tự động thích ứng với mọi thiết bị
- **Better Banner Positioning**: 
  - Desktop: Banner ở hai bên trái/phải (sticky)
  - Tablet: Banner xếp ngang ở trên cùng
  - Mobile: Banner xếp dọc ở trên cùng

### 📱 Responsive Layout
- **Desktop (≥992px)**: Layout 3 cột với banner sticky ở hai bên
- **Tablet (768px-991px)**: Banner xếp ngang 2 cột ở trên
- **Mobile (<768px)**: Banner xếp dọc, layout tối ưu cho mobile

### 🎨 Design Improvements
- Sử dụng Bootstrap Grid System
- Card components với shadow effects
- Better button styling
- Improved typography và spacing
- Enhanced loading states

## 🚀 Chạy dự án

```bash
npm install
npm start
```

Server sẽ chạy tại: http://localhost:3000

## 📂 Files đã cập nhật

- `public/index.html`: Layout mới với Bootstrap
- `public/app.js`: Cập nhật classes và rendering logic
- `public/custom.css`: Custom CSS để override Bootstrap
- `README.md`: Tài liệu cập nhật

## 🔧 Tính năng chính

1. **Hiển thị lịch thi đấu**: Tự động load events theo ngày
2. **Responsive banners**: Hiển thị phù hợp trên mọi thiết bị  
3. **Video streaming**: Hỗ trợ embed video live stream
4. **Admin panel**: Quản lý banners và video
5. **Redis caching**: Cache dữ liệu để tăng performance

## 💡 Cải thiện UI

### Banner Layout
- **Desktop**: Sticky banners ở hai bên, không cản trở nội dung chính
- **Mobile/Tablet**: Banners hiển thị ở đầu trang, dễ xem và tương tác

### Event Cards
- Design modern với Bootstrap cards
- Better team info layout
- Responsive team vs team display
- Clear match status indicators

### Navigation
- Smooth scrolling
- Better loading states
- Improved button feedback

## 🎯 Browsers hỗ trợ

- Chrome/Edge: Tốt nhất
- Firefox: Tốt
- Safari: Tốt
- Mobile browsers: Được tối ưu

## 🔄 Migration Notes

Nếu bạn có custom CSS cũ, hãy kiểm tra file `custom.css` để đảm bảo tương thích với Bootstrap classes mới.
