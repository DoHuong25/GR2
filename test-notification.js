// test-notification.js - Test thông báo khi admin thay đổi status

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

// Dùng token admin giả để test
// Trong thực tế, cần login trước để lấy token
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzVjZjY2YWMwZTAwMzAwMWUwNGUwZjAiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzM1MTI2ODh9.9m92e4hPvl_30OcEBvCELiFGIb5N-hMndsJFrDTZs-M';

async function testNotification() {
  try {
    // Bước 1: Lấy danh sách đơn hàng
    console.log('📋 Bước 1: Lấy danh sách đơn hàng...');
    const ordersRes = await axios.get(`${API_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    
    const orders = ordersRes.data;
    if (orders.length === 0) {
      console.log('❌ Không có đơn hàng nào');
      return;
    }
    
    const order = orders[0];
    console.log(`✅ Tìm thấy đơn hàng: ${order._id}`);
    console.log(`   Trạng thái hiện tại: ${order.status}`);
    console.log(`   Customer ID: ${order.customer}`);
    
    // Bước 2: Thay đổi status
    const newStatus = order.status === 'pending' ? 'processing' : 'completed';
    console.log(`\n⚙️  Bước 2: Thay đổi status thành "${newStatus}"...`);
    
    const updateRes = await axios.put(
      `${API_URL}/admin/orders/${order._id}/status`,
      { status: newStatus },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    
    console.log('✅ Status đã thay đổi');
    console.log(`   Trạng thái mới: ${updateRes.data.status}`);
    
    // Bước 3: Kiểm tra notification trong database
    console.log(`\n🔔 Bước 3: Kiểm tra notification được tạo...`);
    console.log('   (Mở MongoDB Compass hoặc mongosh để xem collection Notifications)');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data || error.message);
  }
}

testNotification();
