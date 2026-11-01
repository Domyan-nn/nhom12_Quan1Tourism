export function Loading({ label = 'Đang tải…' }) {
  return <p className="state" role="status">{label}</p>;
}

export function Empty({ title, hint }) {
  return (
    <div className="state" role="status">
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function ErrorState({ message = 'Không tải được dữ liệu.', onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <strong>{message}</strong>
      <p>Kiểm tra kết nối mạng rồi thử lại.</p>
      {onRetry && <button className="btn" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
