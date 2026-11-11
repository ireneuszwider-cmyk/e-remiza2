/* Kanał alarmowy łączący aplikację SKKW/SWD-ST (index.html) z e-Remizą (remiza.html).
 *
 * TRYB LOKALNY (domyślny, DB_URL puste): działa tylko między kartami tej samej przeglądarki
 *   na tym samym komputerze – do testów.
 * TRYB ONLINE: wklej poniżej adres bazy Firebase Realtime Database, np.
 *   "https://twoj-projekt-default-rtdb.europe-west1.firebasedatabase.app"
 *   Wtedy alarmy docierają między różnymi urządzeniami.
 */
window.AlarmChannel = (function () {
  const DB_URL = "https://skkw-alarm-default-rtdb.europe-west1.firebasedatabase.app";

  const base = DB_URL.replace(/\/+$/, "");
  const online = !!base;
  const LSK = "skkw-alarm-msg";
  let bc = null;
  try { bc = new BroadcastChannel("skkw-alarm"); } catch (e) {}

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function send(msg) {
    msg.id = msg.id || uid();
    msg.ts = new Date().toISOString();
    if (online) {
      return fetch(base + "/zdarzenia.json", { method: "POST", body: JSON.stringify(msg) })
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); });
    }
    try { if (bc) bc.postMessage(msg); } catch (e) {}
    try { localStorage.setItem(LSK, JSON.stringify(msg)); } catch (e) {}
    return Promise.resolve();
  }

  // onMsg(wiadomość, czyHistoria); onStatus(czyPołączono)
  function listen(onMsg, onStatus) {
    const seen = new Set();
    const deliver = (m, hist) => {
      if (!m || !m.id || seen.has(m.id)) return;
      seen.add(m.id);
      try { onMsg(m, !!hist); } catch (e) { console.error(e); }
    };
    if (online) {
      let first = true;
      const es = new EventSource(base + "/zdarzenia.json");
      es.addEventListener("open", () => onStatus && onStatus(true));
      es.addEventListener("error", () => onStatus && onStatus(false));
      es.addEventListener("put", (e) => {
        let d; try { d = JSON.parse(e.data); } catch (x) { return; }
        if (d.path === "/") {
          // pełny stan: za pierwszym razem to historia, po ponownym połączeniu – to, co nas ominęło
          const all = Object.values(d.data || {}).sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
          all.forEach((m) => deliver(m, first));
          first = false;
        } else if (d.data) {
          deliver(d.data, false);
        }
      });
    } else {
      onStatus && onStatus(true);
      if (bc) bc.onmessage = (e) => deliver(e.data, false);
      window.addEventListener("storage", (e) => {
        if (e.key === LSK && e.newValue) { try { deliver(JSON.parse(e.newValue), false); } catch (x) {} }
      });
    }
  }

  return { send, listen, uid, online, mode: online ? "online" : "tryb lokalny" };
})();
