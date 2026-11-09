// Hỏi lại server trước mỗi lần tự phát (UC04): danh sách tải lúc mở ứng dụng có thể đã cũ
// vì Admin vừa ẩn/xóa địa điểm (BR01) hoặc sửa bài (BR12).
// 404 được ném tiếp để gọi bỏ POI; lỗi mạng thì dùng bản đã tải nếu có (NFR02).
export async function loadFreshDetail(getDetail, poiId) {
  try {
    return await getDetail(poiId, { force: true });
  } catch (err) {
    if (err?.status === 404) throw err;
    return getDetail(poiId);
  }
}
