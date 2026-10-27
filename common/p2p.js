/* blip P2P — 친구끼리 직접 연결(WebRTC)해서 렉·딜레이를 줄여요.
   Firebase는 처음 연결할 때(주소 교환)만 쓰고, 연결되면 게임 데이터는 서버를 거치지 않고 바로 오가요.
   직접 연결이 안 되는 인터넷이면 자동으로 예전처럼 Firebase로 주고받아요.

   const L = P2P.link(방이름, 내아이디, (보낸사람, 데이터) => {...});
   L.connect(상대아이디)   // 양쪽 다 불러도 됨 (아이디가 작은 쪽이 먼저 연결 요청)
   L.send(데이터)          // 연결된 모두에게 (빠르지만 가끔 빠질 수 있음 → 최신 상태 전송용)
   L.open(상대) / L.any()  // 연결됐는지
   L.rtt(상대)             // 왕복 지연(ms)
   L.close()
*/
(function () {
  if (window.P2P) return;
  const FB = () => (window.BLIP_FB || 'https://cat-jump-3afbb-default-rtdb.firebaseio.com') + '/rtc/';
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }];
  const safe = s => String(s).replace(/[.#$\[\]\/]/g, '_').slice(0, 60);
  const req = (path, method, body) => fetch(FB() + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body), keepalive: method === 'DELETE' })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);
  const ok = typeof RTCPeerConnection === 'function';

  function gathered(pc, ms) {
    return new Promise(res => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, ms);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  }

  function link(room, me, onMsg) {
    room = safe(room); me = safe(me);
    const peers = {};
    let closed = false, es = null;
    const L = {
      me, room,
      connect(id) { id = safe(id); if (!ok || closed || id === me) return; const P = peers[id] || (peers[id] = { id, tries: 0, next: 0 }); if (me < id && !P.pc) offer(P); },
      send(obj) { const s = JSON.stringify(obj); for (const id in peers) { const P = peers[id]; if (P.open) try { P.dc.send(s); } catch (e) { } } },
      sendTo(id, obj) { const P = peers[safe(id)]; if (P && P.open) try { P.dc.send(JSON.stringify(obj)); return true; } catch (e) { } return false; },
      open(id) { const P = peers[safe(id)]; return !!(P && P.open); },
      any() { for (const id in peers) if (peers[id].open) return true; return false; },
      rtt(id) { const P = id ? peers[safe(id)] : Object.values(peers).find(p => p.open); return P && P.open ? P.rtt : null; },
      close() {
        closed = true; if (es) es.close(); clearInterval(tick);
        for (const id in peers) drop(peers[id]);
        req(room + '/' + me, 'DELETE');
      },
    };
    if (!ok) return L;

    function drop(P) { P.open = false; try { if (P.dc) P.dc.close(); } catch (e) { } try { if (P.pc) P.pc.close(); } catch (e) { } P.pc = P.dc = null; }
    function wire(P, dc) {
      P.dc = dc;
      dc.onopen = () => { P.open = true; P.openAt = performance.now(); P.lastIn = performance.now(); };
      dc.onclose = () => { P.open = false; };
      dc.onmessage = e => {
        P.lastIn = performance.now();
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m && m._p != null) { try { dc.send(JSON.stringify({ _q: m._p })); } catch (x) { } return; }
        if (m && m._q != null) { const r = performance.now() - m._q; P.rtt = P.rtt == null ? r : P.rtt * .7 + r * .3; return; }
        try { onMsg(P.id, m); } catch (x) { console.warn('p2p', x); }
      };
    }
    function mkPC(P) {
      drop(P);
      const pc = new RTCPeerConnection({ iceServers: ICE });
      P.pc = pc; P.start = performance.now();
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') { if (P.pc === pc) { P.open = false; } } };
      return pc;
    }
    async function offer(P) {
      if (closed || P.busy || P.open || performance.now() < P.next) return;
      P.busy = true; P.tries++;
      try {
        const pc = mkPC(P);
        wire(P, pc.createDataChannel('g', { ordered: false, maxRetransmits: 0 }));
        await pc.setLocalDescription(await pc.createOffer());
        await gathered(pc, 1500);
        if (closed || P.pc !== pc) return;
        P.nonce = Math.random().toString(36).slice(2, 10);
        await req(room + '/' + P.id + '/' + me, 'PUT', { k: 'o', sdp: pc.localDescription.sdp, n: P.nonce, t: { '.sv': 'timestamp' } });
      } catch (e) { console.warn('p2p offer', e); }
      finally { P.busy = false; }
    }
    async function answer(P, m) {
      if (P.ansN === m.n) return; P.ansN = m.n;
      try {
        const pc = mkPC(P);
        pc.ondatachannel = e => wire(P, e.channel);
        await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        await gathered(pc, 1500);
        if (closed || P.pc !== pc) return;
        await req(room + '/' + P.id + '/' + me, 'PUT', { k: 'a', sdp: pc.localDescription.sdp, n: m.n, t: { '.sv': 'timestamp' } });
      } catch (e) { console.warn('p2p answer', e); }
    }
    function onSignal(from, m) {
      if (!m || typeof m !== 'object' || !m.sdp) return;
      if (Date.now() - (Number(m.t) || 0) > 60000) return; // 예전 접속의 남은 신호
      const P = peers[from] || (peers[from] = { id: from, tries: 0, next: 0 });
      if (m.k === 'o' && me > from) answer(P, m);
      else if (m.k === 'a' && me < from && P.pc && m.n === P.nonce && P.pc.signalingState === 'have-local-offer')
        P.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }).catch(e => console.warn('p2p', e));
    }
    // 내 신호함 듣기
    req(room + '/' + me, 'DELETE').then(() => {
      if (closed) return;
      try {
        es = new EventSource(FB() + room + '/' + me + '.json');
        let tree = {};
        es.addEventListener('put', e => {
          try {
            const d = JSON.parse(e.data), ks = String(d.path).split('/').filter(Boolean);
            if (!ks.length) { tree = d.data || {}; for (const k in tree) onSignal(k, tree[k]); }
            else if (ks.length === 1) { tree[ks[0]] = d.data; onSignal(ks[0], d.data); }
          } catch (x) { }
        });
        es.addEventListener('patch', e => { try { const d = JSON.parse(e.data); for (const k in d.data) onSignal(k, d.data[k]); } catch (x) { } });
      } catch (e) { }
    });
    // 연결 유지: 지연 재기, 안 되면 다시 시도
    const tick = setInterval(() => {
      const now = performance.now();
      for (const id in peers) {
        const P = peers[id];
        if (P.open) {
          try { P.dc.send(JSON.stringify({ _p: now })); } catch (e) { }
          if (now - (P.lastIn || now) > 6000) { drop(P); P.next = now + 500; }
        } else if (me < id && !P.busy && P.pc && now - P.start > 7000 && P.tries < 6) { drop(P); P.next = now + 3000 * P.tries; }
        else if (me < id && !P.busy && !P.pc && P.tries < 6) offer(P);
      }
    }, 1000);
    return L;
  }
  window.P2P = { link, supported: ok };
})();
