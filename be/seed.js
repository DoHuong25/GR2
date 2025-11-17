// D:\GR2\be\seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/user');
const Category = require('./models/category');
const Product = require('./models/product');

const MONGO_URI = process.env.MONGO_URI;

const ensureCategories = async () => {
  const names = ['Hải sản Tươi', 'Hải sản Khô', 'Hải sản Đông lạnh'];
  const existed = await Category.find({ name: { $in: names } });
  const existingNames = new Set(existed.map(c => c.name));
  const toCreate = names.filter(n => !existingNames.has(n)).map(n => ({ name: n }));

  if (toCreate.length) await Category.insertMany(toCreate);
  const final = await Category.find({ name: { $in: names } });

  const fresh = final.find(c => c.name === 'Hải sản Tươi');
  const dry   = final.find(c => c.name === 'Hải sản Khô');
  const frozen= final.find(c => c.name === 'Hải sản Đông lạnh');
  return { fresh, dry, frozen };
};

const sampleProducts = (freshId, dryId, frozenId, createdById) => ([
  {
    name: 'Tôm Sú Tự Nhiên',
    description: 'Tôm sú đánh bắt tự nhiên từ vùng biển Hải Tiến, thịt dai và ngọt.',
    image: '/images/products/tomsu.jpg',
    category: freshId,
    variants: [
      { name: 'Loại 1 (20-25 con/kg)', price: 450000, unit: 'kg' },
      { name: 'Loại 2 (30-35 con/kg)', price: 380000, unit: 'kg' },
    ],
    ratings: [{ userId: createdById, stars: 5, comment: 'Tôm tươi ngon, giao nhanh!', isVerifiedPurchase: true }],
    createdBy: createdById
  },
  {
    name: 'Mực Khô',
    description: 'Mực khô phơi trực tiếp tại biển Thanh Hóa, ngọt tự nhiên, loại A.',
    image: '/images/products/muckho.jpg',
    category: dryId,
    variants: [
      { name: 'Size Lớn (8-10 con/kg)', price: 2100000, unit: 'kg' },
      { name: 'Size Vừa (11-15 con/kg)', price: 1850000, unit: 'kg' },
      { name: 'Túi 500g', price: 425000, unit: 'gói' },
    ],
    ratings: [{ userId: createdById, stars: 5, comment: 'Nướng lên thơm lừng!', isVerifiedPurchase: true }],
    createdBy: createdById
  },
  {
    name: 'Cá Thu Đông Lạnh',
    description: 'Cá Thu tươi, cấp đông nhanh, tiện cho sốt cà, chiên, kho.',
    image: '/images/products/cathu.jpg',
    category: frozenId,
    variants: [
      { name: 'Gói 500g', price: 140000, unit: 'gói' },
      { name: 'Gói 1kg', price: 280000, unit: 'gói' },
    ],
    ratings: [],
    createdBy: createdById
  },
  {
    name: 'Cá Thu Nướng Lát',
    description: 'Nướng sơ, hút chân không, lý tưởng dự trữ.',
    image: '/images/products/cathunuong.jpg',
    category: dryId,
    variants: [
      { name: 'Gói 500g', price: 160000, unit: 'gói' },
      { name: 'Gói 1kg', price: 320000, unit: 'gói' },
    ],
    ratings: [],
    createdBy: createdById
  }
]);

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(' Kết nối CSDL thành công.');

    // 1) Đảm bảo đủ 3 danh mục
    const { fresh, dry, frozen } = await ensureCategories();
    if (!fresh || !dry || !frozen) {
      console.log(' Không tạo đủ 3 danh mục.');
      return;
    }

    // 2) Tạo admin & customer mẫu nếu chưa có (mật khẩu được hash)
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        username: 'admin_test',
        email: 'admin@haitien.com',
        password: 'password123', // sẽ được hash bởi pre('save')
        role: 'admin'
      });
      console.log(' Đã tạo admin: admin@haitien.com / password123');
    }

    let cust = await User.findOne({ email: 'khach1@haitien.com' });
    if (!cust) {
      cust = await User.create({
        username: 'khach1',
        email: 'khach1@haitien.com',
        password: '123456', // sẽ được hash
        role: 'customer'
      });
      console.log(' Đã tạo customer: khach1@haitien.com / 123456');
    }

    // 3) Làm sạch & seed products
    await Product.deleteMany({});
    const docs = sampleProducts(fresh._id, dry._id, frozen._id, admin._id);
    await Product.insertMany(docs);
    console.log(` Đã chèn ${docs.length} sản phẩm mẫu!`);
  } catch (err) {
    console.error(' Lỗi khi Seed Database:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Đóng kết nối CSDL.');
  }
};

seedDB();
