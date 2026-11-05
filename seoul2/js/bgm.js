'use strict';
/* ===== 배경음악 (유튜브 영상을 작은 플레이어로 틀어요) ===== */
const BGM = { vid: 'qOzL8-u3fjo', player: null, on: true, ready: false, api: false, duck: false };
try { const v = localStorage.getItem('sta2_bgm'); if (v === '0') BGM.on = false; } catch (e) { }
function bgmStart() {
  if (!BGM.on || BGM.player) { if (BGM.player && BGM.ready) BGM.player.playVideo(); return; }
  $('#bgm').hidden = false;
  const make = () => { BGM.player = new YT.Player('bgmFrame', { videoId: BGM.vid, width: 200, height: 113, playerVars: { autoplay: 1, loop: 1, playlist: BGM.vid, controls: 1, playsinline: 1, rel: 0, modestbranding: 1 },
    events: { onReady: e => { BGM.ready = true; e.target.setVolume(38); e.target.playVideo(); }, onError: () => { toast('🎵 이 영상은 다른 사이트에서 재생할 수 없게 막혀 있어요'); bgmStop(); } } }); };
  if (window.YT && YT.Player) make(); else { window.onYouTubeIframeAPIReady = make; if (!BGM.api) { BGM.api = true; const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { toast('🎵 배경음악을 불러오지 못했어요'); $('#bgm').hidden = true; }; document.head.appendChild(s); } }
}
function bgmStop() { if (BGM.player && BGM.player.destroy) BGM.player.destroy(); BGM.player = null; BGM.ready = false; $('#bgm').innerHTML = '<div class="bgmBar"><span>🎵 배경음악</span><button id="bgmX">✕</button></div><div id="bgmFrame"></div>'; $('#bgmX').onclick = bgmOff; $('#bgm').hidden = true; }
function bgmOff() { BGM.on = false; try { localStorage.setItem('sta2_bgm', '0'); } catch (e) { } bgmStop(); }
function bgmToggle() { BGM.on = !BGM.on; try { localStorage.setItem('sta2_bgm', BGM.on ? '1' : '0'); } catch (e) { } if (BGM.on) bgmStart(); else bgmStop(); }
/* 차에서 라디오를 켜면 배경음악을 줄여요 */
function bgmDuck(on) { if (!BGM.ready || BGM.duck === on) return; BGM.duck = on; try { BGM.player.setVolume(on ? 0 : 38); } catch (e) { } }
$('#bgmX').onclick = bgmOff;
