const mongoose = require('mongoose');
const Order = require('./models/order');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Kết nối MongoDB');
    
    // Update đơn đầu tiên thành completed
    const result = await Order.updateOne(
      { _id: '6932cff5237d905bdb5083eb' },
      { $set: { status: 'completed' } }
    );
    
    if (result.modifiedCount === 1) {
      console.log('✅ Cập nhật thành công');
      
      const order = await Order.findById('6932cff5237d905bdb5083eb').lean();
      console.log(`   Status: ${order.status}`);
      console.log(`   Customer: ${order.customer}`);
    } else {
      console.log('❌ Không cập nhật được');
    }
    
    mongoose.connection.close();
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    mongoose.connection.close();
  }
})();
