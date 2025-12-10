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
        const { q, categoryId, type } = req.query;
        let filter = {};
        if (q) filter.name = { $regex: q, $options: 'i' };
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            filter.category = categoryId;
        }
        if (type) {
            filter.type = type; // 👈 lọc theo chủng loại
        }

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

// GET /api/shop/orders/:orderId : Lấy thông tin chi tiết một đơn hàng (PUBLIC - không cần auth)
router.get('/orders/:orderId', async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ.' });
        }

        const order = await Order.findById(orderId)
            .populate('customer', 'email phone')
            .populate('items.product', 'name image')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        res.json(order);

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


// 3. API YÊU CẦU ĐĂNG NHẬP (PROFILE & CHECKOUT)

router.use(authenticateToken); // Yêu cầu token cho các route bên dưới

// POST /api/shop/checkout : Hoàn tất Đặt hàng
router.post('/checkout', async (req, res) => {
    try {
        console.log('[CHECKOUT] req.body:', JSON.stringify(req.body));
        
        // Kiểm tra session/cart
        if (!req.session || !req.session.cart || !Array.isArray(req.session.cart.items)) {
            console.error('[CHECKOUT] Lỗi session/cart:', req.session);
            return res.status(500).json({ message: 'Lỗi server: Session hoặc giỏ hàng không hợp lệ.' });
        }
        if (!req.user || !req.user.userId) {
            console.error('[CHECKOUT] Lỗi user:', req.user);
            return res.status(401).json({ message: 'Bạn cần đăng nhập để đặt hàng.' });
        }
        if (req.session.cart.items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng trống, không thể đặt hàng.' });
        }

        const { name, phone, address, paymentMethod, selectedItems } = req.body;
        console.log('[CHECKOUT] paymentMethod:', paymentMethod, 'name:', name, 'phone:', phone, 'address:', address);
        
        if (!name || !phone || !address || !paymentMethod) {
            console.error('[CHECKOUT] Thiếu dữ liệu:', { name, phone, address, paymentMethod });
            return res.status(400).json({ message: 'Thiếu thông tin giao hàng hoặc phương thức thanh toán.' });
        }

        // Lọc chỉ lấy sản phẩm được chọn nếu có selectedItems
        let orderItems = req.session.cart.items;
        console.log('[CHECKOUT] selectedItems:', selectedItems);
        console.log('[CHECKOUT] cart items trước lọc:', JSON.stringify(orderItems.slice(0, 1)));
        
        if (selectedItems && typeof selectedItems === 'object') {
            orderItems = req.session.cart.items.filter((_, idx) => selectedItems[idx]);
        }
        console.log('[CHECKOUT] orderItems sau lọc:', JSON.stringify(orderItems.slice(0, 1)));
        
        if (!Array.isArray(orderItems) || orderItems.length === 0) {
            return res.status(400).json({ message: 'Vui lòng chọn ít nhất một sản phẩm.' });
        }

        // Kiểm tra từng item hợp lệ
        for (let i = 0; i < orderItems.length; i++) {
            const item = orderItems[i];
            console.log(`[CHECKOUT] Kiểm tra item ${i}:`, JSON.stringify(item));
            
            // Lấy product ID từ item (có thể là string hoặc object)
            const productId = item.product?._id || item.product;
            const variantPrice = item.variant?.price;
            const quantity = item.quantity;
            
            console.log(`[CHECKOUT] item ${i} - productId:`, productId, 'variantPrice:', variantPrice, 'quantity:', quantity);
            
            if (!productId || typeof variantPrice !== 'number' || !quantity) {
                console.error('[CHECKOUT] Lỗi item:', item);
                return res.status(400).json({ message: `Sản phẩm ${i + 1} trong giỏ hàng không hợp lệ.` });
            }
        }

        const total = orderItems.reduce((sum, item) => {
            const price = item.variant?.price || 0;
            const qty = item.quantity || 1;
            return sum + (price * qty);
        }, 0);
        const shippingFee = 30000; // Phí vận chuyển cố định 30.000đ
        const finalTotal = total + shippingFee;

        // Xác định trạng thái dựa trên phương thức thanh toán (sử dụng giá trị enum đúng)
        // Online (Chuyển khoản): pending - chờ admin xác nhận thanh toán
        // COD: pending - chờ admin xác nhận đơn hàng
        const status = 'pending';
        const paymentStatus = paymentMethod === 'Online' ? 'Chưa thanh toán' : 'Đã xác nhận';

        const newOrder = new Order({
            customer: req.user.userId,
            items: orderItems.map(item => {
                // Xử lý product ID - có thể là string hoặc object
                const productId = item.product?._id || item.product;
                return {
                    product: productId,
                    variant: item.variant,
                    quantity: item.quantity
                };
            }),
            total: finalTotal, // Tổng = giá sản phẩm + phí vận chuyển
            shippingAddress: { name, phone, address },
            paymentMethod: paymentMethod,
            status: status,
            paymentStatus: paymentStatus
        });

        console.log('[CHECKOUT] Tạo order:', JSON.stringify(newOrder, null, 2));
        await newOrder.save();
        console.log('[CHECKOUT] Order đã lưu, ID:', newOrder._id.toString());

        // Chỉ xóa sản phẩm được đặt khỏi giỏ hàng (giữ lại sản phẩm chưa chọn)
        if (selectedItems && typeof selectedItems === 'object') {
            req.session.cart.items = req.session.cart.items.filter((_, idx) => !selectedItems[idx]);
        } else {
            // Nếu không có selectedItems, xóa toàn bộ (mặc định cũ)
            req.session.cart.items = [];
        }
        updateCartTotal(req.session.cart);

        res.status(201).json({ 
            message: 'Đặt hàng thành công!', 
            orderId: newOrder._id,
            paymentMethod: paymentMethod,
            total: finalTotal, // Trả về tổng tiền có phí vận chuyển
            shippingFee: shippingFee
        });

        console.log('[CHECKOUT] newOrder:', newOrder._id.toString());
        console.log('[CHECKOUT] session.cart after checkout:', JSON.stringify(req.session.cart));

    } catch (error) {
        console.error('[CHECKOUT] Lỗi server:', error);
        res.status(500).json({ message: 'Lỗi server khi đặt hàng', error: error.message });
    }
});

