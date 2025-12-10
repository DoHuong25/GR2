// Đánh giá sản phẩm
export const rateProduct = async (productId, stars, comment) => {
  return http.post(`/shop/products/${productId}/rate`, { stars, comment });
};
// --- shop.js ---
import { http } from "./http";

const extractArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  return payload?.products || payload?.items || payload?.data || payload?.docs || [];
};

export const Shop = {
  getCategories: async () => {
    const r = await http.get("/shop/categories");
    const arr = Array.isArray(r.data) ? r.data : (r.data?.categories || extractArray(r.data));
    console.log("[API] categories:", Array.isArray(arr), "len:", arr.length, { raw: r.data });
    return arr;
  },
  getProducts: async (params = {}) => {
    const r1 = await http.get("/shop/products", { params });
    let list = extractArray(r1.data);
    console.log("[API] products(params):", params, "=>", Array.isArray(list), "len:", list.length, { raw: r1.data });
    if (!Array.isArray(list) || list.length === 0) {
      const r2 = await http.get("/shop/products");
      list = extractArray(r2.data);
      console.log("[API] products(fallback):", Array.isArray(list), "len:", list.length, { raw: r2.data });
    }
    return list;
  },
  getProduct: async (id) => {
    const r = await http.get(`/shop/products/${id}`);
    console.log("[API] product detail:", r.data);
    return r.data;
  },
};
