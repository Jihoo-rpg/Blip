# Blip
This is blip company.

## blip games
허브 하나에서 모든 게임을 해요: **https://jihoo-rpg.github.io/Blip/hub/**

| 게임 | 주소 | 파일 |
|---|---|---|
| 🐾 냥냥 점프 | /Blip/catjump/ | `catjump/index.html` |
| 🦠 바이러스 시뮬레이터 | /Blip/virus/ | `virus/index.html`, `virus/style.css`, `virus/script.js`, `virus/data/world.js` |
| 🪐 쌍성 궤도 | /Blip/balldance/ | `balldance/index.html` |
| 🐄 머드락 섬 | /Blip/mudlark/ | `mudlark/index.html` (3D 생존 로그라이크) |
| 🏀 하프코트 레전드 | /Blip/hoops/ | `hoops/index.html` (3D 1대1 농구 · 로비 · 뽑기) |
| 💥 차를 부수세요 | /Blip/carcrash/ | `carcrash/index.html` (3D 자동차 파괴 · cannon-es 물리 · 파괴 기계 10개) |
| 📱 폰 공장 타이쿤 | /Blip/phonetycoon/ | `phonetycoon/index.html` (휴대폰 회사 경영 · 칩 블록 설계 · 3D 시제품 조립 · 광고 영상 만들기) |
| 🎱 당구 마스터 3D | /Blip/billiards/ | `billiards/index.html` (3D 당구 · 포켓볼/4구/3구 · 회전 물리 · AI · 온라인) |
| 🏙️ STA 1 | /Blip/seoul/ | `seoul/index.html` + `seoul/js/` (3D 오픈월드 · 서울 배경 · 차/오토바이 · 총 · 경찰/특공대/헬기 · 휴대폰 · 옷 · 은행 털기 등 작전 · NPC 음성(Kokoro TTS로 미리 만듦) · 유튜브 배경음악) |
| ⚽ 블립 풋볼 11 | /Blip/soccer/ | `soccer/index.html` + `soccer/js/` (3D 11대11 축구 · 국가대표 16팀(가상 선수 이름) · 선수 모델/모션은 `seoul/` 것을 같이 씀 · `teams.js` 팀/포메이션 · `db.js` 실제 선수 카드(능력치 6개) · `club.js` 나만의 구단/뽑기/AI 구단 · `stadium.js` 경기장 · `players.js` 유니폼 셰이더/동작 · `match.js` 공 물리/규칙/AI · `ui.js` 조작/카메라/리플레이/소리/메뉴 · `net.js` 온라인 1:1 (Firebase `hub/soccer` + P2P)) |
| 🌆 STA 2 | /Blip/seoul2/ | `seoul2/index.html` + `seoul2/js/` (STA 1 코드를 복사해 키운 버전 · 모델/음성/라이브러리는 `seoul/` 것을 같이 씀 · `intro.js` 오프닝 · `s2_core.js` 레벨/업적/날씨/치트 · `s2_drive.js` 니트로/스턴트/튜닝 · `s2_weap.js` 새 무기/폭발 · `s2_act.js` 레이스/광란/자경단/청부/꾸러미/수출/거리 사건/부동산 · `s2_phone.js` 새 앱 · `s3_world.js` 강원도 지형/도로/마을/교통 · `s3_cars.js` 새 차 모델/대리점/내 차 · `s3_life.js` 배고픔/피로/날짜/은행/집 · `s3_jobs.js` 직업 7개/면허/시험 · `s3_company.js` 회사 경영/폰 공장 타이쿤 연결 · `s3_phone.js` 생활 앱 · `s4_city.js` 공원 4곳/거리 소품 · `s4_shops.js` 모든 가게 실내 · `start.js` 시작) |
| 🔷 네온 러시 | /Blip/neonrush/ | `neonrush/index.html` (리듬 플랫포머 · 16레벨 · 난이도 얼굴 6단계 · 아이콘 키트 · 연습 모드 · 쉽 모드 · `neonrush/src/` 원본 코드 · `neonrush/tools/gen.js` 박자 맞춤 레벨 생성 + 공정성 검사 · `python3 neonrush/tools/build.py`로 빌드) |

- 📮 허브의 「게임 요청」 우편함: 누구나 만들고 싶은 게임을 보내고(24시간 안에 만들어 줌), 받는 계정에는 허브·모든 게임 화면에서 알림이 와요. 받는 계정 등록은 `hub/?owner`에서 로그인 후 한 번 누르면 돼요(Firebase `hub/gamereq`, `hub/gamereqOwner`).
- 모든 게임 화면에 「🏠 허브」 버튼이 있어요.
- 예전 냥냥 점프 주소(`/CatJump/CatJump.html`)는 새 주소로 자동 이동해요.
- 새 게임은 폴더를 하나 만들고 `hub/index.html`의 `GAMES` 목록에 한 줄 추가하면 돼요.
- 바이러스 시뮬레이터 지도: Natural Earth 1:110m(퍼블릭 도메인). 바이러스 특성은 모두 게임용 가상 능력이에요.
