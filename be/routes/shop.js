// Tệp: D:\GR2\be\routes\shop.js 

const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Category = require('../models/category');
const Order = require('../models/order');
const User = require('../models/user');
const { authenticateToken, isCustomer } = require('../middlewares/auth'); 
const { default: mongoose } = require('mongoose');

// HÀM HỖ TRỢ LOGIC

const updateCartTotal = (cart) => {
    cart.total = cart.items.reduce((sum, item) => 
        sum + (item.variant.price * item.quantity), 0
    );
    return cart;
};
const calculateAvgRating = (ratings) => {
    if (!ratings || ratings.length === 0) return 0;
    const totalStars = ratings.reduce((sum, rating) => sum + rating.stars, 0);
    return parseFloat((totalStars / ratings.length).toFixed(1));
};

// Middleware: Đảm bảo req.session.cart tồn tại
router.use((req, res, next) => {
    if (!req.session) {
        return res.status(500).json({ message: 'Lỗi server: Cấu hình session bị thiếu.' });
    }
    if (!req.session.cart) {
        req.session.cart = { items: [], total: 0 };
    }
    next();
});

// 1. API CÔNG KHAI (SHOP & SẢN PHẨM)

router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.get('/products', async (req, res) => {
    try {
        const { q, categoryId } = req.query; 
        let filter = {};
        if (q) filter.name = { $regex: q, $options: 'i' };
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) filter.category = categoryId;

        const products = await Product.find(filter)
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const productsWithInfo = products.map(p => ({
            ...p,
            avgRating: calculateAvgRating(p.ratings),
            reviewCount: p.ratings.length,
            minPrice: p.variants.length > 0 ? Math.min(...p.variants.map(v => v.price)) : null
        }));
        
        res.json(productsWithInfo);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name')
            .populate({ path: 'ratings.userId', select: 'username avatar' })
            .lean();

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }
        product.avgRating = calculateAvgRating(product.ratings);
        product.reviewCount = product.ratings.length;

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});



// 2. API GIỎ HÀNG (CART - TRẢ VỀ JSON CHO REACT)
// GET /api/shop/cart : Lấy thông tin giỏ hàng hiện tại
router.get('/cart', (req, res) => {
    res.json(req.session.cart);
});

// POST /api/shop/cart : Thêm sản phẩm vào giỏ
router.post('/cart', async (req, res) => {
    const { productId, variantId, quantity } = req.body;
    if (!productId || !variantId || !quantity || parseFloat(quantity) <= 0) {
         return res.status(400).json({ message: 'Thiếu thông tin sản phẩm.' });
    }
    
    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại.' });

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) return res.status(404).json({ message: 'Biến thể không tồn tại.' });

        const newItem = {
            product: { _id: product._id.toString(), name: product.name, image: product.image },
            variant: { _id: variant._id.toString(), name: variant.name, price: variant.price, unit: variant.unit },
            quantity: parseFloat(quantity)
        };

        const existingItemIndex = req.session.cart.items.findIndex(item => 
            item.product._id === productId && item.variant._id === variantId
        );

        if (existingItemIndex > -1) {
            req.session.cart.items[existingItemIndex].quantity += newItem.quantity;
        } else {
            req.session.cart.items.push(newItem);
        }
        
        updateCartTotal(req.session.cart);
        res.status(200).json({ message: 'Thêm sản phẩm vào giỏ hàng thành công!', cart: req.session.cart });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thêm vào giỏ hàng', error: error.message });
    }
});

// PUT /api/shop/cart : Cập nhật số lượng/Xóa item
router.put('/cart', (req, res) => {
    const { itemIndex, quantity } = req.body;
    const index = parseInt(itemIndex);
    const newQuantity = parseFloat(quantity);

    if (isNaN(index) || index < 0 || index >= req.session.cart.items.length) {
        return res.status(400).json({ message: 'Item index không hợp lệ.' });
    }

    if (newQuantity <= 0) {
        req.session.cart.items.splice(index, 1); 
    } else {
        req.session.cart.items[index].quantity = newQuantity;
    }
    
    updateCartTotal(req.session.cart);
    res.status(200).json({ message: 'Cập nhật giỏ hàng thành công!', cart: req.session.cart });
});

// DELETE /api/shop/cart/:index : Xóa một item theo index
router.delete('/cart/:index', (req, res) => {
    const index = parseInt(req.params.index);
    
    if (isNaN(index) || index < 0 || index >= req.session.cart.items.length) {
        return res.status(400).json({ message: 'Item index không hợp lệ.' });
    }

    req.session.cart.items.splice(index, 1);
    updateCartTotal(req.session.cart);

    res.status(200).json({ message: 'Xóa sản phẩm khỏi giỏ hàng thành công!', cart: req.session.cart });
});


// 3. API YÊU CẦU ĐĂNG NHẬP (PROFILE & CHECKOUT)

router.use(authenticateToken); // Yêu cầu token cho các route bên dưới

// POST /api/shop/checkout : Hoàn tất Đặt hàng
router.post('/checkout', isCustomer, async (req, res) => {
    if (req.session.cart.items.length === 0) {
        return res.status(400).json({ message: 'Giỏ hàng trống, không thể đặt hàng.' });
    }

    try {
        const { name, phone, address, paymentMethod } = req.body;
        
        const orderItems = req.session.cart.items.map(item => ({
            product: item.product._id, 
            variant: item.variant,     
            quantity: item.quantity
        }));
        const total = req.session.cart.total;

        const newOrder = new Order({
            customer: req.user.userId,
            items: orderItems,
            total,
            shippingAddress: { name, phone, address },
            paymentMethod: paymentMethod
        });

        await newOrder.save();
        req.session.cart = { items: [], total: 0 }; 

        res.status(201).json({ message: 'Đặt hàng thành công!', orderId: newOrder._id }); 

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi đặt hàng', error: error.message });
    }
});

// GET /api/shop/profile : Lấy thông tin cá nhân (và lịch sử đơn hàng)
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

        const orders = await Order.find({ customer: req.user.userId })
            .populate('items.product', 'name image') 
            .sort({ createdAt: -1 })
            .lean();

        res.json({ user, orders }); // Trả về JSON cho React
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// PUT /api/shop/profile : Cập nhật thông tin cá nhân
router.put('/profile', async (req, res) => {
    try {
        const { email, phone, address, bio } = req.body;
        
        const updates = { email, phone, address, bio };

        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!updatedUser) return res.status(404).json({ message: 'Người dùng không tìm thấy' });
        
        res.json(updatedUser); 
    } catch (error) {
        if (error.code === 11000) {
             return res.status(400).json({ message: 'Email đã tồn tại.' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/shop/products/:id/rate : Đăng đánh giá sản phẩm
router.post('/products/:id/rate', isCustomer, async (req, res) => {
    try {
        const { stars, comment } = req.body;
        const productId = req.params.id;
        const userId = req.user.userId;

        const hasPurchased = await Order.findOne({
            customer: userId,
            status: 'Hoàn thành', 
            'items.product': productId 
        });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

        const existingRating = product.ratings.find(r => r.userId.toString() === userId);
        if (existingRating) {
             return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi.' });
        }

        const newRating = {
            userId: userId,
            stars: stars,
            comment: comment,
            isVerifiedPurchase: !!hasPurchased 
        };

        product.ratings.push(newRating);
        await product.save();
        res.status(201).json({ message: 'Đánh giá thành công!', rating: newRating });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


module.exports = router;