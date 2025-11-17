// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const router = express.Router();

const normEmail = (e) => String(e || '').trim().toLowerCase();
const isStrongPwd = (s) =>
  typeof s === 'string' &&
  s.length >= 6 && s.length <= 64 &&
  /[A-Za-z]/.test(s) && /\d/.test(s);

/* ============ REGISTER ============ */
router.post('/register', async (req, res) => {
  try {
    let { username, password, email, phone, address } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
    }
    if (!isStrongPwd(password)) {
      return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự và phải có ít nhất 1 chữ, 1 số.' });
    }

    email = normEmail(email);
    if (!username || !username.trim()) username = email.split('@')[0];

    const existed = await User.findOne({ $or: [{ username }, { email }] });
    if (existed) {
      return res.status(400).json({ message: 'Tên người dùng hoặc email đã tồn tại.' });
    }

    const newUser = new User({
      username, password, email, phone, address, role: 'customer'
    });

    await newUser.save(); // pre('save') sẽ hash password
    res.status(201).json({ message: 'Đăng ký thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đăng ký', error: error.message });
  }
});

/* ============ LOGIN (email hoặc username) ============ */
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;
    const key = (identifier || email || username || '').trim();

    if (!key || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin đăng nhập.' });
    }

    const user = await User.findOne({
      $or: [{ email: normEmail(key) }, { username: key }]
    });
    if (!user) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });

    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
      avatar: user.avatar
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ message: 'Đăng nhập thành công!', token, user: payload });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đăng nhập', error: error.message });
  }
});

module.exports = router;
