import { Empty } from '../components/StateViews.jsx';

// UC02 – WBS-10. Component MapView do Lê Nam Thuận tích hợp vào #map-slot.
export default function MapPage() {
  return (
    <section>
      <h1>Bản đồ</h1>
      <div id="map-slot" className="map-slot">
        <Empty title="Bản đồ đang được tích hợp" hint="Bạn vẫn có thể xem địa điểm ở mục Khám phá." />
      </div>
    </section>
  );
}
