// Tệp: D:\GR2\be\middlewares\auth.js

const jwt = require('jsonwebtoken');

// Middleware kiểm tra token chung (xác thực)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy phần token

    if (token == null) {
        return res.status(401).json({ message: 'Chưa xác thực (Không có token)' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
        if (err) {
            return res.status(403).json({ message: 'Xác thực thất bại (Token không hợp lệ)' });
        }
        
        // Gắn thông tin user (payload) vào request để các route sau sử dụng
        req.user = userPayload; // user sẽ chứa { userId, username, role }
        next();
    });
};

// Middleware kiểm tra vai trò Admin (phân quyền)
const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Không có quyền Admin' });
    }
};

// Middleware kiểm tra vai trò Nhân viên
const isEmployee = (req, res, next) => {
    if (req.user.role === 'employee') {
        next();
    } else {
        res.status(403).json({ message: 'Không có quyền Nhân viên' });
    }
};

// Middleware kiểm tra Admin hoặc Nhân viên
const isAdminOrEmployee = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'employee') {
        next();
    } else {
        res.status(403).json({ message: 'Không có quyền truy cập' });
    }
};

// Middleware kiểm tra Khách hàng
const isCustomer = (req, res, next) => {
    if (req.user.role === 'customer') {
        next();
    } else {
        res.status(403).json({ message: 'Chức năng này chỉ dành cho khách hàng' });
    }
};

module.exports = {
    authenticateToken,
    isAdmin,
    isEmployee,
    isAdminOrEmployee,
    isCustomer
};