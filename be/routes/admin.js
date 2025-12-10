// routes/admin.js

const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Category = require('../models/category');
const Order = require('../models/order');
const User = require('../models/user');
const Notification = require('../models/notification');
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

// ================== ÁP DỤNG AUTH CHO TOÀN BỘ ROUTE ADMIN ==================
router.use(authenticateToken);

// ================== THỐNG KÊ (Chỉ Admin) ==================
router.get('/statistics', isAdmin, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        const totalOrders = await Order.countDocuments();
        const totalEmployees = await User.countDocuments({ role: 'employee' });
        const revenueAgg = await Order.aggregate([
            { $match: { status: 'completed' } },
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

// ================== QUẢN LÝ SẢN PHẨM ==================

// Danh sách + tìm kiếm sản phẩm
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

// Thêm sản phẩm
router.post('/products', isAdminOrEmployee, productUpload.single('image'), async (req, res) => {
    try {
        const { name, description, categoryId, variants, type } = req.body;
        
        if (!name || !description || !categoryId || !variants || !req.file) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: 'Vui lòng điền đủ thông tin.' });
        }

        const newProduct = new Product({
            name,
            description,
            category: categoryId,
            type,
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

// Chi tiết 1 sản phẩm
router.get('/products/:id', isAdminOrEmployee, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category').lean();
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Cập nhật sản phẩm
router.put('/products/:id', isAdminOrEmployee, productUpload.single('image'), async (req, res) => {
    try {
        const { name, description, categoryId, variants, type } = req.body;
        const updates = {
            name,
            description,
            category: categoryId,
            type,
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

// Xóa sản phẩm (chỉ Admin)
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
//lấy danh sách chủng loại.
router.get('/product-types', isAdminOrEmployee, async (req, res) => {
  try {
    const types = await Product.distinct('type');
    res.json(types.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// ================== QUẢN LÝ ĐƠN HÀNG (CƠ BẢN) ==================

// Danh sách đơn hàng
router.get('/orders', isAdminOrEmployee, async (req, res) => {
    try {
        let filter = {};
        const { q, status } = req.query; 

        if (status && status !== 'all') {
            // Chỉ nhận các trạng thái hợp lệ
            const validStatuses = ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'returned'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
            }
            filter.status = status;
        }
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

// ================== QUẢN LÝ ĐƠN HÀNG NÂNG CAO ==================

// Tạo đơn hàng thủ công (Admin + Nhân viên)
router.post('/orders', isAdminOrEmployee, async (req, res) => {
    try {
        const { customerId, shippingAddress, items, discountAmount, shippingFee, paymentMethod, status } = req.body || {};

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Đơn hàng phải có ít nhất 1 sản phẩm.' });
        }

        // Nhân viên chỉ được tạo đơn ở trạng thái "pending"
        if (req.user.role === 'employee' && status && status !== 'pending') {
            return res.status(403).json({ message: 'Nhân viên chỉ được tạo đơn ở trạng thái pending.' });
        }

        // Lấy thông tin khách hàng nếu có customerId
        let customer = null;
        if (customerId) {
            customer = await User.findById(customerId);
            if (!customer) return res.status(400).json({ message: 'Khách hàng không tồn tại.' });
        }

        // Build items từ DB để đảm bảo đúng giá / variant
        const builtItems = [];
        let itemsTotal = 0;

        for (const it of items) {
            const { productId, variantId, quantity } = it || {};
            if (!productId || !variantId || !quantity) {
                return res.status(400).json({ message: 'Thiếu productId / variantId / quantity trong items.' });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(400).json({ message: `Sản phẩm không tồn tại: ${productId}` });
            }
            const variant = product.variants.id(variantId);
            if (!variant) {
                return res.status(400).json({ message: `Biến thể không tồn tại trên sản phẩm: ${product.name}` });
            }

            const qty = Number(quantity) || 0;
            if (qty <= 0) {
                return res.status(400).json({ message: 'Số lượng phải lớn hơn 0.' });
            }

            const unitPrice = Number(variant.price) || 0;
            const lineTotal = unitPrice * qty;
            itemsTotal += lineTotal;

            builtItems.push({
                product: product._id,
                variant: {
                    _id: variant._id,
                    name: variant.name,
                    price: unitPrice,
                    unit: variant.unit
                },
                quantity: qty
            });
        }

        const shipFee = Number(shippingFee) || 0;
        const discount = Number(discountAmount) || 0;
        const total = Math.max(itemsTotal + shipFee - discount, 0);

        const orderData = {
            customer: customer ? customer._id : null,
            items: builtItems,
            total,
            shippingAddress: shippingAddress || (customer ? {
                name: customer.username,
                phone: customer.phone,
                address: customer.address
            } : null),
            paymentMethod: paymentMethod || 'COD',
            status: status || (req.user.role === 'employee' ? 'pending' : 'pending'),
            // Các field này nếu schema Order có sẽ được lưu, không có thì Mongoose bỏ qua
            discountAmount: discount,
            shippingFee: shipFee,
            createdBy: req.user.userId
        };

        const newOrder = await Order.create(orderData);
        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Tạo đơn thủ công lỗi:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo đơn hàng.', error: error.message });
    }
});

// Sửa chi tiết đơn (Admin + Nhân viên)
router.put('/orders/:id', isAdminOrEmployee, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        const isEmployee = req.user.role === 'employee';
        const isPending = order.status === 'pending';

        // Nếu là nhân viên và đơn KHÔNG phải pending -> chỉ cho sửa thông tin khách + note
        if (isEmployee && !isPending) {
            const { shippingAddress, note } = req.body || {};

            if (shippingAddress) {
                order.shippingAddress = {
                    ...(order.shippingAddress || {}),
                    ...shippingAddress
                };
            }
            if (note !== undefined) {
                order.note = note;
            }

            await order.save();
            return res.json(order);
        }

        // Admin hoặc nhân viên chỉnh đơn Nháp: cho phép chỉnh full
        const { items, shippingAddress, discountAmount, shippingFee, paymentMethod, status, note } = req.body || {};

        // Cập nhật items nếu truyền lên
        if (items && Array.isArray(items) && items.length > 0) {
            const builtItems = [];
            let itemsTotal = 0;

            for (const it of items) {
                const { productId, variantId, quantity } = it || {};
                if (!productId || !variantId || !quantity) {
                    return res.status(400).json({ message: 'Thiếu productId / variantId / quantity trong items.' });
                }

                const product = await Product.findById(productId);
                if (!product) {
                    return res.status(400).json({ message: `Sản phẩm không tồn tại: ${productId}` });
                }
                const variant = product.variants.id(variantId);
                if (!variant) {
                    return res.status(400).json({ message: `Biến thể không tồn tại trên sản phẩm: ${product.name}` });
                }

                const qty = Number(quantity) || 0;
                if (qty <= 0) {
                    return res.status(400).json({ message: 'Số lượng phải lớn hơn 0.' });
                }

                const unitPrice = Number(variant.price) || 0;
                const lineTotal = unitPrice * qty;
                itemsTotal += lineTotal;

                builtItems.push({
                    product: product._id,
                    variant: {
                        _id: variant._id,
                        name: variant.name,
                        price: unitPrice,
                        unit: variant.unit
                    },
                    quantity: qty
                });
            }

            order.items = builtItems;

            const shipFee = shippingFee !== undefined ? Number(shippingFee) : Number(order.shippingFee || 0);
            const discount = discountAmount !== undefined ? Number(discountAmount) : Number(order.discountAmount || 0);

            order.shippingFee = shipFee;
            order.discountAmount = discount;
            order.total = Math.max(itemsTotal + shipFee - discount, 0);
        }

        // Cập nhật các field khác
        if (shippingAddress) {
            order.shippingAddress = {
                ...(order.shippingAddress || {}),
                ...shippingAddress
            };
        }
        if (paymentMethod) order.paymentMethod = paymentMethod;
        if (note !== undefined) order.note = note;

        // Cập nhật trạng thái (không cho nhân viên set Hủy/Hoàn trả)
        if (status) {
            // Chỉ admin được chuyển sang cancelled hoặc returned
            if (isEmployee && (status === 'cancelled' || status === 'returned')) {
                return res.status(403).json({ message: 'Nhân viên không có quyền hủy/hoàn trả đơn.' });
            }
            // Chỉ cho phép chuyển trạng thái hợp lệ
            const validStatuses = ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'returned'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
            }
            order.status = status;
        }

        await order.save();
        res.json(order);
    } catch (error) {
        console.error('Cập nhật đơn hàng lỗi:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật đơn hàng.', error: error.message });
    }
});

// Lấy chi tiết 1 đơn hàng
router.get('/orders/:id', isAdminOrEmployee, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'username email phone')
            .populate('items.product', 'name image')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        res.json(order);
    } catch (error) {
        console.error('Lỗi lấy chi tiết đơn hàng:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Cập nhật trạng thái đơn (giữ route cũ cho FE nếu đang dùng)
router.put('/orders/:id/status', isAdminOrEmployee, async (req, res) => {
    try {
        const { status } = req.body;
        console.log(`\n🔄 PUT /orders/:id/status - OrderID: ${req.params.id}, NewStatus: ${status}`);
        
        // Chỉ admin được chuyển sang cancelled hoặc returned
        if (req.user.role === 'employee' && (status === 'cancelled' || status === 'returned')) {
            return res.status(403).json({ message: 'Nhân viên không có quyền hủy/hoàn trả đơn.' });
        }
        // Chỉ cho phép chuyển trạng thái hợp lệ
        const validStatuses = ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'returned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        
        console.log(`✅ Order updated. Customer ID: ${updatedOrder.customer}`);
        
        // Tạo thông báo cho khách hàng
        const statusLabels = {
            'pending': 'Chờ xác nhận',
            'processing': 'Đang xử lý',
            'shipping': 'Đang vận chuyển',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy',
            'returned': 'Đã hoàn trả'
        };
        const message = `Đơn hàng #${updatedOrder._id.toString().slice(-8).toUpperCase()} đã chuyển sang trạng thái "${statusLabels[status] || status}".`;
        
        try {
            console.log(`📢 Tạo notification cho user: ${updatedOrder.customer}`);
            console.log(`   Message: ${message}`);
            
            const noti = await Notification.create({
                user: updatedOrder.customer,
                type: 'order',
                message: message,
                orderId: updatedOrder._id
            });
            console.log('✅ Notification created:', noti._id);
        } catch (notiErr) {
            console.error('❌ Lỗi tạo notification:', notiErr.message);
            console.error('   Stack:', notiErr.stack);
        }
        
        // Broadcast event (có thể dùng socket.io sau)
        // io.to(updatedOrder.customer).emit('notificationUpdated');
        
        res.json(updatedOrder);
    } catch (error) {
        console.error('❌ Lỗi update status:', error.message);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Xóa đơn hàng (Chỉ Admin)
router.delete('/orders/:id', isAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        await order.deleteOne();
        res.json({ message: 'Đã xóa đơn hàng thành công.' });
    } catch (error) {
        console.error('Xóa đơn hàng lỗi:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa đơn hàng.', error: error.message });
    }
});

// ================== QUẢN LÝ DANH MỤC ==================

router.get('/categories', isAdmin, async (req, res) => {
    try {
        const categories = await Category.find({}).lean();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ================== QUẢN LÝ NGƯỜI DÙNG (User) ==================

// Danh sách user (trừ admin)
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

// Thêm nhân viên
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

// Cập nhật thông tin user + đổi role (Admin)
router.put('/users/:id', isAdmin, async (req, res) => {
    try {
        const { username, email, phone, address, avatar, role } = req.body || {};
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        const isTargetAdmin = user.role === 'admin';
        if (isTargetAdmin && role && role !== 'admin') {
            return res.status(400).json({ message: 'Không thể hạ quyền một tài khoản admin qua API này.' });
        }

        // Check trùng username/email nếu thay đổi
        if (username && username !== user.username) {
            const existU = await User.findOne({ username });
            if (existU) return res.status(400).json({ message: 'Username đã tồn tại.' });
            user.username = username;
        }
        if (email && email !== user.email) {
            const existE = await User.findOne({ email });
            if (existE) return res.status(400).json({ message: 'Email đã tồn tại.' });
            user.email = email;
        }

        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;
        if (avatar !== undefined) user.avatar = avatar;

        if (role && !isTargetAdmin) {
            const allowedRoles = ['admin', 'employee', 'customer'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ message: 'Role không hợp lệ.' });
            }
            user.role = role;
        }

        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        res.json(safeUser);
    } catch (error) {
        console.error('Cập nhật user lỗi:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật user.', error: error.message });
    }
});

// Xóa user (trừ admin)
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

// ================== QUẢN LÝ KHÁCH HÀNG (Admin + Nhân viên) ==================

// Danh sách khách hàng
router.get('/customers', isAdminOrEmployee, async (req, res) => {
    try {
        const { q } = req.query || {};
        const filter = { role: 'customer' };

        if (q) {
            filter.$or = [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } }
            ];
        }

        const customers = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        res.json(customers);
    } catch (error) {
        console.error('Lấy danh sách khách hàng lỗi:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Cập nhật thông tin khách hàng (Admin + Nhân viên)
router.put('/customers/:id', isAdminOrEmployee, async (req, res) => {
    try {
        const { username, email, phone, address, note } = req.body || {};
        const user = await User.findById(req.params.id);

        if (!user || user.role !== 'customer') {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }

        // Không can thiệp role ở đây
        if (username) user.username = username;
        if (email) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;
        if (note !== undefined) user.note = note; // nếu schema có field này

        await user.save();
        const safeUser = user.toObject();
        delete safeUser.password;

        res.json(safeUser);
    } catch (error) {
        console.error('Cập nhật khách hàng lỗi:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ================== QUẢN LÝ ĐÁNH GIÁ ==================

// Xem danh sách đánh giá của 1 sản phẩm
router.get('/products/:id/ratings', isAdminOrEmployee, async (req, res) => {
    try {
        const { minStars, isVerified } = req.query || {};
        const product = await Product.findById(req.params.id)
            .populate('ratings.userId', 'username avatar')
            .lean();

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        let ratings = product.ratings || [];

        if (minStars !== undefined) {
            const ms = Number(minStars) || 0;
            ratings = ratings.filter(r => (r.stars || 0) >= ms);
        }

        if (isVerified === 'true') {
            ratings = ratings.filter(r => r.isVerifiedPurchase);
        } else if (isVerified === 'false') {
            ratings = ratings.filter(r => !r.isVerifiedPurchase);
        }

        res.json({
            product: {
                _id: product._id,
                name: product.name,
                image: product.image
            },
            ratings
        });
    } catch (error) {
        console.error('Lấy đánh giá sản phẩm lỗi:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Xóa đánh giá của 1 sản phẩm (chỉ Admin)
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
