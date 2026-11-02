// Tải và giữ danh sách địa điểm công khai + danh mục cho Khám phá, Bản đồ và Tự phát.
// NFR02: nếu tải lại bị lỗi, dữ liệu đã tải vẫn được giữ để tiếp tục xem danh sách/đọc nội dung.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { publicApi } from '../services';

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', categories: [], pois: [], error: null, stale: false });
  const detailCache = useRef(new Map());

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, status: s.pois.length ? s.status : 'loading', error: null }));
    try {
      const [categories, pois] = await Promise.all([publicApi.listCategories(), publicApi.listPois()]);
      pois.forEach((p) => p.narrations && detailCache.current.set(p.id, p));
      setState({ status: 'ready', categories, pois, error: null, stale: false });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: s.pois.length ? 'ready' : 'error',
        stale: s.pois.length > 0,
        error: err,
      }));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Lấy chi tiết (kèm bài thuyết minh). Ném lỗi có status 404 nếu địa điểm không còn công khai. */
  const getDetail = useCallback(async (id, { force = false } = {}) => {
    const cached = detailCache.current.get(id);
    if (cached?.narrations && !force) return cached;
    const poi = await publicApi.getPoi(id);
    detailCache.current.set(id, poi);
    return poi;
  }, []);

  /** Địa điểm vừa bị ẩn (UC02-E2): bỏ khỏi bộ nhớ cục bộ. */
  const dropPoi = useCallback((id) => {
    detailCache.current.delete(id);
    setState((s) => ({ ...s, pois: s.pois.filter((p) => p.id !== id) }));
  }, []);

  const value = useMemo(() => ({ ...state, reload, getDetail, dropPoi }), [state, reload, getDetail, dropPoi]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
