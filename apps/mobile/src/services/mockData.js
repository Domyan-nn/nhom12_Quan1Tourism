// Dữ liệu giả lập theo đúng hình dạng API công khai (chỉ địa điểm published, BR01).
// Giữ đồng bộ với apps/guest-web/src/api/mockData.js. Nội dung chỉ để dựng giao diện;
// nhóm thay bằng bộ seed chuẩn (WBS-02). Tọa độ là ước lượng, cần kiểm tra lại.
export const categories = [
  { id: 'cat-1', name: 'Di tích và kiến trúc', name_en: 'Heritage and architecture' },
  { id: 'cat-2', name: 'Văn hóa và mua sắm', name_en: 'Culture and shopping' },
];

export const pois = [
  {
    id: 'poi-1', category_id: 'cat-1', name: 'Dinh Độc Lập',
    address: '135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1',
    latitude: 10.777, longitude: 106.6953, radius_m: 150, image_url: null,
    narrations: [{ locale: 'vi', title: 'Dinh Độc Lập', body: 'Dinh Độc Lập hoàn thành năm 1966 theo thiết kế của kiến trúc sư Ngô Viết Thụ. Công trình gắn với sự kiện ngày 30 tháng 4 năm 1975 và hiện là nơi tham quan của nhiều du khách.' }],
  },
  {
    id: 'poi-2', category_id: 'cat-1', name: 'Nhà thờ Đức Bà',
    address: '01 Công xã Paris, Phường Bến Nghé, Quận 1',
    latitude: 10.7798, longitude: 106.699, radius_m: 100, image_url: null,
    narrations: [
      { locale: 'vi', title: 'Nhà thờ Đức Bà', body: 'Nhà thờ Đức Bà được xây dựng trong giai đoạn 1863 đến 1880, nổi bật với hai tháp chuông và lớp gạch đỏ không trát vữa.' },
      { locale: 'en', title: 'Notre-Dame Cathedral', body: 'Built between 1863 and 1880, Notre-Dame Cathedral is known for its two bell towers and red brick walls left without plaster.' },
    ],
  },
  {
    id: 'poi-3', category_id: 'cat-1', name: 'Bưu điện Trung tâm',
    address: '02 Công xã Paris, Phường Bến Nghé, Quận 1',
    latitude: 10.7799, longitude: 106.6998, radius_m: 80, image_url: null,
    narrations: [{ locale: 'vi', title: 'Bưu điện Trung tâm', body: 'Bưu điện Trung tâm được xây vào cuối thế kỷ 19, có sảnh chính mái vòm cao và hai bản đồ cổ trên tường.' }],
  },
  {
    id: 'poi-4', category_id: 'cat-2', name: 'Chợ Bến Thành',
    address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1',
    latitude: 10.7725, longitude: 106.698, radius_m: 120, image_url: null,
    narrations: [{ locale: 'vi', title: 'Chợ Bến Thành', body: 'Chợ Bến Thành khánh thành năm 1914, là biểu tượng buôn bán của thành phố với tháp đồng hồ ở cổng chính.' }],
  },
  {
    id: 'poi-5', category_id: 'cat-2', name: 'Nhà hát Thành phố',
    address: '07 Công trường Lam Sơn, Phường Bến Nghé, Quận 1',
    latitude: 10.7766, longitude: 106.7032, radius_m: 90, image_url: null,
    narrations: [{ locale: 'vi', title: 'Nhà hát Thành phố', body: 'Nhà hát Thành phố mang phong cách kiến trúc Pháp, được khánh thành năm 1900 và vẫn tổ chức biểu diễn nghệ thuật.' }],
  },
];
