// Tệp: D:\GR2\be\models\order.js (TẠO MỚI)

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: { // Người khách hàng đã đặt
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: { // Sản phẩm "cha" 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        
        // Lưu thông tin của biến thể đã chọn
        variant: {
            _id: { type: mongoose.Schema.Types.ObjectId }, 
            name: { type: String, required: true }, // Tên biến thể 
            price: { type: Number, required: true }, // Giá của biến thể đó
            unit: { type: String, required: true } // Đơn vị của biến thể đó
        },

        quantity: { // Số lượng khách mua 
            type: Number,
            required: true,
            min: 0.1 // Cho phép mua số lượng lẻ như 0.5kg
        }
    }],
    total: { // Tổng giá trị đơn hàng
        type: Number,
        required: true
    },
    shippingAddress: { // Thông tin giao hàng
        name: { type: String, required: true },
        address: { type: String, required: true },
        phone: { type: String, required: true }
    },
    status: { // Trạng thái đơn hàng (theo đề cương)
        type: String,
        enum: ['Đang xử lý', 'Đang giao hàng', 'Hoàn thành', 'Đã hủy', 'Hoàn trả'],
        default: 'Đang xử lý'
    },
    paymentMethod: { // Phương thức thanh toán 
        type: String,
        enum: ['COD', 'Online'],
        required: true,
        default: 'COD'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);