'use strict';
/* ===== 실제 축구 선수 카드 =====
   '이름|나라|포지션|능력치|특기'   특기: P 빠름 · S 슈팅 · A 패스 · D 드리블 · F 수비 · H 몸싸움/헤더 · L 레전드
   능력치는 게임용으로 매긴 값이에요. 소속 팀은 자주 바뀌어서 나라만 적었어요. */
const NAT = { KOR: '🇰🇷', JPN: '🇯🇵', ARG: '🇦🇷', POR: '🇵🇹', FRA: '🇫🇷', NOR: '🇳🇴', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', BRA: '🇧🇷', EGY: '🇪🇬', ESP: '🇪🇸', POL: '🇵🇱', NGA: '🇳🇬', GEO: '🇬🇪', SWE: '🇸🇪', GER: '🇩🇪', BEL: '🇧🇪', NED: '🇳🇱', CRO: '🇭🇷', ITA: '🇮🇹', URU: '🇺🇾', COL: '🇨🇴', MAR: '🇲🇦', SEN: '🇸🇳', CAN: '🇨🇦', USA: '🇺🇸', MEX: '🇲🇽', DEN: '🇩🇰', SUI: '🇨🇭', AUT: '🇦🇹', SVN: '🇸🇮', SRB: '🇷🇸', TUR: '🇹🇷', CMR: '🇨🇲', GHA: '🇬🇭', CIV: '🇨🇮', ALG: '🇩🇿', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', ECU: '🇪🇨', HUN: '🇭🇺', UKR: '🇺🇦', GAB: '🇬🇦', SVK: '🇸🇰', CZE: '🇨🇿', RUS: '🇷🇺', IRL: '🇮🇪', AUS: '🇦🇺', IRN: '🇮🇷', KSA: '🇸🇦', CHI: '🇨🇱', PAR: '🇵🇾', GUI: '🇬🇳', MLI: '🇲🇱', LBR: '🇱🇷', NIR: '🏴', CRC: '🇨🇷', JAM: '🇯🇲', BIH: '🇧🇦', NZL: '🇳🇿' };
const PDB_RAW = `
리오넬 메시|ARG|FW|91|DAL
크리스티아누 호날두|POR|FW|90|SHP
킬리안 음바페|FRA|FW|92|PSD
엘링 홀란|NOR|FW|91|SHP
해리 케인|ENG|FW|90|SAH
비니시우스 주니오르|BRA|FW|90|PD
모하메드 살라|EGY|FW|89|PSD
라민 야말|ESP|FW|89|DPA
우스만 뎀벨레|FRA|FW|90|DPS
로베르트 레반도프스키|POL|FW|87|SH
라우타로 마르티네스|ARG|FW|88|SH
손흥민|KOR|FW|87|PSD
하피냐|BRA|FW|88|PSA
부카요 사카|ENG|FW|88|DPA
흐비차 크바라츠헬리아|GEO|FW|87|DP
훌리안 알바레스|ARG|FW|87|SP
알렉산데르 이삭|SWE|FW|87|SD
빅토르 오시멘|NGA|FW|86|SPH
빅토르 요케레스|SWE|FW|86|SPH
하파엘 레앙|POR|FW|86|PD
네이마르 주니오르|BRA|FW|85|DA
앙투안 그리즈만|FRA|FW|85|AS
마르쿠스 튀람|FRA|FW|84|PH
플로리안 비르츠|GER|MF|89|DA
자말 무시알라|GER|MF|89|DA
주드 벨링엄|ENG|MF|89|DAH
콜 파머|ENG|MF|87|AS
필 포든|ENG|MF|86|DA
케빈 더브라위너|BEL|MF|87|AS
로드리|ESP|MF|90|AF
페드리|ESP|MF|89|AD
마르틴 외데고르|NOR|MF|87|AD
브루노 페르난데스|POR|MF|87|AS
페데리코 발베르데|URU|MF|88|PF
데클런 라이스|ENG|MF|88|FA
비티냐|POR|MF|88|AD
주앙 네베스|POR|MF|86|AF
알렉시스 맥알리스터|ARG|MF|87|AF
니콜로 바렐라|ITA|MF|86|AF
가비|ESP|MF|85|FA
오렐리앵 추아메니|FRA|MF|86|FH
에두아르도 카마빙가|FRA|MF|84|FP
베르나르두 실바|POR|MF|86|DA
루카 모드리치|CRO|MF|85|A
토니 크로스|GER|MF|87|AL
일카이 귄도안|GER|MF|84|A
하칸 찰하놀루|TUR|MF|86|AS
엔소 페르난데스|ARG|MF|84|A
모이세스 카이세도|ECU|MF|87|F
파비안 루이스|ESP|MF|85|A
도미니크 소보슬러이|HUN|MF|85|SA
마이클 올리세|FRA|FW|87|DA
레안드로 트로사르|BEL|FW|83|SD
가브리에우 마르티넬리|BRA|FW|83|P
제레미 프림퐁|NED|DF|84|P
버질 반다이크|NED|DF|90|FH
윌리엄 살리바|FRA|DF|89|FP
김민재|KOR|DF|87|FH
후뱅 디아스|POR|DF|88|F
아슈라프 하키미|MAR|DF|88|PA
알레산드로 바스토니|ITA|DF|87|FA
요주아 키미히|GER|DF|88|AF
트렌트 알렉산더아널드|ENG|DF|86|A
안토니오 뤼디거|GER|DF|86|FH
누누 멘드스|POR|DF|87|PD
알폰소 데이비스|CAN|DF|84|P
테오 에르난데스|FRA|DF|85|PD
마르퀴뇨스|BRA|DF|86|F
요슈코 그바르디올|CRO|DF|86|FH
가브리에우 마갈량이스|BRA|DF|87|FH
에데르 밀리탕|BRA|DF|85|FP
윌리엄 파초|ECU|DF|85|FP
디오구 달롯|POR|DF|82|P
아레스 다무르|FRA|DF|80|F
쥘 쿤데|FRA|DF|86|FP
다요 우파메카노|FRA|DF|85|FH
리스 제임스|ENG|DF|83|A
앤디 로버트슨|SCO|DF|83|A
마테이스 더리흐트|NED|DF|83|FH
잔루이지 돈나룸마|ITA|GK|89|
티보 쿠르투아|BEL|GK|89|
알리송 베케르|BRA|GK|89|
얀 오블락|SVN|GK|87|
마르크안드레 테어슈테겐|GER|GK|87|
에데르송|BRA|GK|86|
에밀리아노 마르티네스|ARG|GK|87|
마이크 메냥|FRA|GK|86|
다비드 라야|ESP|GK|86|
마누엘 노이어|GER|GK|86|
그레고르 코벨|SUI|GK|86|
우나이 시몬|ESP|GK|85|
디오구 코스타|POR|GK|85|
조던 픽포드|ENG|GK|83|
조현우|KOR|GK|79|
김승규|KOR|GK|76|
스즈키 자이온|JPN|GK|76|
이강인|KOR|MF|85|DA
황희찬|KOR|FW|80|PS
황인범|KOR|MF|80|A
이재성|KOR|MF|79|A
오현규|KOR|FW|77|SH
조규성|KOR|FW|76|H
설영우|KOR|DF|76|P
배준호|KOR|MF|76|D
양민혁|KOR|FW|73|P
정우영|KOR|MF|74|P
백승호|KOR|MF|74|A
김진수|KOR|DF|73|A
조유민|KOR|DF|73|F
정승현|KOR|DF|72|F
옌스 카스트로프|KOR|MF|76|F
엄지성|KOR|FW|73|P
홍현석|KOR|MF|74|A
박용우|KOR|MF|72|F
이태석|KOR|DF|72|A
미토마 가오루|JPN|FW|83|DP
구보 다케후사|JPN|FW|83|DA
엔도 와타루|JPN|MF|80|F
도미야스 다케히로|JPN|DF|80|F
가마다 다이치|JPN|MF|80|A
이토 히로키|JPN|DF|80|F
모리타 히데마사|JPN|MF|78|A
우에다 아야세|JPN|FW|78|SH
이타쿠라 고|JPN|DF|78|F
나카무라 게이토|JPN|FW|77|D
리야드 마레즈|ALG|FW|83|DA
사디오 마네|SEN|FW|83|P
칼리두 쿨리발리|SEN|DF|82|F
에두아르 멘디|SEN|GK|81|
아프라임 오나나|CMR|GK|81|
브라이언 음뵈모|CMR|FW|85|PS
모하메드 쿠두스|GHA|FW|84|D
세루 기라시|GUI|FW|84|SH
아데몰라 루크먼|NGA|FW|84|DS
빅터 보니페이스|NGA|FW|82|PH
루이스 디아스|COL|FW|86|DP
하메스 로드리게스|COL|MF|80|A
다르윈 누녜스|URU|FW|82|PS
로날드 아라우호|URU|DF|85|FP
루이스 수아레스|URU|FW|80|SL
크리스티안 풀리식|USA|FW|85|DP
웨스턴 매케니|USA|MF|80|F
티머시 웨아|USA|FW|78|P
산티아고 히메네스|MEX|FW|82|SH
에드손 알바레스|MEX|MF|82|F
라울 히메네스|MEX|FW|79|SH
기예르모 오초아|MEX|GK|79|
라스무스 회이룬|DEN|FW|81|PS
크리스티안 에릭센|DEN|MF|80|A
피에르에밀 호이비에르|DEN|MF|80|F
그라니트 자카|SUI|MF|84|A
마누엘 아칸지|SUI|DF|84|F
다비드 알라바|AUT|DF|83|A
마르셀 자비처|AUT|MF|82|A
베냐민 세슈코|SVN|FW|82|SH
두샨 블라호비치|SRB|FW|82|SH
알렉산다르 미트로비치|SRB|FW|80|H
아르다 귈레르|TUR|MF|83|DA
케난 일디즈|TUR|FW|84|D
도니얼 말런|NED|FW|82|S
코디 학포|NED|FW|84|PD
멤피스 데파이|NED|FW|80|S
프렝키 더용|NED|MF|87|AD
티자니 레인더르스|NED|MF|85|A
라이언 흐라번베르흐|NED|MF|86|FD
스콧 맥토미니|SCO|MF|86|SH
가레스 베일|WAL|FW|86|PSL
로멜루 루카쿠|BEL|FW|82|H
제레미 도쿠|BEL|FW|83|PD
아마두 오나나|BEL|MF|80|F
기오르기 마마르다슈빌리|GEO|GK|85|
루카 요비치|SRB|FW|76|S
페데리코 키에사|ITA|FW|82|PD
잔루카 스카마카|ITA|FW|79|H
산드로 토날리|ITA|MF|85|AF
마테오 레테기|ITA|FW|83|S
리카르도 칼라피오리|ITA|DF|83|F
다비데 프라테시|ITA|MF|80|P
조너선 데이비드|CAN|FW|83|S
닉 볼테마데|GER|FW|83|H
카이 하베르츠|GER|FW|84|SH
르로이 자네|GER|FW|84|PD
세르주 그나브리|GER|FW|83|P
토마스 뮐러|GER|FW|82|AL
요나탄 타|GER|DF|86|F
니코 슐로터베크|GER|DF|84|F
다니 올모|ESP|MF|86|AD
니코 윌리엄스|ESP|FW|86|PD
미켈 메리노|ESP|MF|83|A
마르크 쿠쿠레야|ESP|DF|84|F
페드로 포로|ESP|DF|83|A
딘 하위선|ESP|DF|84|F
알바로 모라타|ESP|FW|80|H
알레한드로 그리말도|ESP|DF|84|A
주앙 펠릭스|POR|FW|80|D
곤살루 하무스|POR|FW|81|S
페드루 네투|POR|FW|82|P
누노 타바레스|POR|DF|80|P
안토니오 실바|POR|DF|82|F
데지레 두에|FRA|FW|86|D
브래들리 바르콜라|FRA|FW|84|P
킹슬레 코망|FRA|FW|83|P
랑달 콜로 무아니|FRA|FW|80|P
아드리앙 라비오|FRA|MF|83|A
워렌 자이르에메리|FRA|MF|82|A
마누 코네|FRA|MF|83|F
은골로 캉테|FRA|MF|82|FL
루카 에르난데스|FRA|DF|81|F
이브라히마 코나테|FRA|DF|86|FP
마크 게히|ENG|DF|84|F
존 스톤스|ENG|DF|83|A
카일 워커|ENG|DF|82|P
앤서니 고든|ENG|FW|83|P
에베레치 에제|ENG|MF|84|D
모건 로저스|ENG|MF|83|D
엘리엇 앤더슨|ENG|MF|82|F
코너 갤러거|ENG|MF|81|F
올리 왓킨스|ENG|FW|83|S
마커스 래시퍼드|ENG|FW|81|P
재러드 보언|ENG|FW|82|S
에반 퍼거슨|IRL|FW|74|H
제이미 바디|ENG|FW|78|SL
라힘 스털링|ENG|FW|78|P
잭 그릴리시|ENG|MF|80|D
엔드릭|BRA|FW|78|S
호드리구|BRA|FW|85|DP
카제미루|BRA|MF|81|F
브루노 기마랑이스|BRA|MF|86|AF
루카스 파케타|BRA|MF|83|A
가브리에우 제주스|BRA|FW|80|D
앙투앙 세메뇨|GHA|FW|83|PS
이스테방 윌리앙|BRA|FW|79|D
조르지뉴|ITA|MF|80|A
파울로 디발라|ARG|FW|83|DA
엔소 바렐라|ARG|DF|80|F
크리스티안 로메로|ARG|DF|86|FH
리산드로 마르티네스|ARG|DF|83|F
나우엘 몰리나|ARG|DF|80|P
로드리고 데파울|ARG|MF|83|A
지오반니 시메오네|ARG|FW|79|P
알레한드로 가르나초|ARG|FW|80|P
니코 곤살레스|ARG|FW|80|P
앙헬 디마리아|ARG|FW|81|DAL
세르히오 아구에로|ARG|FW|86|SL
`;
/* 전설 (은퇴 선수) */
const LEGEND_RAW = `
펠레|BRA|FW|98|SDPL
디에고 마라도나|ARG|FW|97|DAL
지네딘 지단|FRA|MF|96|DAL
호나우두|BRA|FW|96|SPDL
요한 크루이프|NED|FW|95|DAL
호나우지뉴|BRA|FW|94|DAL
프란츠 베켄바워|GER|DF|94|FAL
파올로 말디니|ITA|DF|94|FL
티에리 앙리|FRA|FW|93|PSL
페렌츠 푸스카스|HUN|FW|94|SL
레프 야신|RUS|GK|94|L
잔루이지 부폰|ITA|GK|93|L
안드레스 이니에스타|ESP|MF|92|DAL
사비 에르난데스|ESP|MF|92|AL
안드레아 피를로|ITA|MF|91|AL
카카|BRA|MF|91|DPL
즐라탄 이브라히모비치|SWE|FW|91|SHL
호베르투 카를루스|BRA|DF|90|PSL
웨인 루니|ENG|FW|90|SL
스티븐 제라드|ENG|MF|90|SAL
차범근|KOR|FW|91|SPL
박지성|KOR|MF|89|PFL
데이비드 베컴|ENG|MF|89|AL
프랑크 람파드|ENG|MF|89|SL
디디에 드로그바|CIV|FW|89|SHL
세르히오 라모스|ESP|DF|89|FHL
카를레스 푸욜|ESP|DF|89|FL
파비오 칸나바로|ITA|DF|90|FL
에덴 아자르|BEL|FW|89|DL
아르연 로번|NED|FW|89|PDL
루이스 피구|POR|FW|89|DAL
에우제비우|POR|FW|93|SPL
마르코 판바스턴|NED|FW|93|SL
조지 웨아|LBR|FW|90|PSL
홍명보|KOR|DF|86|FL
안정환|KOR|FW|85|SL
이영표|KOR|DF|84|PL
이동국|KOR|FW|84|SL
`;
const RARITY = [{ k: 'L', n: '레전드', c: '#ff4df0', min: 0 }, { k: 'W', n: '월드클래스', c: '#22d3ee', min: 88 }, { k: 'G', n: '골드', c: '#ffd400', min: 80 }, { k: 'S', n: '실버', c: '#cfd6e4', min: 72 }, { k: 'B', n: '브론즈', c: '#c98a4b', min: 0 }];
const PDB = []; (function () {
  const add = (raw, leg) => raw.trim().split('\n').forEach(line => { const [n, nat, pos, o, tg] = line.split('|'); if (!n || PDB.some(p => p.n === n)) return; PDB.push({ id: PDB.length, n, nat, pos, o: +o, tg: (tg || '').replace('L', ''), leg: leg || (tg || '').includes('L') }); });
  add(PDB_RAW, false); add(LEGEND_RAW, true);
  // 능력치 6개 만들기 (빠르기 · 슈팅 · 패스 · 드리블 · 수비 · 골키퍼)
  for (const p of PDB) {
    const o = p.o, t = p.tg, h = [...p.n].reduce((a, c) => a * 33 + c.charCodeAt(0), 5) >>> 0, r = k => ((h >>> (k * 3)) % 7) - 3;
    const base = { FW: [o - 3, o + 1, o - 7, o - 3, o - 35, 30], MF: [o - 6, o - 6, o + 1, o - 2, o - 15, 30], DF: [o - 7, o - 30, o - 10, o - 14, o + 2, 30], GK: [o - 35, o - 50, o - 25, o - 40, o - 40, o + 1] }[p.pos];
    const b = { P: [7, 0, 0, 1, 0], S: [0, 6, 0, 0, 0], A: [0, 0, 6, 1, 0], D: [1, 0, 1, 5, 0], F: [0, 0, 0, 0, 6], H: [0, 3, 0, -2, 3] };
    for (const c of t) if (b[c]) for (let i = 0; i < 5; i++) base[i] += b[c][i];
    p.st = { spd: clamp(base[0] + r(0), 35, 99), sht: clamp(base[1] + r(1), 25, 99), pas: clamp(base[2] + r(2), 30, 99), drb: clamp(base[3] + r(3), 30, 99), def: clamp(base[4] + r(4), 20, 99), gk: clamp(base[5], 20, 99) };
    p.r = p.leg ? 'L' : o >= 88 ? 'W' : o >= 80 ? 'G' : o >= 72 ? 'S' : 'B';
  }
  // 대표 선수 손보기
  const FIX = { '리오넬 메시': { drb: 97, pas: 94, spd: 85, sht: 92 }, '크리스티아누 호날두': { sht: 99, spd: 88, drb: 86 }, '킬리안 음바페': { spd: 99 }, '엘링 홀란': { sht: 98, spd: 90 }, '라민 야말': { drb: 94, spd: 88 }, '손흥민': { sht: 90, spd: 88, drb: 86 }, '김민재': { def: 92, spd: 84 }, '펠레': { sht: 99, drb: 98 }, '디에고 마라도나': { drb: 99 }, '호나우두': { spd: 97, sht: 98, drb: 97 } };
  for (const p of PDB) if (FIX[p.n]) Object.assign(p.st, FIX[p.n]);
  // 브론즈 · 실버 선수를 더 (가상 유망주): 뽑기에서 흔하게 나와요
  const sur = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'], gv = ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준우', '건우', '우진', '선우', '서진', '유준', '연우', '은우', '현우', '태윤', '승현'];
  const rnd = mulberry(77); const pos = ['GK', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW'];
  for (let i = 0; i < 70; i++) { const n = sur[Math.floor(rnd() * sur.length)] + gv[Math.floor(rnd() * gv.length)] + (i % 3 === 0 ? '' : ''); if (PDB.some(p => p.n === n)) continue; const ps = pos[Math.floor(rnd() * pos.length)]; const o = 58 + Math.floor(rnd() * 20); const p = { id: PDB.length, n, nat: 'KOR', pos: ps, o, tg: '', leg: false, prospect: true };
    const base = { FW: [o - 2, o, o - 6, o - 2, o - 30, 30], MF: [o - 4, o - 6, o + 1, o - 2, o - 12, 30], DF: [o - 5, o - 25, o - 8, o - 12, o + 2, 30], GK: [o - 30, o - 40, o - 20, o - 30, o - 30, o + 1] }[ps];
    p.st = { spd: clamp(base[0], 30, 99), sht: clamp(base[1], 25, 99), pas: clamp(base[2], 30, 99), drb: clamp(base[3], 30, 99), def: clamp(base[4], 20, 99), gk: clamp(base[5], 20, 99) }; p.r = o >= 72 ? 'S' : 'B'; PDB.push(p); }
})();
const RAR = k => RARITY.find(r => r.k === k);
const POSN = { GK: '골키퍼', DF: '수비수', MF: '미드필더', FW: '공격수' };
/* 선수 생김새: 나라 · 이름으로 정해져요 */

