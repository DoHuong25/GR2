// Tệp: D:\GR2\be\app.js

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); 
const session = require('express-session'); // <<< THÊM: Quản lý session (cho giỏ hàng)
require('dotenv').config();

const app = express();

// KẾT NỐI MONGODB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(' Kết nối CSDL gr2 thành công'))
    .catch(err => console.error(' Lỗi kết nối MongoDB:', err)); 

// MIDDLEWARE 
// 1. Kích hoạt CORS
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true // Quan trọng để gửi Cookie/Session ID
})); 

// 2. Cấu hình Session
app.use(session({
    secret: process.env.JWT_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,
        // sameSite: 'lax', 
        // secure: false 
    }
}));

// 3. Middleware để parse body
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// 4. Phục vụ file tĩnh (ảnh sản phẩm/avatar)
app.use(express.static(path.join(__dirname, 'public')));


// IMPORT MODELS VÀ ROUTES
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const Category = require('./models/category'); 

//  MOUNT ROUTES (THÊM /api) 
app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);

// Tự động tạo  danh mục 
(async () => {
    try {
        // Danh sách các danh mục cần đảm bảo tồn tại
        const requiredCategories = ['Hải sản Tươi', 'Hải sản Khô', 'Hải sản Đông lạnh']; 
        
        // Tìm các danh mục đã có
        const existingCats = await Category.find({ name: { $in: requiredCategories } }).select('name');
        const existingNames = existingCats.map(c => c.name);

        // Lọc ra các danh mục cần tạo mới
        const newCats = requiredCategories
            .filter(name => !existingNames.includes(name))
            .map(name => ({ name }));

        if (newCats.length > 0) {
            await Category.insertMany(newCats);
            console.log(` Đã tự động tạo ${newCats.length} danh mục mới: ${newCats.map(c => c.name).join(', ')}.`);
        }

    } catch (error) {
        if (error.code !== 11000) {
            console.error('Lỗi khi tạo danh mục:', error.message);
        }
    }
})();

// XỬ LÝ LỖI 
app.use((req, res, next) => {
    res.status(404).json({ message: '404 - API Endpoint không tìm thấy!' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: '500 - Đã xảy ra lỗi server nội bộ!' });
});

// KHỞI ĐỘNG SERVER 
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(` API Server đang chạy tại http://localhost:${PORT}`);
});