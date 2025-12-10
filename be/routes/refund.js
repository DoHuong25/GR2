// routes/refund.js
const express = require('express');
const router = express.Router();
const Refund = require('../models/refund');
const Order = require('../models/order');
const Notification = require('../models/notification');
const { authenticateToken, isAdmin } = require('../middlewares/auth');

// User gửi thông tin ngân hàng cho hoàn tiền
router.post('/:orderId/bank-info', authenticateToken, async (req, res) => {
  try {
    const { accountNumber, bankName, accountHolder } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    // Chỉ chủ đơn hàng mới gửi thông tin
    if (order.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Không có quyền.' });
    }
    let refund = await Refund.findOne({ order: order._id });
    if (!refund) {
      refund = await Refund.create({
        order: order._id,
        user: req.user.userId,
        amount: order.total,
        bankInfo: { accountNumber, bankName, accountHolder },
        status: 'pending'
      });
    } else {
      refund.bankInfo = { accountNumber, bankName, accountHolder };
      await refund.save();
    }
    // Tạo thông báo cho admin
    await Notification.create({
      user: null, // Có thể gửi cho tất cả admin hoặc từng admin
      type: 'refund',
      message: `Yêu cầu hoàn tiền cho đơn hàng #${order._id} đã có thông tin ngân hàng.`,
      orderId: order._id,
      refundId: refund._id
    });
    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Admin xác nhận hoàn tiền
router.post('/:refundId/complete', authenticateToken, isAdmin, async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.refundId);
    if (!refund) return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền.' });
    refund.status = 'completed';
    refund.adminNote = req.body.adminNote || '';
    await refund.save();
    // Thông báo cho user
    await Notification.create({
      user: refund.user,
      type: 'refund',
      message: `Yêu cầu hoàn tiền cho đơn hàng #${refund.order} đã được admin xác nhận hoàn tiền.`,
      orderId: refund.order,
      refundId: refund._id
    });
    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// User xác nhận đã nhận tiền
router.post('/:refundId/confirm', authenticateToken, async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.refundId);
    if (!refund) return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền.' });
    if (refund.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Không có quyền.' });
    }
    refund.status = 'confirmed';
    await refund.save();
    // Thông báo cho admin
    await Notification.create({
      user: null, // Có thể gửi cho tất cả admin hoặc từng admin
      type: 'refund',
      message: `Khách hàng đã xác nhận nhận tiền hoàn cho đơn hàng #${refund.order}.`,
      orderId: refund.order,
      refundId: refund._id
    });
    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Admin lấy danh sách hoàn tiền
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const refunds = await Refund.find({}).sort({ createdAt: -1 }).lean();
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;
