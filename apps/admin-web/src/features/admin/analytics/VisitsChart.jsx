import React, { useState } from 'react';

// UC10: lượt truy cập từng ngày trong khoảng đã chọn. Một chuỗi số liệu nên không có chú giải;
// tiêu đề gọi tên chuỗi, bảng ngay dưới là bản đọc đầy đủ (không phụ thuộc màu hay rê chuột).
const HEIGHT = 200, TOP = 12, BOTTOM = 28, LEFT = 36, RIGHT = 8, MAX_BAR = 24, GAP = 2, RADIUS = 4;
const INK = { bar: '#21473d', barHover: '#3b6b5e', grid: '#e0e4d8', muted: '#718078' };
// Tooltip nằm trên đỉnh cột; với cột cao sát đỉnh thì hạ xuống để khung cuộn không cắt mất.
const TOOLTIP_H = 44;

function niceMax(value) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 2.5, 5, 10].map((m) => m * step).find((v) => v >= value) ?? value;
}

/** Cột bo 4px ở đầu dữ liệu, vuông ở đường gốc. */
function barPath(x, y, width, height) {
  if (height <= 0) return '';
  const r = Math.min(RADIUS, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function VisitsChart({ days, title, visitsLabel }) {
  const [hover, setHover] = useState(null);
  if (!days?.length) return null;
  const width = Math.max(320, days.length * 28 + LEFT + RIGHT);
  const plotW = width - LEFT - RIGHT, plotH = HEIGHT - TOP - BOTTOM;
  const max = niceMax(Math.max(...days.map((d) => d.visits)));
  const band = plotW / days.length;
  const barW = Math.max(2, Math.min(MAX_BAR, band - GAP));
  const y = (v) => TOP + plotH - (v / max) * plotH;
  const ticks = max % 2 === 0 ? [0, max / 2, max] : [0, max]; // lượt là số nguyên: không có vạch 2.5
  const labelEvery = Math.max(1, Math.ceil(days.length / 7));
  // Luôn ghi ngày cuối; bỏ nhãn đều đặn nào nằm quá sát ngày cuối để chữ không chồng nhau.
  const labelled = (i) => i === days.length - 1 || (i % labelEvery === 0 && days.length - 1 - i >= labelEvery);
  const active = hover === null ? null : days[hover];

  return <figure className="visits-chart">
    <figcaption>{title}</figcaption>
    {/* Kích thước điểm ảnh cố định để chữ không co lại; khoảng dài thì cuộn ngang trong khung, không tràn trang. */}
    <div className="visits-chart-scroll"><div className="visits-chart-plot" style={{ width }}>
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={title} onPointerLeave={() => setHover(null)}>
        {ticks.map((tick) => <g key={tick}>
          <line x1={LEFT} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} stroke={INK.grid} strokeWidth="1" />
          <text x={LEFT - 6} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill={INK.muted}>{Number.isInteger(tick) ? tick : tick.toFixed(1)}</text>
        </g>)}
        {days.map((d, i) => {
          const x = LEFT + i * band + (band - barW) / 2;
          const top = y(d.visits);
          const label = `${d.date}: ${d.visits} ${visitsLabel}`;
          return <g key={d.date}>
            <path d={barPath(x, top, barW, TOP + plotH - top)} fill={hover === i ? INK.barHover : INK.bar} />
            {/* Vùng bắt chuột/bàn phím phủ cả cột dọc, lớn hơn phần đã tô. */}
            <rect x={LEFT + i * band} y={TOP} width={band} height={plotH} fill="transparent" tabIndex="0" aria-label={label}
              onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
            {labelled(i) && <text x={LEFT + i * band + band / 2} y={HEIGHT - 8}
              textAnchor="middle" fontSize="11" fill={INK.muted}>{shortDate(d.date)}</text>}
          </g>;
        })}
      </svg>
      {active && <div className="visits-chart-tooltip" role="status" style={{ left: LEFT + hover * band + band / 2, top: Math.max(TOOLTIP_H, y(active.visits) - 8) }}>
        <strong>{active.visits}</strong> {visitsLabel}<br /><span>{active.date}</span>
      </div>}
    </div></div>
  </figure>;
}
