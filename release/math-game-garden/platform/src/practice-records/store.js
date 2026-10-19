import { encodePracticeRecord, decodePracticeRecord } from './codec.js';
export const STORAGE_KEY = 'radical-adventure.practice.records.v1';
export const STORAGE_SCHEMA_VERSION = 1;
const DAY = 86400000;
const copy = value => structuredClone(value);

/** A single atomic value keeps retention and per-round updates in the same write. Never calls clear(). */
export function createPracticeStore(storage, { now = () => new Date().toISOString(), migrations = {} } = {}) {
  let expectedRaw = null, revision = 0, entries = [], isolated = [], blocked = false, recoveryRaw = null, activeId = null;
  let status = { kind: 'idle', message: '尚未保存。' };
  function failure(error) {
    status = { kind: 'error', code: error?.code || error?.name || 'storage-error', message: error?.code === 'storage-conflict'
      ? '其他分頁已更新紀錄，本頁停止寫入以免覆蓋。請先下載本頁紀錄，再重新整理。'
      : '尚未保存：瀏覽器儲存可能已滿或不可使用。請勿關閉本頁；可重試或下載本頁紀錄。' };
    return false;
  }
  function retain(list) {
    const cutoff = Date.parse(now()) - 90 * DAY;
    const kept = list.filter(e => !(e.state.attempt.status === 'completed' && Date.parse(e.state.attempt.completedAt) < cutoff));
    kept.sort((a, b) => Date.parse(b.state.attempt.startedAt) - Date.parse(a.state.attempt.startedAt) || b.state.attempt.id.localeCompare(a.state.attempt.id));
    while (kept.length > 30) {
      let index = kept.length - 1;
      while (index >= 0 && !['completed', 'abandoned'].includes(kept[index].state.attempt.status)) index--;
      if (index < 0) throw Object.assign(new Error('未完成回合已達上限，請先完成或確認放棄。'), { code: 'retention-full' });
      kept.splice(index, 1);
    }
    return kept;
  }
  function write(next, nextActiveId = activeId) {
    if (blocked) { status = { kind: 'error', code: 'blocked-records', message: '原始儲存資料無法讀取，已保留且停止覆寫。請先下載復原資料，或選擇備份後啟用新儲存。' }; return false; }
    try {
      if (!storage) throw new Error('unavailable');
      if (storage.getItem(STORAGE_KEY) !== expectedRaw) throw Object.assign(new Error('conflict'), { code: 'storage-conflict' });
      const kept = retain(next);
      const pointer = kept.some(e => e.state.attempt.id === nextActiveId) ? nextActiveId : null;
      const raw = JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, revision: revision + 1, activeId: pointer, records: kept.map(e => ({ savedAt: e.savedAt, record: encodePracticeRecord(e.state) })), isolated });
      storage.setItem(STORAGE_KEY, raw);
      if (storage.getItem(STORAGE_KEY) !== raw) throw Object.assign(new Error('conflict'), { code: 'storage-conflict' });
      expectedRaw = raw; revision++; entries = kept; activeId = pointer;
      status = { kind: 'saved', message: isolated.length ? `已保存；另有 ${isolated.length} 筆資料已隔離，可下載原始資料復原。` : '已保存到這個瀏覽器。' };
      return true;
    } catch (error) {
      if (error.code === 'retention-full') { status = { kind: 'error', code: error.code, message: error.message }; return false; }
      return failure(error);
    }
  }
  function load() {
    entries = []; isolated = []; revision = 0; blocked = false; recoveryRaw = null; activeId = null;
    try {
      if (!storage) throw new Error('unavailable');
      expectedRaw = storage.getItem(STORAGE_KEY);
      if (expectedRaw === null) { status = { kind: 'ready', message: '本瀏覽器尚無練習紀錄。' }; return []; }
      recoveryRaw = expectedRaw;
      if (expectedRaw.length > 8000000) throw new Error('oversized');
      const data = JSON.parse(expectedRaw);
      if (data?.schemaVersion !== STORAGE_SCHEMA_VERSION || !Number.isSafeInteger(data.revision) || data.revision < 0 || !Array.isArray(data.records) || data.records.length > 1000 || !Array.isArray(data.isolated)) throw new Error('unsupported-or-invalid');
      revision = data.revision;
      if (data.activeId !== undefined && data.activeId !== null && typeof data.activeId !== 'string') throw new Error('invalid-pointer');
      activeId = data.activeId || null;
      // Isolated payloads remain opaque; never execute, silently delete or trust them as grades.
      isolated = data.isolated.map(item => ({ raw: typeof item.raw === 'string' ? item.raw : JSON.stringify(item), reason: String(item.reason || 'unknown'), at: String(item.at || now()) }));
      const ids = new Set(), originals = new Map(); let changed = false;
      for (const item of data.records) {
        try {
          if (typeof item?.savedAt !== 'string' || !Number.isFinite(Date.parse(item.savedAt))) throw new Error('invalid-date');
          const state = decodePracticeRecord(item.record, { migrations }), id = state.attempt.id;
          if (item.record.schemaVersion !== 1) changed = true;
          if (ids.has(id)) {
            if (entries.some(e => e.state.attempt.id === id)) { entries = entries.filter(e => e.state.attempt.id !== id); isolated.push({ raw: JSON.stringify(originals.get(id)), reason: 'duplicate-round', at: now() }); }
            throw new Error('duplicate-round');
          }
          ids.add(id); originals.set(id, item); entries.push({ savedAt: item.savedAt, state });
        } catch (error) { isolated.push({ raw: JSON.stringify(item), reason: error.code || 'invalid-record', at: now() }); changed = true; }
      }
      const kept = retain(entries); if (kept.length !== entries.length) changed = true;
      status = { kind: 'saved', message: isolated.length ? `已有 ${isolated.length} 筆隔離資料，其他有效回合仍可使用。` : '已恢復瀏覽器內的練習紀錄。' };
      if (changed) write(kept);
      return entries.map(e => copy(e.state));
    } catch (error) {
      if (expectedRaw !== null && typeof expectedRaw === 'string') {
        blocked = true; recoveryRaw = expectedRaw;
        status = { kind: 'error', code: 'blocked-records', message: '資料損壞或版本尚未支援，原始資料保持不動。請下載復原資料，或選擇備份後啟用新儲存。' };
      } else failure(error);
      return entries.map(e => copy(e.state));
    }
  }
  return {
    load,
    save(state) {
      const item = { state: copy(state), savedAt: now() };
      return write([...entries.filter(e => e.state.attempt.id !== state.attempt.id), item], state.attempt.id);
    },
    saveAll(states, currentId = activeId) {
      const next = new Map(entries.map(e => [e.state.attempt.id, e]));
      for (const state of states) {
        const old = next.get(state.attempt.id);
        const same = old && JSON.stringify(encodePracticeRecord(old.state)) === JSON.stringify(encodePracticeRecord(state));
        next.set(state.attempt.id, { state: copy(state), savedAt: same ? old.savedAt : now() });
      }
      return write([...next.values()], currentId);
    },
    getRecords: () => entries.map(e => copy(e.state)),
    getStatus: () => copy(status),
    getLatest() {
      const pointed = entries.find(e => e.state.attempt.id === activeId && e.state.attempt.status !== 'abandoned');
      if (pointed) return copy(pointed.state);
      const active = entries.filter(e => ['in-progress', 'paused'].includes(e.state.attempt.status));
      const pool = active.length ? active : entries;
      return copy([...pool].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))[0]?.state || null);
    },
    recovery() { return { schemaVersion: 1, original: blocked ? recoveryRaw : null, isolated: copy(isolated) }; },
    recoverWithBackup() {
      if (!blocked || recoveryRaw === null) return false;
      try {
        if (storage.getItem(STORAGE_KEY) !== expectedRaw) throw Object.assign(new Error('conflict'), { code: 'storage-conflict' });
        const key = `${STORAGE_KEY}.recovery.${now()}.${Math.random().toString(36).slice(2)}`;
        storage.setItem(key, recoveryRaw);
        if (storage.getItem(key) !== recoveryRaw) throw new Error('backup-failed');
        // The old bytes are verified at a separate key before any replacement.
        blocked = false; isolated = [{ raw: recoveryRaw, reason: 'original-store-backup', at: now() }];
        const success = write(entries); if (!success) blocked = true;
        return success;
      } catch (error) { return failure(error); }
    },
  };
}
