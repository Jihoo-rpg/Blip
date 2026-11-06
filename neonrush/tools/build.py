# Inlines src/*.js into src/template.html -> index.html (single-file game).
#   python3 tools/build.py          -> Blip 허브용 (🏠 허브 버튼 + common/blip.js)
#   python3 tools/build.py --solo   -> 혼자 돌아가는 버전
import os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'src')
t = open(os.path.join(src, 'template.html'), encoding='utf-8').read()
for k, f in [('ENGINE', 'engine.js'), ('LEVELS', 'levels.js'), ('ART', 'art.js'), ('AUDIO', 'audio.js'), ('GAME', 'game.js')]:
    t = t.replace('/*%s*/' % k, open(os.path.join(src, f), encoding='utf-8').read())
if '--solo' not in sys.argv:
    t = t.replace('</style>', '  .hubBack{position:absolute;right:14px;top:14px;z-index:6;display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border-radius:20px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:#fff;font-size:14px;text-decoration:none;font-family:inherit}\n  .hubBack:hover{background:rgba(255,255,255,.22)}\n</style>', 1)
    t = t.replace('<div id="menu" class="ov shade">', '<div id="menu" class="ov shade">\n  <a href="../hub/" class="hubBack" aria-label="허브로 돌아가기">🏠 허브</a>', 1)
    t = t.replace('</body>', '<script src="../common/blip.js" data-game="neonrush"></script>\n</body>', 1)
out = os.path.join(root, 'index.html')
open(out, 'w', encoding='utf-8').write(t)
print('built', out, '(solo)' if '--solo' in sys.argv else '(blip hub)')
