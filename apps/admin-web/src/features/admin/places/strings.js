export const placeStrings = {
  vi: {
    places: 'Địa điểm', create: 'Thêm địa điểm', name: 'Tên', address: 'Địa chỉ', category: 'Danh mục', choose: 'Chọn danh mục',
    latitude: 'Vĩ độ', longitude: 'Kinh độ', radius: 'Bán kính (m)', image: 'Đường dẫn ảnh HTTP(S), không bắt buộc',
    upload: 'Chưa hỗ trợ tải ảnh lên; có thể nhập URL ảnh sẵn có.', status: 'Trạng thái', narrations: 'Thuyết minh',
    locale: 'Ngôn ngữ thuyết minh', chooseLocale: 'Chọn ngôn ngữ', hasNarration: 'đã có bài', title: 'Tiêu đề', body: 'Nội dung',
    newText: 'Thêm bài', saved: 'Đã lưu thành công.', deleted: 'Đã xóa.', textDeleted: 'Đã xóa bài thuyết minh.',
    confirm: 'Xóa địa điểm và tất cả bài thuyết minh liên quan?', confirmText: 'Xóa bài thuyết minh {lang}?',
    invalid: 'Kiểm tra các trường bắt buộc, tọa độ, bán kính 20–1000 và URL ảnh.', duplicate: 'Ngôn ngữ này đã có bài.',
    missing: 'Không tìm thấy địa điểm hoặc bài thuyết minh.', lastNarration: 'Địa điểm đang công khai phải còn ít nhất một bài. Ẩn địa điểm trước khi xóa bài cuối.',
    empty: 'Chưa có địa điểm.', noMatch: 'Không có địa điểm phù hợp bộ lọc.', noText: 'Chưa có bài thuyết minh.', retry: 'Thử lại',
    search: 'Tìm địa điểm', filter: 'Lọc trạng thái', allStatuses: 'Tất cả trạng thái', localesError: 'Không tải được danh sách ngôn ngữ.',
    liveEdit: 'Địa điểm đang công khai: thay đổi hợp lệ hiển thị cho khách ngay sau khi lưu.',
    credit: 'Ghi công ảnh (tác giả, giấy phép, nguồn)', creditHint: 'Bắt buộc với ảnh có giấy phép CC BY/CC BY-SA; hiển thị dưới ảnh cho khách.',
    uploadImage: 'Tải ảnh lên (JPG, PNG, WebP, tối đa 2 MB)', uploadAfterSave: 'Lưu địa điểm trước rồi mới tải ảnh lên.',
    removeImage: 'Xóa ảnh', confirmRemoveImage: 'Xóa ảnh và ghi công ảnh của địa điểm?', imageUploaded: 'Đã tải ảnh lên.', imageRemoved: 'Đã xóa ảnh.',
    UNSUPPORTED_IMAGE_TYPE: 'Chỉ nhận ảnh JPG, PNG hoặc WebP.', IMAGE_TOO_LARGE: 'Ảnh vượt quá 2 MB.', INVALID_IMAGE: 'Tệp không phải ảnh hợp lệ.',
  },
  en: {
    places: 'Places', create: 'Add place', name: 'Name', address: 'Address', category: 'Category', choose: 'Choose category',
    latitude: 'Latitude', longitude: 'Longitude', radius: 'Radius (m)', image: 'Image HTTP(S) URL, optional',
    upload: 'Image upload is not available; an existing image URL may be entered.', status: 'Status', narrations: 'Narrations',
    locale: 'Narration language', chooseLocale: 'Choose language', hasNarration: 'already written', title: 'Title', body: 'Content',
    newText: 'Add narration', saved: 'Saved successfully.', deleted: 'Deleted.', textDeleted: 'Narration deleted.',
    confirm: 'Delete this place and all its narrations?', confirmText: 'Delete the {lang} narration?',
    invalid: 'Check required fields, coordinates, radius 20–1000 and image URL.', duplicate: 'A narration already exists for this language.',
    missing: 'Place or narration not found.', lastNarration: 'A published place needs at least one narration. Hide the place before deleting the last one.',
    empty: 'No places yet.', noMatch: 'No places match the filter.', noText: 'No narrations yet.', retry: 'Retry',
    search: 'Search places', filter: 'Filter by status', allStatuses: 'All statuses', localesError: 'Could not load the language list.',
    liveEdit: 'This place is published: valid changes are visible to visitors as soon as they are saved.',
    credit: 'Image credit (author, licence, source)', creditHint: 'Required for CC BY/CC BY-SA images; shown under the image to visitors.',
    uploadImage: 'Upload image (JPG, PNG, WebP, up to 2 MB)', uploadAfterSave: 'Save the place before uploading an image.',
    removeImage: 'Remove image', confirmRemoveImage: 'Remove the image and its credit from this place?', imageUploaded: 'Image uploaded.', imageRemoved: 'Image removed.',
    UNSUPPORTED_IMAGE_TYPE: 'Only JPG, PNG or WebP images are accepted.', IMAGE_TOO_LARGE: 'The image is larger than 2 MB.', INVALID_IMAGE: 'The file is not a valid image.',
  },
};

export const publicationStrings = {
  vi: {
    publish: 'Công bố', hide: 'Ẩn địa điểm', confirmPublish: 'Công bố địa điểm và các bài thuyết minh? Chỉ tiếp tục với nội dung đã được nhóm kiểm duyệt.',
    confirmHide: 'Ẩn địa điểm khỏi ứng dụng khách?', published: 'Đã công bố.', hidden: 'Đã ẩn địa điểm.',
    missingFields: 'Chưa đủ điều kiện công bố. Kiểm tra:', changed: 'Trạng thái đã thay đổi. Chọn lại địa điểm để cập nhật.',
    name: 'Tên', address: 'Địa chỉ', category: 'Danh mục', coordinates: 'Tọa độ và bán kính', narration: 'Thuyết minh hợp lệ', image_url: 'Đường dẫn ảnh',
  },
  en: {
    publish: 'Publish', hide: 'Hide place', confirmPublish: 'Publish this place and its narrations? Continue only with content reviewed by the team.',
    confirmHide: 'Hide this place from guest apps?', published: 'Published.', hidden: 'Place hidden.',
    missingFields: 'This place is not ready to publish. Check:', changed: 'The status has changed. Select the place again to refresh it.',
    name: 'Name', address: 'Address', category: 'Category', coordinates: 'Coordinates and radius', narration: 'Valid narration', image_url: 'Image URL',
  },
};

export const statusLabels = {
  vi: { draft: 'Nháp', published: 'Công khai', hidden: 'Ẩn' },
  en: { draft: 'Draft', published: 'Published', hidden: 'Hidden' },
};

/** Lỗi API -> câu hiển thị; mã lạ dùng thông điệp chung của ứng dụng. */
export function placeMessage(s, t, code) {
  return ({
    VALIDATION_ERROR: s.invalid, CATEGORY_NOT_FOUND: s.invalid, NARRATION_DUPLICATE: s.duplicate,
    NARRATION_NOT_FOUND: s.missing, POI_NOT_FOUND: s.missing, NARRATION_REQUIRED: s.lastNarration,
    UNSUPPORTED_IMAGE_TYPE: s.UNSUPPORTED_IMAGE_TYPE, IMAGE_TOO_LARGE: s.IMAGE_TOO_LARGE, INVALID_IMAGE: s.INVALID_IMAGE,
  })[code] || t[code] || t.SERVER_ERROR;
}
