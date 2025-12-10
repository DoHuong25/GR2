# Quy Trình Đặt Hàng & Quản Lý Đơn Hàng - GR2 E-Commerce

## 📋 Tóm Tắt Quy Trình

GR2 sử dụng quy trình 6 bước tương tự Shopee, Lazada, TikTok Shop:

```
[pending] → [processing] → [shipping] → [completed]
    ↓
[cancelled]  [returned]
```

---

## 🛍️ 1. KHÁCH HÀNG ĐẶT HÀNG (Customer Checkout)

### Endpoint: `POST /api/shop/checkout`
**Yêu cầu:** Token JWT (đăng nhập)

**Input:**
```json
{
  "name": "Nguyễn Văn A",
  "phone": "0912345678",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "paymentMethod": "COD" | "Online",
  "selectedItems": { "0": true, "1": false }  // Index của sản phẩm được chọn
}
```

**Xử lý:**
1. Kiểm tra giỏ hàng không rỗng
2. Lọc sản phẩm theo `selectedItems`
3. Tạo Order với status = **`pending`** (chờ admin xác nhận)
4. Xóa sản phẩm đã đặt khỏi giỏ hàng
5. Trả về `orderId` + `total` + `shippingFee`

**Output:**
```json
{
  "message": "Đặt hàng thành công!",
  "orderId": "693461414c82d69324ae3ac4",
  "paymentMethod": "COD",
  "total": 155000,
  "shippingFee": 30000
}
```

**Trạng thái Order sau khi đặt:**
- **Status**: `pending` (Chờ xác nhận)
- **PaymentStatus**: 
  - COD: `Đã xác nhận` (không cần xác nhận thanh toán)
  - Online: `Chưa thanh toán` (cần xác nhận thanh toán)

---

## 💳 2. XÁC NHẬN THANH TOÁN (Confirm Payment - Chỉ cho Online)

### Endpoint: `POST /api/shop/orders/:orderId/confirm-payment`
**Yêu cầu:** Token JWT + Order là của user này + paymentMethod = "Online"

**Xử lý:**
1. Kiểm tra Order ở trạng thái `pending`
2. Cập nhật `paymentStatus = 'Đã xác nhận'`
3. Ghi nhận thời gian xác nhận `paymentConfirmedAt`
4. Status vẫn là `pending` (chờ admin xác nhận đơn)

**Khi nào gọi API này?**
- User thực hiện chuyển khoản → Xác nhận đã thanh toán → Gọi API này

---

## ✅ 3. ADMIN XÁC NHẬN ĐƠN HÀNG (Admin Approve Order)

### Endpoint: `PUT /api/admin/orders/:id/status`
**Yêu cầu:** Token JWT + Role = `admin` | `employee`

**Input:**
```json
{
  "status": "processing"
}
```

**Quy luật:**
- **Admin**: Có thể chuyển sang bất kỳ trạng thái nào
- **Employee**: Chỉ được chuyển sang `processing` hoặc `shipping` (không được hủy/hoàn trả)

**Luồng xác nhận:**
1. Kiểm tra thanh toán (nếu Online, phải `paymentStatus = 'Đã xác nhận'`)
2. Xác nhận kho (số lượng có đủ không)
3. Chuyển status `pending` → `processing` (đang chuẩn bị hàng)

---

## 📦 4. CHUẨN BỊ & GIAO HÀNG

### Bước 1: Đang Chuẩn Bị (Processing)
- **Status**: `processing`
- Admin/Nhân viên chuẩn bị hàng
- Có thể cập nhật thông tin giao hàng

### Bước 2: Đang Giao Hàng (Shipping)
```json
{ "status": "shipping" }
```
- Hàng đã được gửi đi
- Khách có thể theo dõi

### Bước 3: Đã Nhận / Hoàn Thành (Completed)
```json
{ "status": "completed" }
```
- Khách đã nhận hàng
- Có thể để đánh giá / yêu cầu hoàn tiền

---

## ❌ 5. HỦY ĐƠN HÀNG (Cancel Order)

### Endpoint: `POST /api/shop/orders/:orderId/cancel`
**Yêu cầu:** Token JWT + Order là của user này

**Điều kiện hủy:**
- ✅ Status = `pending` (chờ xác nhận)
- ✅ Status = `processing` (đang chuẩn bị)
- ❌ Status = `shipping` (đang giao - không thể hủy)
- ❌ Status = `completed` (đã nhận - không thể hủy)

**Xử lý:**
1. Kiểm tra status hợp lệ
2. Trả lại sản phẩm vào giỏ hàng
3. Chuyển status → `cancelled`

---

## 🔄 6. HOÀN TIỀN / HOÀN TRẢ (Refund - Return)

### Workflow:
1. **User gửi yêu cầu hoàn tiền** (Sau khi nhận hàng)
   - Endpoint: `POST /api/refund/:orderId/bank-info`
   - Gửi thông tin ngân hàng
   - Status Order chuyển: `completed` → `returned` (pending refund)

