// D:\GR2\be\models\product.js

const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
    name: { // Tên của biến thể 
        type: String,
        required: true,
        trim: true
    },
    price: { // Giá của riêng biến thể này
        type: Number,
        required: true
    },
    unit: { // Đơn vị tính cho biến thể này (ví dụ: kg, con, gói)
        type: String,
        required: true,
        default: 'kg'
    }
});


// --- ĐỊNH NGHĨA SẢN PHẨM "CHA" ---
const productSchema = new mongoose.Schema({
    name: { // Tên  sản phẩm 
        type: String,
        required: [true, 'Tên sản phẩm là bắt buộc.'],
        trim: true,
        unique: true
    },
    description: { // Mô tả chung
        type: String,
        trim: true,
        required: [true, 'Mô tả là bắt buộc.']
    },
    image: { // Ảnh đại diện chung
        type: String,
        required: [true, 'Ảnh minh họa là bắt buộc.']
    },
    category: { // Liên kết tới danh mục
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    
    // Mảng các biến thể 
    variants: [VariantSchema],
    
    //  PHẦN ĐÁNH GIÁ 
    ratings: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            stars: {
                type: Number,
                min: [1, 'Số sao phải từ 1 đến 5.'],
                max: [5, 'Số sao phải từ 1 đến 5.'],
                required: [true, 'Số sao đánh giá là bắt buộc.']
            },
            comment: {
                type: String,
                trim: true,
                maxlength: [500, 'Bình luận không được quá 500 ký tự.']
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            //  Trường xác thực đã mua hàng
            isVerifiedPurchase: {
                type: Boolean,
                default: false 
            }
        }
    ],
    createdBy: { // Người thêm sản phẩm (Admin hoặc Nhân viên)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);