import http from './http';

// User gửi thông tin ngân hàng cho hoàn tiền
export const sendBankInfo = (orderId, bankInfo) =>
  http.post(`/refunds/${orderId}/bank-info`, bankInfo);

// Admin xác nhận hoàn tiền
export const completeRefund = (refundId, adminNote) =>
  http.post(`/refunds/${refundId}/complete`, { adminNote });

// User xác nhận đã nhận tiền
export const confirmRefund = (refundId) =>
  http.post(`/refunds/${refundId}/confirm`);

// Admin lấy danh sách hoàn tiền
export const getRefunds = () => http.get('/refunds');
