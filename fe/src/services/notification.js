import { http } from './http';

// Lấy danh sách thông báo của user
export const getNotifications = () => http.get('/notification');

// Đánh dấu một thông báo là đã đọc
export const markNotificationRead = (id) => http.post(`/notification/${id}/read`);

// Đánh dấu tất cả thông báo là đã đọc
export const markAllNotificationsRead = () => http.post('/notification/mark-all-read');

// Xóa một thông báo
export const deleteNotification = (id) => http.delete(`/notification/${id}`);

// Xóa tất cả thông báo
export const deleteAllNotifications = () => http.delete('/notification');
