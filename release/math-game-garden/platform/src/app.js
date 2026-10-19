import { units } from './config/units.js';
import { renderHome } from './ui/home.js';
import { createPracticeSession } from './practice-live/session.js';
import { mountLivePractice } from './practice-live/controller.js';
import { encodePracticeRecord } from './practice-records/codec.js';
import { createPracticeStore, STORAGE_KEY } from './practice-records/store.js';
import { recordsToolbar, historyMarkup, reviewMarkup, abandonMarkup } from './practice-records/view.js';

export function mountPlatform(root, env = window, makeSession = createPracticeSession, baseURL = new URL('../', import.meta.url), options = {}) {
  const base = new URL(baseURL), practice = new URL('practice/', base);
  let backend; try { backend = env.localStorage; } catch { backend = null; }
  const store = options.store || createPracticeStore(backend);
  const registry = new Map(store.load().map(state => [state.attempt.id, state]));
  let session = null, unsubscribe = null, ui = null, route = 'home', panel = null, selected = null, pendingSession = null, message = '';
  function updateNotice() {
    const status = store.getStatus(), node = root.querySelector('#save-status');
    if (node) { node.textContent = status.message; node.dataset.state = status.kind; node.setAttribute('role', status.kind === 'error' ? 'alert' : 'status'); }
    const alert = root.querySelector('#records-message'); if (alert) alert.textContent = message;
    const retry = root.querySelector('#records-retry'); if (retry) retry.disabled = status.kind !== 'error';
    const recover = root.querySelector('#records-recover'); if (recover) recover.disabled = store.recovery().original === null;
    const current = root.querySelector('#records-current'); if (current) current.disabled = !session && !registry.size;
  }
  function flush() {
    const success = store.saveAll([...registry.values()], session?.getState().attempt.id);
    if (success) { registry.clear(); for (const s of store.getRecords()) registry.set(s.attempt.id, s); }
    updateNotice(); return success;
  }
  function remember(state) { registry.set(state.attempt.id, state); flush(); }
  function attach(next) { unsubscribe?.(); session = next; unsubscribe = session.subscribe(remember); remember(session.getState()); }
  function ensureSession() {
    if (session && session.getState().attempt.status !== 'abandoned') return;
    const states = [...registry.values()].filter(s => s.attempt.status !== 'abandoned');
    const active = states.filter(s => ['in-progress', 'paused'].includes(s.attempt.status));
    const pointed = store.getLatest();
    const saved = (pointed && pointed.attempt.status !== 'abandoned' && registry.get(pointed.attempt.id)) || (active.length ? active : states).sort((a, b) => Date.parse(b.attempt.startedAt) - Date.parse(a.attempt.startedAt))[0];
    attach(saved ? makeSession({ savedRecord: encodePracticeRecord(saved) }) : makeSession());
  }
  function managed(id) {
    if (session?.getState().attempt.id === id) return session;
    const state = registry.get(id); if (!state) throw new Error('找不到回合');
    return makeSession({ savedRecord: encodePracticeRecord(state) });
  }
  function isSaved(state) {
    const saved = store.getRecords().find(s => s.attempt.id === state.attempt.id);
    return !!saved && JSON.stringify(encodePracticeRecord(saved)) === JSON.stringify(encodePracticeRecord(state));
  }
  function render() {
    ui?.dispose(); ui = null;
    route = env.location.pathname.replace(/index\.html$/, '') === practice.pathname ? 'practice' : 'home';
    if (panel) session?.pause('home');
    if (panel === 'history') root.innerHTML = recordsToolbar() + historyMarkup([...registry.values()], isSaved);
    else if (panel === 'review' || panel === 'review-all') {
      const state = registry.get(selected);
      root.innerHTML = recordsToolbar() + (state && ['completed', 'abandoned'].includes(state.attempt.status) ? reviewMarkup(state, panel === 'review-all') : historyMarkup([...registry.values()], isSaved));
    } else if (panel === 'confirm') root.innerHTML = recordsToolbar() + abandonMarkup(pendingSession.getState());
    else if (panel === 'recover') root.innerHTML = recordsToolbar() + '<section class="records-page"><h1 id="records-title" tabindex="-1">先保留原始資料，再啟用新儲存</h1><p>系統會先把無法讀取的原始內容另存到獨立復原鍵並驗證，成功後才建立可用儲存。建議先下載備份；原始內容不會被直接丟棄。</p><button type="button" data-record-action="confirm-recover">確認備份並啟用</button><button type="button" data-record-action="history">取消</button></section>';
    else if (route === 'practice') {
      ensureSession();
      if (session.getState().attempt.pendingAbandonRequestId) { pendingSession = session; panel = 'confirm'; render(); return; }
      ui = mountLivePractice(root, session, { onHome: () => env.location.assign(new URL('game-garden/',base).href), onReview: id => { selected = id; panel = 'review'; render(); }, onRestart: startNew });
    } else { session?.pause('home'); renderHome(root, units); root.innerHTML += recordsToolbar(); }
    const doc = root.ownerDocument;
    if (doc) {
      doc.title = panel ? '練習成果與錯題回顧｜根式冒險樂園' : route === 'practice' ? '根式化簡自主練習｜根式冒險樂園' : '根式冒險樂園｜學習大廳';
      for (const a of doc.querySelectorAll('.brand, [data-home]')) a.href = new URL('game-garden/',base).href;
      const skip = doc.querySelector('.skip-link'); if (skip) skip.href = panel ? '#records-title' : route === 'practice' ? '#practice-title' : '#units';
    }
    updateNotice();
    if (panel) root.querySelector('#records-title')?.focus();
  }
  function navigate(url) { panel = null; message = ''; env.history.pushState(null, '', url); render(); }
  function startNew() {
    if ([...registry.values()].some(s => ['in-progress', 'paused'].includes(s.attempt.status))) {
      message = '還有未完成回合，請先繼續練習，或明確確認放棄。'; panel = 'history'; render(); return;
    }
    attach(makeSession()); navigate(practice);
  }
  function download() {
    const raw = JSON.stringify({ exportVersion: 1, records: [...registry.values()].map(encodePracticeRecord), recovery: store.recovery() }, null, 2);
    if (options.download) return options.download(raw);
    const url = env.URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = root.ownerDocument.createElement('a'); a.href = url; a.download = 'radical-practice-recovery.json'; a.click();
    setTimeout(() => env.URL.revokeObjectURL(url), 1000);
  }
  function recordAction(event) {
    const b = event.target.closest('button'); if (!b || b.disabled || !b.dataset.recordAction) return;
    event.preventDefault(); const action = b.dataset.recordAction, id = b.dataset.round;
    try {
      message = '';
      if (action === 'history') { panel = 'history'; render(); }
      else if (action === 'current') navigate(practice);
      else if (action === 'new') startNew();
      else if (action === 'retry') { flush(); render(); }
      else if (action === 'export') { download(); message = '已準備下載備份，請確認檔案已儲存。'; updateNotice(); }
      else if (action === 'recover') { panel = 'recover'; render(); }
      else if (action === 'confirm-recover') { if (store.recoverWithBackup()) flush(); panel = 'history'; render(); }
      else if (action === 'continue') { session?.pause('home'); attach(managed(id)); navigate(practice); }
      else if (action === 'review' || action === 'review-all') { selected = id; panel = action; render(); }
      else if (action === 'abandon') { pendingSession = managed(id); pendingSession.requestAbandon(); remember(pendingSession.getState()); panel = 'confirm'; render(); }
      else if (action === 'cancel-abandon' || action === 'confirm-abandon') {
        if (!pendingSession || pendingSession.getState().attempt.id !== id) throw new Error('missing-confirmation');
        action === 'confirm-abandon' ? pendingSession.confirmAbandon() : pendingSession.cancelAbandon(); remember(pendingSession.getState());
        if (action === 'confirm-abandon' && session === pendingSession) { unsubscribe?.(); session = null; }
        pendingSession = null; panel = 'history'; render();
      }
    } catch { message = '這個操作尚未完成，資料仍保留在本頁，請重試或先下載備份。'; updateNotice(); }
  }
  function click(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (event.button !== undefined && event.button !== 0)) return;
    const a = event.target.closest('a'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, env.location.href);
    if (url.hash || url.origin !== base.origin || ![base.pathname, practice.pathname].includes(url.pathname)) return;
    event.preventDefault(); navigate(url);
  }
  const pop = () => { panel = null; render(); };
  const interrupt = () => { if (route === 'practice') session?.pause('interruption'); };
  const restore = () => { if (route === 'practice' && !panel) { session?.resume(); render(); } };
  const beforeUnload = event => { if (event && registry.size && store.getStatus().kind === 'error') { event.preventDefault(); event.returnValue = ''; } };
  const external = event => { if (event?.key === STORAGE_KEY) { message = '其他分頁的練習紀錄有變動。請先下載本頁備份，再重新整理載入最新資料。'; updateNotice(); } };
  env.addEventListener('popstate', pop); env.addEventListener('pagehide', interrupt); env.addEventListener('pageshow', restore); env.addEventListener('beforeunload', beforeUnload); env.addEventListener('storage', external);
  root.addEventListener('click', recordAction); root.ownerDocument?.addEventListener('click', click);
  render();
  return { getSession: () => session, getHistory: () => [...registry.values()].filter(s => s.attempt.id !== session?.getState().attempt.id).map(s => structuredClone(s.attempt)), getStore: () => store,
    dispose() { ui?.dispose(); unsubscribe?.(); root.removeEventListener('click', recordAction); root.ownerDocument?.removeEventListener('click', click); env.removeEventListener('popstate', pop); env.removeEventListener('pagehide', interrupt); env.removeEventListener('pageshow', restore); env.removeEventListener('beforeunload', beforeUnload); env.removeEventListener('storage', external); } };
}
