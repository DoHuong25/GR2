// models/order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Khách đặt hàng
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true   // nếu muốn cho phép đơn không có khách, có thể bỏ required
  },

  // Các dòng hàng trong đơn
  items: [{
    product: {  // Sản phẩm "cha"
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    // Lưu snapshot biến thể tại thời điểm đặt
    variant: {
      _id:   { type: mongoose.Schema.Types.ObjectId },
      name:  { type: String, required: true }, // Tên biến thể
      price: { type: Number, required: true }, // Giá của biến thể
      unit:  { type: String, required: true }  // Đơn vị (kg, con, gói...)
    },

    quantity: { // Số lượng mua
      type: Number,
      required: true,
      min: 0.1   // cho phép 0.5kg
    }
  }],

  // Tổng tiền sau khi đã cộng/trừ phí ship + giảm giá
  total: {
    type: Number,
    required: true
  },

  // Giảm giá trên đơn (nếu có)
  discountAmount: {
    type: Number,
    default: 0
  },

  // Phí vận chuyển
  shippingFee: {
    type: Number,
    default: 0
  },

  // Thông tin giao hàng
  shippingAddress: {
    name:    { type: String, required: true },
    address: { type: String, required: true },
    phone:   { type: String, required: true }
  },

  // Trạng thái đơn hàng
  status: {
    type: String,
    enum: [
      'pending',      // Chờ xác nhận
      'processing',   // Đang chuẩn bị hàng
      'shipping',     // Đang giao hàng
      'completed',    // Hoàn thành
      'cancelled',    // Đã hủy
      'returned',     // Hoàn trả/Hoàn tiền
    ],
    default: 'pending'
  },

  // Phương thức thanh toán
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online'],
    required: true,
    default: 'COD'
  },

  // Trạng thái thanh toán (cho online payment)
  paymentStatus: {
    type: String,
    enum: ['Chưa thanh toán', 'Chờ xác nhận', 'Đã xác nhận'],
    default: 'Chưa thanh toán'
  },

  // Thời gian xác nhận thanh toán
  paymentConfirmedAt: {
    type: Date,
    default: null
  },

  // Người tạo đơn (admin/nhân viên) – dùng cho đơn thủ công
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Ghi chú đơn hàng
  note: {
    type: String,
    trim: true
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
