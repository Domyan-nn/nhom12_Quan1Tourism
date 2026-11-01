import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="state">
      <strong>Không tìm thấy trang</strong>
      <p><Link to="/">Về trang Khám phá</Link></p>
    </div>
  );
}
