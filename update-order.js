const mongoose = require('mongoose');
const Order = require('./be/models/order');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gr2')
  .then(async () => {
    // Update đơn đầu tiên thành completed
    const result = await Order.updateOne(
      { _id: '6932cff5237d905bdb5083eb' },
      { $set: { status: 'completed' } }
    );
    
    console.log('✅ Update thành công:', result);
    
    // Kiểm tra
    const order = await Order.findById('6932cff5237d905bdb5083eb').lean();
    console.log('📦 Đơn hàng sau update:');
    console.log(`   ID: ${order._id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Customer: ${order.customer}`);
    
    mongoose.connection.close();
  })
  .catch(e => {
    console.error('❌ Lỗi:', e.message);
    mongoose.connection.close();
  });