// POST /api/shop/orders/:orderId/confirm-payment : Xác nhận thanh toán (cho phương thức Online)
router.post('/orders/:orderId/confirm-payment', authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ.' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        // Kiểm tra chủ sở hữu đơn hàng
        if (order.customer.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Bạn không có quyền xác nhận đơn hàng này.' });
        }

        // Chỉ cho phép xác nhận nếu đơn hàng có phương thức thanh toán Online
        if (order.paymentMethod !== 'Online') {
            return res.status(400).json({ message: 'Đơn hàng này không sử dụng phương thức Online.' });
        }

        // Chỉ cho phép xác nhận nếu đang ở trạng thái pending
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Đơn hàng không ở trạng thái có thể xác nhận thanh toán.' });
        }

        // Cập nhật trạng thái thanh toán
        order.paymentStatus = 'Đã xác nhận';
        order.paymentConfirmedAt = new Date();
        // Status vẫn là pending, chờ admin xác nhận đơn hàng chuyển sang processing
        await order.save();

        res.json({ 
            message: 'Xác nhận thanh toán thành công! Vui lòng chờ admin duyệt đơn hàng.', 
            order 
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/shop/orders/:orderId/cancel : Hủy đơn hàng (khách hàng)
router.post('/orders/:orderId/cancel', authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.orderId;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ.' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        // Kiểm tra chủ sở hữu đơn hàng
        if (order.customer.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Bạn không có quyền hủy đơn hàng này.' });
        }

        // Chỉ cho phép hủy khi đơn chưa được xử lý (pending hoặc processing)
        // Không được hủy khi đang giao hàng hoặc đã hoàn thành
        if (!['pending', 'processing'].includes(order.status)) {
            return res.status(400).json({ message: 'Đơn hàng không thể hủy ở trạng thái hiện tại. Chỉ có thể hủy khi đơn đang chờ xác nhận hoặc đang chuẩn bị.' });
        }

        // Trả lại sản phẩm vào giỏ hàng trong session
        if (!req.session.cart) req.session.cart = { items: [], total: 0 };
        order.items.forEach(it => {
            req.session.cart.items.push({
                product: { _id: it.product.toString(), name: it.product.name, image: it.product.image },
                variant: it.variant,
                quantity: it.quantity
            });
        });
        updateCartTotal(req.session.cart);

        order.status = 'cancelled';
        await order.save();

        res.json({ message: 'Đã hủy đơn hàng và trả sản phẩm về giỏ hàng.', order });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// GET /api/shop/profile : Lấy thông tin cá nhân (và lịch sử đơn hàng)
router.get('/profile', authenticateToken, async (req, res) => {
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
router.put('/profile', authenticateToken, async (req, res) => {
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
            status: 'completed',
            'items.product': productId
        });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

        if (!hasPurchased) {
            return res.status(403).json({ message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đã nhận hàng.' });
        }

        const existingRating = product.ratings.find(r => r.userId.toString() === userId);
        if (existingRating) {
            return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi.' });
        }

        const newRating = {
            userId: userId,
            stars: stars,
            comment: comment,
            isVerifiedPurchase: true
        };

        product.ratings.push(newRating);
        await product.save();
        res.status(201).json({ message: 'Đánh giá thành công!', rating: newRating });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


module.exports = router;