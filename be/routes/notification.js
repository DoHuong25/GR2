// routes/notification.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const { authenticateToken } = require('../middlewares/auth');

// Lấy danh sách thông báo của user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Đánh dấu một thông báo là đã đọc
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const noti = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { isRead: true },
      { new: true }
    );
    if (!noti) return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    res.json(noti);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Đánh dấu tất cả thông báo là đã đọc
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa một thông báo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const noti = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });
    if (!noti) return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    res.json({ message: 'Đã xóa thông báo.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa tất cả thông báo
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.userId });
    res.json({ message: 'Đã xóa tất cả thông báo.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;
