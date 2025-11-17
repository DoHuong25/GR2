//routes\admin.js 

const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Category = require('../models/category');
const Order = require('../models/order');
const User = require('../models/user');
const { authenticateToken, isAdmin, isAdminOrEmployee } = require('../middlewares/auth'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình Multer cho ảnh sản phẩm
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './public/images/products';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const productUpload = multer({ storage: productStorage });


// API CHO ADMIN & EMPLOYEE 
router.use(authenticateToken);

//  THỐNG KÊ (Chỉ Admin) 
router.get('/statistics', isAdmin, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        const totalOrders = await Order.countDocuments();
        const totalEmployees = await User.countDocuments({ role: 'employee' });
        const revenueAgg = await Order.aggregate([
            { $match: { status: 'Hoàn thành' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
        ]);
        
        res.json({
            totalProducts,
            totalCustomers,
            totalOrders,
            totalEmployees,
            totalRevenue: revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


// QUẢN LÝ SẢN PHẨM

router.get('/products', isAdminOrEmployee, async (req, res) => {
    try {
        let filter = {};
        const { q } = req.query; 
        if (q) filter.name = { $regex: q, $options: 'i' };

        const products = await Product.find(filter)
                                .populate('category', 'name')
                                .populate('createdBy', 'username')
                                .sort({ createdAt: -1 })
                                .lean();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.post('/products', isAdminOrEmployee, productUpload.single('image'), async (req, res) => {
    try {
        const { name, description, categoryId, variants } = req.body;
        
        if (!name || !description || !categoryId || !variants || !req.file) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: 'Vui lòng điền đủ thông tin.' });
        }

        const newProduct = new Product({
            name,
            description,
            category: categoryId,
            image: '/images/products/' + req.file.filename,
            variants: JSON.parse(variants),
            createdBy: req.user.userId
        });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        if (req.file) fs.unlink(req.file.path, () => {});
        if (error.code === 11000) {
             return res.status(400).json({ message: 'Tên sản phẩm đã tồn tại.' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.get('/products/:id', isAdminOrEmployee, async (req, res) => {
     try {
        const product = await Product.findById(req.params.id).populate('category').lean();
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.put('/products/:id', isAdminOrEmployee, productUpload.single('image'), async (req, res) => {
    try {
        const { name, description, categoryId, variants } = req.body;
        const updates = {
            name,
            description,
            category: categoryId,
            variants: JSON.parse(variants)
        };

        if (req.file) {
            updates.image = '/images/products/' + req.file.filename;
            
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!updatedProduct) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.delete('/products/:id', isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        
        if (product.image) {
            fs.unlink(path.join(__dirname, '../public', product.image), () => {});
        }
        await product.deleteOne(); 
        res.json({ message: 'Xóa sản phẩm thành công.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


//  QUẢN LÝ ĐƠN HÀNG 

router.get('/orders', isAdminOrEmployee, async (req, res) => {
    try {
        let filter = {};
        const { q, status } = req.query; 

        if (status && status !== 'all') filter.status = status;
        if (q) {
            filter['$or'] = [
                { 'shippingAddress.phone': { $regex: q, $options: 'i' } },
                { 'shippingAddress.name': { $regex: q, $options: 'i' } }
            ];
        }

        const orders = await Order.find(filter)
            .populate('customer', 'username email')
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.put('/orders/:id/status', isAdminOrEmployee, async (req, res) => {
    try {
        const { status } = req.body;
        if (req.user.role === 'employee' && (status === 'Đã hủy' || status === 'Hoàn trả')) {
             return res.status(403).json({ message: 'Nhân viên không có quyền hủy đơn.' });
        }
        
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


// === QUẢN LÝ DANH MỤC ===

router.get('/categories', isAdmin, async (req, res) => {
    try {
        const categories = await Category.find({}).lean();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


// === QUẢN LÝ NGƯỜI DÙNG ===

router.get('/users', isAdmin, async (req, res) => {
    try {
        const { q, role } = req.query;
        let filter = { role: { $ne: 'admin' } }; 

        if (q) {
            filter.$or = [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ];
        }
        if (role && role !== 'all') {
            filter.role = role;
        }

        const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.post('/users/add-employee', isAdmin, async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        const userExist = await User.findOne({ $or: [{ username }, { email }] });
        if (userExist) {
            return res.status(400).json({ message: 'Tên người dùng hoặc email đã tồn tại.' });
        }

        const newEmployee = new User({
            username,
            password, 
            email,
            role: 'employee'
        });
        await newEmployee.save();
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role === 'admin') {
             return res.status(403).json({ message: 'Không thể xóa tài khoản này.' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Xóa người dùng thành công.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.delete('/products/:productId/ratings/:ratingId', isAdmin, async (req, res) => {
    try {
        const { productId, ratingId } = req.params;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }
        product.ratings.pull(ratingId);
        await product.save();
        res.json({ message: 'Xóa đánh giá thành công.' });
    } catch (error) {
         res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;