2. **Admin xác nhận hoàn tiền**
   - Endpoint: `POST /api/refund/:refundId/complete`
   - Cập nhật refund status: `completed`
   - Gửi thông báo cho user

3. **User xác nhận nhận tiền**
   - Endpoint: `POST /api/refund/:refundId/confirm`
   - Refund status: `confirmed`

---

## 📊 Trạng Thái Đơn Hàng (Order Status)

| Status | Tiếng Việt | Mô tả | Có thể thay đổi thành |
|--------|-----------|-------|----------------------|
| `pending` | Chờ xác nhận | Vừa tạo, chờ admin duyệt | `processing`, `cancelled` |
| `processing` | Đang chuẩn bị | Admin xác nhận, đang chuẩn bị hàng | `shipping`, `cancelled` |
| `shipping` | Đang giao hàng | Hàng đã gửi đi | `completed` |
| `completed` | Hoàn thành | Khách đã nhận | `returned` |
| `cancelled` | Đã hủy | Đơn bị hủy | ❌ Không thay đổi |
| `returned` | Hoàn trả | Khách yêu cầu hoàn tiền | ❌ Không thay đổi |

---

## 💰 Trạng Thái Thanh Toán (Payment Status)

| paymentStatus | Mô tả |
|---------------|-------|
| `Chưa thanh toán` | Online method, chưa xác nhận |
| `Đã xác nhận` | Đã xác nhận thanh toán (Online hoặc COD) |

---

## 🔐 Quyền Hạn (Authorization)

### Customer:
- ✅ Xem danh sách đơn hàng của mình
- ✅ Xem chi tiết đơn hàng
- ✅ Xác nhận thanh toán (Online)
- ✅ Hủy đơn (nếu status = pending/processing)
- ✅ Yêu cầu hoàn tiền (nếu status = completed)
- ✅ Xác nhận nhận tiền hoàn

### Employee:
- ✅ Xem tất cả đơn hàng
- ✅ Tạo đơn thủ công (chỉ ở status = pending)
- ✅ Cập nhật thông tin giao hàng
- ✅ Chuyển status: pending → processing → shipping → completed
- ❌ Không được hủy/hoàn trả đơn
- ❌ Không được xóa đơn

### Admin:
- ✅ Tất cả quyền của Employee
- ✅ Hủy/Hoàn trả đơn hàng
- ✅ Xóa đơn hàng
- ✅ Xác nhận hoàn tiền

---

## 📱 So Sánh với Shopee/Lazada/TikTok

| Bước | GR2 | Shopee | Lazada | TikTok |
|------|-----|--------|--------|--------|
| 1 | Khách đặt hàng | Pending | Pending | Awaiting | confirmation |
| 2 | Admin xác nhận | → Processing | → To Ship | → Processing |
| 3 | Chuẩn bị & gửi | → Shipping | → Shipped | → Shipping |
| 4 | Giao hàng | → Completed | → Delivered | → Delivered |
| 5 | Hoàn tiền | → Returned | → Return/Refund | → Return |

**Kết luận:** GR2 quy trình hoàn toàn tương đồng với các nền tảng lớn ✅

---

## 🚀 API Endpoints Tóm Tắt

### Customer
- `POST /api/shop/checkout` - Đặt hàng
- `POST /api/shop/orders/:orderId/confirm-payment` - Xác nhận thanh toán
- `POST /api/shop/orders/:orderId/cancel` - Hủy đơn
- `GET /api/shop/profile` - Xem danh sách đơn + thông tin user
- `POST /api/refund/:orderId/bank-info` - Gửi thông tin hoàn tiền
- `POST /api/refund/:refundId/confirm` - Xác nhận nhận tiền

### Admin/Employee
- `GET /api/admin/orders` - Xem tất cả đơn
- `GET /api/admin/orders/:id` - Chi tiết đơn
- `PUT /api/admin/orders/:id` - Cập nhật chi tiết đơn
- `PUT /api/admin/orders/:id/status` - Cập nhật trạng thái
- `DELETE /api/admin/orders/:id` - Xóa đơn (chỉ Admin)
- `POST /api/refund/:refundId/complete` - Xác nhận hoàn tiền

---

## 📝 Ghi Chú Quan Trọng

1. **Giỏ hàng session-based**: Sản phẩm được lưu trong `req.session.cart`
2. **Trạng thái enum**: Sử dụng tiếng Anh (pending, processing, shipping, completed, cancelled, returned)
3. **Shippingfee cố định**: 30,000 VNĐ cho mọi đơn
4. **Đơn hàng thủ công**: Admin có thể tạo đơn trực tiếp mà không qua checkout
5. **Notification system**: Tự động gửi thông báo cho customer khi status thay đổi