/* 유명 선수 외모 특징 (피부 0~5 · 머리색 · 머리 모양 · 수염) — 3D 모델과 카드 얼굴에 써요
   머리색 k 검정 · d 진갈색 · b 갈색 · g 붉은빛 · y 금발 · w 회색   모양 short · side · long · buzz · bald · afro · curly · bun · twist · mohawk */
const FACE_RAW = `리오넬 메시|1|d|side|1
크리스티아누 호날두|2|k|side|0
킬리안 음바페|4|k|buzz|0
엘링 홀란|0|y|bun|0
해리 케인|0|b|short|0
비니시우스 주니오르|4|k|twist|0
모하메드 살라|3|k|afro|1
라민 야말|3|k|curly|0
우스만 뎀벨레|5|k|buzz|1
로베르트 레반도프스키|0|b|short|1
라우타로 마르티네스|2|k|side|1
손흥민|1|k|side|0
하피냐|3|k|short|1
부카요 사카|5|k|curly|0
훌리안 알바레스|1|d|short|0
빅토르 오시멘|5|y|mohawk|1
네이마르 주니오르|2|b|side|1
앙투안 그리즈만|1|y|side|1
플로리안 비르츠|0|b|side|0
자말 무시알라|3|k|curly|0
주드 벨링엄|3|k|curly|0
콜 파머|1|b|side|0
필 포든|0|y|buzz|0
케빈 더브라위너|0|g|side|1
로드리|1|d|short|1
페드리|1|k|side|0
마르틴 외데고르|0|d|side|0
브루노 페르난데스|1|d|short|1
페데리코 발베르데|1|d|short|1
루카 모드리치|0|b|long|0
토니 크로스|0|y|short|1
버질 반다이크|4|k|buzz|1
김민재|1|k|short|0
아슈라프 하키미|3|k|short|1
알폰소 데이비스|5|k|buzz|0
마누엘 노이어|0|y|short|0
티보 쿠르투아|1|d|short|1
알리송 베케르|1|d|short|1
이강인|1|k|side|0
황희찬|1|k|side|0
조규성|1|k|side|0
미토마 가오루|0|k|side|0
구보 다케후사|0|k|side|0
사디오 마네|5|k|buzz|1
루이스 디아스|3|k|curly|0
루이스 수아레스|1|k|short|1
다르윈 누녜스|2|k|short|1
즐라탄 이브라히모비치|1|k|bun|1
펠레|5|k|buzz|0
디에고 마라도나|2|k|curly|0
지네딘 지단|1|w|bald|0
호나우두|3|k|bald|0
요한 크루이프|0|b|long|0
호나우지뉴|4|k|long|0
프란츠 베켄바워|0|b|side|0
파올로 말디니|1|d|long|0
티에리 앙리|4|k|bald|0
잔루이지 부폰|1|d|short|1
안드레스 이니에스타|0|b|bald|0
사비 에르난데스|1|k|short|1
안드레아 피를로|1|d|long|1
카카|1|d|short|0
호베르투 카를루스|4|k|bald|0
웨인 루니|0|b|buzz|0
스티븐 제라드|0|b|short|0
차범근|1|k|side|0
박지성|1|k|side|0
데이비드 베컴|0|y|side|1
디디에 드로그바|5|k|buzz|1
세르히오 라모스|2|d|short|1
카를레스 푸욜|1|b|curly|0
에덴 아자르|1|d|short|1
아르연 로번|0|y|bald|0
가레스 베일|0|d|bun|1
로멜루 루카쿠|5|k|buzz|1
은골로 캉테|5|k|buzz|0
카제미루|3|k|short|1
조르지 웨아|5|k|buzz|0
홍명보|1|k|side|0
안정환|1|d|long|0
이영표|1|k|short|0
이동국|1|k|short|0
앙헬 디마리아|1|d|bun|0
세르히오 아구에로|1|d|side|1
파울로 디발라|1|d|side|1
잭 그릴리시|0|b|side|0
마커스 래시퍼드|4|k|short|1
하파엘 레앙|4|k|twist|0
에두아르도 카마빙가|5|k|twist|0
오렐리앵 추아메니|5|k|buzz|0
엔드릭|3|k|curly|0`;
const FACE = {}; FACE_RAW.split('\n').forEach(l => { const [n, sk, hc, st, bd] = l.split('|'); FACE[n] = { sk: +sk, hc, st, bd: bd === '1' }; });
const HAIRC = { k: '#120f0d', d: '#2a1a10', b: '#5a3a20', g: '#b5652a', y: '#d9b56e', w: '#bdbdbd' };
function lookOf(p) {
  const h = [...p.n].reduce((a, c) => a * 31 + c.charCodeAt(0), 3) >>> 0; const rnd = mulberry(h);
  const dark = ['NGA', 'SEN', 'CMR', 'GHA', 'CIV', 'GUI', 'MLI', 'LBR', 'GAB', 'JAM'], mid = ['BRA', 'MAR', 'ALG', 'EGY', 'COL', 'ECU', 'MEX', 'TUR', 'URU', 'POR', 'ESP', 'ITA', 'ARG', 'FRA', 'USA', 'ENG', 'NED', 'BEL', 'CAN', 'IRN', 'KSA', 'CHI', 'PAR'], asia = ['KOR', 'JPN'];
  let sk; if (dark.includes(p.nat)) sk = S5[4 + Math.floor(rnd() * 2)]; else if (asia.includes(p.nat)) sk = S5[Math.floor(rnd() * 2)]; else if (mid.includes(p.nat)) sk = S5[Math.floor(rnd() * 6)]; else sk = S5[Math.floor(rnd() * 2)];
  const blond = !asia.includes(p.nat) && !dark.includes(p.nat) && rnd() < .18; const hr = rnd();
  const F = FACE[p.n]; if (F) { const bald = F.st === 'bald', buzz = F.st === 'buzz'; return { w: 0, skin: S5[F.sk], hair: HAIRC[F.hc] || '#120f0d', head: bald ? 'bald' : buzz ? 'buzz' : 'hair', hairStyle: bald || buzz ? 'short' : F.st, beard: F.bd, glasses: false, s: .97 + rnd() * .08, wide: 1 }; }
  return { w: 0, skin: sk, hair: blond ? '#c9a66b' : pick2(rnd, ['#120f0d', '#2a1a10', '#4a2e1a']), head: hr < .15 ? 'buzz' : 'hair', hairStyle: pick2(rnd, ['short', 'short', 'side', 'side', 'long']), beard: rnd() < .35, glasses: false, s: .96 + rnd() * .1, wide: .98 + rnd() * .08 };
}
function pick2(rnd, a) { return a[Math.floor(rnd() * a.length)]; }
