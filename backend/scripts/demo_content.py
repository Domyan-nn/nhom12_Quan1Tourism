"""Nội dung demo cho 5 địa điểm của seed_db.py (tiếng Việt và tiếng Anh).

Các dữ kiện được đối chiếu với nhiều nguồn công khai; danh sách nguồn và các điểm còn mâu thuẫn nằm trong
docs/data/demo-content-sources.md. Lời văn do nhóm biên soạn lại, không sao chép từ nguồn nào.
Nhóm vẫn phải đọc lại và tự chịu trách nhiệm về nội dung trước khi công bố.

Khóa của từng mục trùng với khóa trong seed_db.PLACES để tìm đúng bản ghi (ID ổn định).
"""

CONTENT = {
    "dinh-doc-lap": {
        "address": "135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, TP. Hồ Chí Minh (Quận 1 cũ)",
        "coordinates": None,  # giữ tọa độ của seed
        "narrations": {
            "vi": (
                "Dinh Độc Lập",
                "Dinh Độc Lập nằm ở số 135 đường Nam Kỳ Khởi Nghĩa. Công trình hiện nay được xây trên nền Dinh Norodom "
                "thời Pháp thuộc, ngôi dinh bị ném bom năm 1962 nên phải dỡ bỏ. Kiến trúc sư Ngô Viết Thụ thiết kế dinh mới, "
                "khởi công ngày 1 tháng 7 năm 1962 và khánh thành ngày 31 tháng 10 năm 1966. Ngày 30 tháng 4 năm 1975, "
                "xe tăng của quân giải phóng tiến vào đây, đánh dấu thời khắc kết thúc chiến tranh. Dinh được xếp hạng "
                "di tích quốc gia đặc biệt năm 2009 và hiện mở cửa đón khách tham quan.",
            ),
            "en": (
                "Independence Palace",
                "Independence Palace stands at 135 Nam Ky Khoi Nghia Street. The current building was raised on the site "
                "of the French-era Norodom Palace, which was bombed in 1962 and then demolished. Architect Ngo Viet Thu "
                "designed the new palace; construction began on 1 July 1962 and it was inaugurated on 31 October 1966. "
                "On 30 April 1975, tanks of the liberation forces entered its grounds, marking the end of the war. "
                "The palace was ranked a Special National Monument in 2009 and is now open to visitors.",
            ),
        },
    },
    "nha-tho-duc-ba": {
        "address": "01 Công xã Paris, Phường Sài Gòn, TP. Hồ Chí Minh (Quận 1 cũ)",
        "coordinates": None,
        "narrations": {
            "vi": (
                "Nhà thờ Đức Bà",
                "Nhà thờ Đức Bà nằm ở số 1 Công xã Paris, ngay trung tâm thành phố. Sau những ngôi nhà thờ gỗ đầu tiên, "
                "nhà thờ gạch hiện nay được khởi công năm 1877 và khánh thành ngày 11 tháng 4 năm 1880. Phần lớn vật liệu "
                "được chở từ Pháp sang, nên mặt ngoài xây bằng gạch trần màu đỏ, không trát vữa. Hai tháp chuông được xây "
                "thêm năm 1895 và cao hơn 50 mét. Trước nhà thờ là tượng Đức Mẹ Hòa Bình, đặt năm 1959. "
                "Đây là một trong những công trình biểu tượng của thành phố.",
            ),
            "en": (
                "Notre-Dame Cathedral",
                "Notre-Dame Cathedral stands at 1 Cong Xa Paris Square in the heart of the city. After the first wooden "
                "churches, the present brick cathedral was begun in 1877 and consecrated on 11 April 1880. Most materials "
                "were shipped from France, and the outer walls are bare red brick with no plaster. The two bell towers were "
                "added in 1895 and rise above 50 metres. In front stands the statue of Our Lady of Peace, placed in 1959. "
                "It is one of the city's best-known landmarks.",
            ),
        },
    },
    "buu-dien": {
        "address": "02 Công xã Paris, Phường Sài Gòn, TP. Hồ Chí Minh (Quận 1 cũ)",
        "coordinates": None,
        "narrations": {
            "vi": (
                "Bưu điện Trung tâm",
                "Bưu điện Trung tâm nằm cạnh Nhà thờ Đức Bà, ở số 2 Công xã Paris. Công trình được xây từ năm 1886 đến "
                "năm 1891 dưới thời Pháp thuộc và thường được ghi công cho kiến trúc sư Foulhoux. Có lời đồn rằng ông Eiffel "
                "thiết kế tòa nhà, nhưng chưa có tư liệu nào xác nhận điều đó. Sảnh chính rộng, có mái vòm sắt và kính, "
                "hai bên là các quầy dịch vụ. Hơn một thế kỷ sau, nơi đây vẫn hoạt động như một bưu điện và đón nhiều du khách.",
            ),
            "en": (
                "Central Post Office",
                "The Central Post Office stands next to Notre-Dame Cathedral, at 2 Cong Xa Paris Square. It was built "
                "between 1886 and 1891 under French rule and is usually credited to the architect Foulhoux. A popular rumour "
                "says Gustave Eiffel designed it, but no document confirms this. The main hall is wide, with a vaulted roof "
                "of iron and glass and service counters along both sides. More than a century later it still works as a "
                "post office and welcomes many visitors.",
            ),
        },
    },
    "cho-ben-thanh": {
        "address": "Đường Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh (Quận 1 cũ)",
        "coordinates": (10.77252, 106.69802),  # đối chiếu với tọa độ công bố của chợ
        "narrations": {
            "vi": (
                "Chợ Bến Thành",
                "Chợ Bến Thành nằm trên đường Lê Lợi, là một trong những biểu tượng quen thuộc của thành phố. Khu chợ có từ "
                "trước, còn tòa nhà hiện nay do nhà thầu Pháp Brossard et Maupin xây từ năm 1912 và khai thị ngày 28 tháng 3 "
                "năm 1914, sau khi lấp ao Bồ Rệt để lấy mặt bằng. Cổng phía nam có tháp đồng hồ ba mặt. Bên trong có hơn "
                "một nghìn sạp hàng, từ thực phẩm, vải vóc đến đồ lưu niệm.",
            ),
            "en": (
                "Ben Thanh Market",
                "Ben Thanh Market stands on Le Loi Street and is one of the city's most familiar symbols. A market existed "
                "here earlier, but the present building was constructed from 1912 by the French contractor Brossard et Maupin "
                "and opened on 28 March 1914, after the Bo Ret pond was filled in to make room. The south gate carries a "
                "clock tower with three faces. Inside are more than a thousand stalls, from food and fabrics to souvenirs.",
            ),
        },
    },
    "nha-hat": {
        "address": "07 Công trường Lam Sơn, Phường Sài Gòn, TP. Hồ Chí Minh (Quận 1 cũ)",
        "coordinates": None,
        "narrations": {
            "vi": (
                "Nhà hát Thành phố",
                "Nhà hát Thành phố nằm ở số 7 Công trường Lam Sơn. Công trình khởi công năm 1898 và khánh thành ngày 1 tháng 1 "
                "năm 1900, mang phong cách kiến trúc Pháp với mặt tiền nhiều chi tiết trang trí. Việc ghi công thiết kế còn "
                "nhiều ý kiến khác nhau; các tên thường được nhắc đến là Félix Olivier, Eugène Ferret và Ernest Guichard. "
                "Qua nhiều giai đoạn sử dụng, từ năm 1976 nhà hát trở lại phục vụ biểu diễn và đến nay vẫn tổ chức opera, "
                "ba lê và các chương trình sân khấu.",
            ),
            "en": (
                "Municipal Theatre",
                "The Municipal Theatre stands at 7 Lam Son Square. Construction began in 1898 and the theatre opened on "
                "1 January 1900, in a French architectural style with a richly decorated facade. Sources differ on who "
                "deserves credit for the design; the names most often mentioned are Felix Olivier, Eugene Ferret and Ernest "
                "Guichard. After several different uses, it returned to staging performances in 1976 and still hosts opera, "
                "ballet and stage shows today.",
            ),
        },
    },
}
