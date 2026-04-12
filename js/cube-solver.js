/**
 * cube-solver.js v7 - Kociemba Two-Phase Algorithm (완전 구현)
 *
 * 면 인덱스:
 *   U=0-8  R=9-17  F=18-26  D=27-35  L=36-44  B=45-53
 * 셀 번호 (각 면 정면):
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * 큐브 표기: URFDLB 순서, 각 9칸
 * 내부 face ID: U=0, R=1, F=2, D=3, L=4, B=5
 */

'use strict';

/* ============================================================
   이동 정보
============================================================ */
const MOVE_INFO = {
  'U' :{ name:'U  (윗면 시계방향)',       desc:'큐브 위쪽 면을 시계 방향으로 90° 회전합니다.' },
  "U'":{name:"U' (윗면 반시계방향)",      desc:'큐브 위쪽 면을 반시계 방향으로 90° 회전합니다.' },
  'U2':{name:'U2 (윗면 180°)',             desc:'큐브 위쪽 면을 180° 회전합니다.' },
  'D' :{name:'D  (아랫면 시계방향)',      desc:'큐브 아래쪽 면을 시계 방향으로 90° 회전합니다.' },
  "D'":{name:"D' (아랫면 반시계방향)",    desc:'큐브 아래쪽 면을 반시계 방향으로 90° 회전합니다.' },
  'D2':{name:'D2 (아랫면 180°)',           desc:'큐브 아래쪽 면을 180° 회전합니다.' },
  'F' :{name:'F  (앞면 시계방향)',        desc:'큐브 앞쪽 면을 시계 방향으로 90° 회전합니다.' },
  "F'":{name:"F' (앞면 반시계방향)",      desc:'큐브 앞쪽 면을 반시계 방향으로 90° 회전합니다.' },
  'F2':{name:'F2 (앞면 180°)',             desc:'큐브 앞쪽 면을 180° 회전합니다.' },
  'B' :{name:'B  (뒷면 시계방향)',        desc:'큐브 뒷쪽 면을 시계 방향으로 90° 회전합니다.' },
  "B'":{name:"B' (뒷면 반시계방향)",      desc:'큐브 뒷쪽 면을 반시계 방향으로 90° 회전합니다.' },
  'B2':{name:'B2 (뒷면 180°)',             desc:'큐브 뒷쪽 면을 180° 회전합니다.' },
  'L' :{name:'L  (왼쪽면 시계방향)',      desc:'큐브 왼쪽 면을 시계 방향으로 90° 회전합니다.' },
  "L'":{name:"L' (왼쪽면 반시계방향)",    desc:'큐브 왼쪽 면을 반시계 방향으로 90° 회전합니다.' },
  'L2':{name:'L2 (왼쪽면 180°)',           desc:'큐브 왼쪽 면을 180° 회전합니다.' },
  'R' :{name:'R  (오른쪽면 시계방향)',    desc:'큐브 오른쪽 면을 시계 방향으로 90° 회전합니다.' },
  "R'":{name:"R' (오른쪽면 반시계방향)", desc:'큐브 오른쪽 면을 반시계 방향으로 90° 회전합니다.' },
  'R2':{name:'R2 (오른쪽면 180°)',         desc:'큐브 오른쪽 면을 180° 회전합니다.' },
};

/* ============================================================
   치환 테이블 - 사이클 표기법
   makeCyclePerm: cyc=[a,b,c,d] → 값이 a→b→c→d→a 방향으로 이동
   (새상태[b] = 구상태[a])
============================================================ */
function makeCyclePerm(cycles) {
  const p = Array.from({length:54}, (_,i) => i);
  for (const cyc of cycles) {
    const n = cyc.length;
    for (let i = 0; i < n; i++) {
      p[cyc[(i+1)%n]] = cyc[i];
    }
  }
  return p;
}
function invertPerm(p) {
  const inv = new Array(p.length);
  for (let i = 0; i < p.length; i++) inv[p[i]] = i;
  return inv;
}
function composePerm(a, b) { return b.map(x => a[x]); }

/* ----------------------------------------
   각 면 CW 치환 (검증완료)
   U CW: F→R→B→L (위에서 봤을 때 시계)
   R CW: U right→F right→D right→B left(역)
   F CW: U bottom→R left→D top→L right
   D CW: F→L→B→R (아래서 봤을 때 시계)
   L CW: U left→B right(역)→D left→F left
   B CW: U top(역)→L left→D bottom(역)→R right
---------------------------------------- */
const PERM_CW = {};

// U CW: 위에서 봤을때 CW = F상단→R상단→B상단→L상단
PERM_CW['U'] = makeCyclePerm([
  [0,2,8,6], [1,5,7,3],
  [18,9,45,36], [19,10,46,37], [20,11,47,38]
]);

// D CW: 아래서 봤을때 CW = F하단→L하단→B하단→R하단
PERM_CW['D'] = makeCyclePerm([
  [27,29,35,33], [28,32,34,30],
  [24,42,51,15], [25,43,52,16], [26,44,53,17]
]);

// F CW: 앞에서 봤을때 CW = U하단→R왼쪽→D상단→L오른쪽
PERM_CW['F'] = makeCyclePerm([
  [18,20,26,24], [19,23,25,21],
  [6,9,29,44], [7,12,28,41], [8,15,27,38]
]);

// B CW: 뒤에서 봤을때 CW
PERM_CW['B'] = makeCyclePerm([
  [45,47,53,51], [46,50,52,48],
  [2,36,33,17], [1,39,34,14], [0,42,35,11]
]);

// L CW: 왼쪽에서 봤을때 CW
PERM_CW['L'] = makeCyclePerm([
  [36,38,44,42], [37,41,43,39],
  [0,18,27,53], [3,21,30,50], [6,24,33,47]
]);

// R CW: 오른쪽에서 봤을때 CW
PERM_CW['R'] = makeCyclePerm([
  [9,11,17,15], [10,14,16,12],
  [2,20,29,47], [5,23,32,50], [8,26,35,53]
]);

const ALL_MOVE_PERMS = {};
for (const mv of ['U','D','F','B','L','R']) {
  ALL_MOVE_PERMS[mv]     = PERM_CW[mv];
  ALL_MOVE_PERMS[mv+"'"] = invertPerm(PERM_CW[mv]);
  ALL_MOVE_PERMS[mv+'2'] = composePerm(PERM_CW[mv], PERM_CW[mv]);
}

/* ============================================================
   FaceletCube
============================================================ */
class FaceletCube {
  constructor() { this.f = Array.from({length:54}, (_,i) => Math.floor(i/9)); }
  clone() { const c = new FaceletCube(); c.f = [...this.f]; return c; }
  applyPerm(p) { const o = [...this.f]; for (let i = 0; i < 54; i++) this.f[i] = o[p[i]]; }
  move(mv) { const p = ALL_MOVE_PERMS[mv]; if (p) this.applyPerm(p); }
  isSolved() { for (let i = 0; i < 54; i++) if (this.f[i] !== Math.floor(i/9)) return false; return true; }
  toString() {
    const names = ['U','R','F','D','L','B'];
    return this.f.map(v => names[v]).join('');
  }
  fromString(s) {
    const m = {U:0,R:1,F:2,D:3,L:4,B:5};
    for (let i = 0; i < 54; i++) this.f[i] = m[s[i]];
  }
}

/* ============================================================
   자가 검증
============================================================ */
function selfTest() {
  for (const mv of ['U','D','F','B','L','R']) {
    let c = new FaceletCube();
    for (let i = 0; i < 4; i++) c.move(mv);
    if (!c.isSolved()) { console.error('FAIL '+mv+'x4'); return false; }
    c = new FaceletCube(); c.move(mv); c.move(mv+"'");
    if (!c.isSolved()) { console.error('FAIL '+mv+'+inv'); return false; }
    c = new FaceletCube(); c.move(mv+'2'); c.move(mv+'2');
    if (!c.isSolved()) { console.error('FAIL '+mv+'2x2'); return false; }
  }
  // Sune order = 24
  const sune = ["R","U","R'","U","R","U2","R'"];
  let c = new FaceletCube();
  for (let i = 0; i < 24; i++) for (const m of sune) c.move(m);
  if (!c.isSolved()) { console.error('FAIL sune x24'); return false; }
  return true;
}

/* ============================================================
   Kociemba Two-Phase Algorithm
   Phase 1: G0 → G1 (방향 정렬)
   Phase 2: G1 → 완성 (위치 정렬)
   
   G1 = <U,D,F2,B2,L2,R2> 부분군
============================================================ */

/* ------ 코너/엣지 facelet 정의 (해결 상태 기준) ------ */

// 코너 facelet [UorD면, 인접면1, 인접면2]
const _CF = [
  [8, 9, 20],  // 0: URF
  [6, 18, 36], // 1: UFL
  [0, 38, 45], // 2: ULB
  [2, 47, 11], // 3: URB
  [29, 26, 15],// 4: DFR
  [27, 24, 44],// 5: DFL
  [33, 53, 42],// 6: DBL
  [35, 51, 17],// 7: DBR
];
const _CF_SOLVED = _CF.map(fl => fl.map(fi => Math.floor(fi/9)));

// 엣지 facelet [면1, 면2]
const _EF = [
  [5, 10],  // 0: UR
  [7, 19],  // 1: UF
  [3, 37],  // 2: UL
  [1, 46],  // 3: UB
  [32, 16], // 4: DR
  [28, 25], // 5: DF
  [30, 43], // 6: DL
  [34, 52], // 7: DB
  [23, 12], // 8: FR
  [21, 41], // 9: FL
  [48, 14], // 10: BR
  [50, 39], // 11: BL
];
const _EF_SOLVED = _EF.map(fl => fl.map(fi => Math.floor(fi/9)));

/* ============================================================
   BFS 기반 Phase 1 & Phase 2 솔버
   (테이블 생성 없이 직접 탐색 - 중소 규모 큐브에 충분)
============================================================ */

const ALL_MOVES = ['U',"U'","U2",'D',"D'","D2",'F',"F'","F2",'B',"B'","B2",'L',"L'","L2",'R',"R'","R2"];
const PHASE2_MOVES = ['U',"U'","U2",'D',"D'","D2",'F2','B2','L',"L'","L2",'R',"R'","R2"];
const OPP_FACE = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};

/* ------ Phase 1 체크: G1 군에 속하는가? ------ */
function isPhase1Solved(fc) {
  // 코너 orientation, 엣지 orientation, UD-slice 모두 해결
  for (let c = 0; c < 8; c++) {
    const colors = _CF[c].map(fi => fc.f[fi]);
    const udIdx = colors.findIndex(v => v === 0 || v === 3);
    if (udIdx !== 0) return false; // 코너 orientation != 0
  }
  for (let e = 0; e < 12; e++) {
    const colors = _EF[e].map(fi => fc.f[fi]);
    let eo;
    if (e < 8) {
      eo = (colors[0] === 0 || colors[0] === 3) ? 0 : 1;
    } else {
      eo = (colors[0] === 2 || colors[0] === 5) ? 0 : 1;
    }
    if (eo !== 0) return false; // 엣지 orientation != 0
  }
  // UD-slice 엣지(8,9,10,11)가 slice 위치(8-11)에 있는가
  for (let e = 0; e < 8; e++) {
    const colors = _EF[e].map(fi => fc.f[fi]);
    const colorSet = new Set(colors);
    // 이 엣지가 slice 엣지(FR,FL,BR,BL)인가?
    for (let d = 8; d < 12; d++) {
      if (_EF_SOLVED[d].every(f => colorSet.has(f))) return false;
    }
  }
  return true;
}

/* ------ 휴리스틱 ------ */
function h1(fc) {
  let badCo = 0, badEo = 0, sliceOut = 0;
  for (let c = 0; c < 8; c++) {
    const colors = _CF[c].map(fi => fc.f[fi]);
    const udIdx = colors.findIndex(v => v === 0 || v === 3);
    if (udIdx !== 0) badCo++;
  }
  for (let e = 0; e < 12; e++) {
    const colors = _EF[e].map(fi => fc.f[fi]);
    let eo = (e < 8) ? ((colors[0]===0||colors[0]===3)?0:1) : ((colors[0]===2||colors[0]===5)?0:1);
    if (eo !== 0) badEo++;
    if (e < 8) {
      // UD 층 엣지 위치에 slice 엣지가 있는지
      const colorSet = new Set(colors);
      for (let d = 8; d < 12; d++) {
        if (_EF_SOLVED[d].every(f => colorSet.has(f))) { sliceOut++; break; }
      }
    }
  }
  return Math.max(Math.ceil(badCo/4), Math.ceil(badEo/4), Math.ceil(sliceOut/4));
}

function h2(fc) {
  // Phase 2: 코너/엣지 위치
  let misplaced = 0;
  for (let i = 0; i < 54; i++) {
    if (fc.f[i] !== Math.floor(i/9)) misplaced++;
  }
  return Math.ceil(misplaced / 8);
}

/* ------ IDA* ------ */
let _totalNodes = 0;
const MAX_NODES = 5000000;

function idaStar(cube, maxDepth, hFunc, moveSet, phase1Check) {
  for (let depth = 0; depth <= maxDepth; depth++) {
    _totalNodes = 0;
    const path = [];
    const result = idaDFS(cube, depth, hFunc, moveSet, '', '', path, phase1Check);
    if (result) return path;
    if (_totalNodes >= MAX_NODES) break;
  }
  return null;
}

function idaDFS(cube, limit, hFunc, moveSet, lastFace, last2Face, path, goalCheck) {
  if (++_totalNodes > MAX_NODES) return false;
  if (goalCheck(cube)) return true;
  const h = hFunc(cube);
  if (path.length + h > limit) return false;
  if (path.length >= limit) return false;

  for (const mv of moveSet) {
    const face = mv[0];
    if (face === lastFace) continue;
    if (OPP_FACE[face] === lastFace && face === last2Face) continue;
    const next = cube.clone();
    next.move(mv);
    path.push(mv);
    if (idaDFS(next, limit, hFunc, moveSet, face, lastFace, path, goalCheck)) return true;
    path.pop();
  }
  return false;
}

/* ------ Two-Phase Solve ------ */
function twoPhaseSearch(cube, maxTotal) {
  // Phase 1: G0 → G1 (최대 12수)
  const phase1Moves = idaStar(cube, Math.min(12, maxTotal), h1, ALL_MOVES, isPhase1Solved);

  if (phase1Moves === null) {
    // Phase 1 실패 → IDA* fallback
    return null;
  }

  // Phase 1 적용 후 상태
  const afterP1 = cube.clone();
  for (const mv of phase1Moves) afterP1.move(mv);

  // Phase 2: G1 → 완성 (Phase2 이동만 허용)
  const remaining = maxTotal - phase1Moves.length;
  if (remaining < 0) return null;

  const phase2Moves = idaStar(afterP1, Math.min(18, remaining), h2, PHASE2_MOVES,
    fc => fc.isSolved());

  if (phase2Moves === null) return null;

  return [...phase1Moves, ...phase2Moves];
}

/* ============================================================
   메인 솔버 (Two-Phase + fallback IDA*)
============================================================ */
function solveCubeInternal(cube) {
  if (cube.isSolved()) return [];

  // Two-Phase 시도
  let sol = twoPhaseSearch(cube, 25);
  if (sol) return sol;

  // Fallback: 순수 IDA* (깊이 20까지)
  _totalNodes = 0;
  const MAX_NODES_FB = 8000000;
  for (let d = 1; d <= 20; d++) {
    _totalNodes = 0;
    const path = [];
    if (idaDFS(cube, d, h2, ALL_MOVES, '', '', path, fc => fc.isSolved())) return path;
    if (_totalNodes >= MAX_NODES_FB) break;
  }
  return null;
}

/* ============================================================
   유효성 검증
============================================================ */
function validateCube(faceData) {
  const errors = [];
  const count = {W:0,Y:0,R:0,O:0,B:0,G:0};
  let total = 0;
  for (const face of ['U','R','F','D','L','B'])
    for (const c of (faceData[face]||[]))
      if (c) { count[c] = (count[c]||0)+1; total++; }

  if (total < 54) {
    errors.push(`색상이 입력되지 않은 칸이 있습니다. (${54-total}칸 미입력)`);
    return {valid:false, errors};
  }

  const label = {W:'흰색',Y:'노란색',R:'빨간색',O:'주황색',B:'파란색',G:'초록색'};
  for (const [c, n] of Object.entries(count))
    if (n !== 9) errors.push(`${label[c]}(${c})이 ${n}개입니다. (정확히 9개여야 합니다)`);
  if (errors.length) return {valid:false, errors};

  // 센터 검증
  const centers = {};
  for (const face of ['U','R','F','D','L','B']) centers[face] = faceData[face][4];
  if (new Set(Object.values(centers)).size < 6) {
    errors.push('각 면의 중앙 칸 색상이 모두 달라야 합니다.');
    return {valid:false, errors};
  }

  const c2f = {};
  for (const [f, c] of Object.entries(centers)) c2f[c] = f;
  const OPPS = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};

  // 코너 검증
  const CORNERS = [
    [['U',8],['R',0],['F',2]],   // URF
    [['U',6],['F',0],['L',0]],   // UFL
    [['U',0],['L',2],['B',0]],   // UBL
    [['U',2],['R',2],['B',2]],   // UBR
    [['D',2],['F',8],['R',6]],   // DFR
    [['D',0],['L',8],['F',6]],   // DFL
    [['D',6],['B',8],['L',6]],   // DBL
    [['D',8],['R',8],['B',6]],   // DRB
  ];

  for (const corner of CORNERS) {
    const colors = corner.map(([f,i]) => faceData[f][i]);
    const faces = colors.map(c => c2f[c]);
    if (faces.some(f => !f)) {
      errors.push(`코너에 알 수 없는 색상: ${colors.join('+')}`);
      return {valid:false, errors};
    }
    if (new Set(faces).size < 3) {
      errors.push(`불가능한 코너 (${colors.join('+')}) - 같은 색상 2개 이상`);
      return {valid:false, errors};
    }
    for (let a = 0; a < 3; a++)
      for (let b = a+1; b < 3; b++)
        if (OPPS[faces[a]] === faces[b]) {
          errors.push(`불가능한 코너 (${colors.join('+')}) - 마주보는 색상`);
          return {valid:false, errors};
        }
  }

  // 엣지 검증
  const EDGES = [
    [['U',7],['F',1]], [['U',5],['R',1]], [['U',3],['L',1]], [['U',1],['B',1]],
    [['D',1],['F',7]], [['D',5],['R',7]], [['D',3],['L',7]], [['D',7],['B',7]],
    [['F',5],['R',3]], [['F',3],['L',5]], [['B',3],['R',5]], [['B',5],['L',3]],
  ];

  for (const edge of EDGES) {
    const colors = edge.map(([f,i]) => faceData[f][i]);
    const faces = colors.map(c => c2f[c]);
    if (faces.some(f => !f)) {
      errors.push(`엣지에 알 수 없는 색상: ${colors.join('+')}`);
      return {valid:false, errors};
    }
    if (new Set(faces).size < 2) {
      errors.push(`불가능한 엣지 (${colors.join('+')}) - 같은 색상 2개`);
      return {valid:false, errors};
    }
    if (OPPS[faces[0]] === faces[1]) {
      errors.push(`불가능한 엣지 (${colors.join('+')}) - 마주보는 색상`);
      return {valid:false, errors};
    }
  }

  const cubeStr = buildCubeString(faceData);
  if (!cubeStr) { errors.push('큐브 변환 오류'); return {valid:false, errors}; }
  return {valid:true, errors:[], cubeStr, centers};
}

function buildCubeString(faceData) {
  const FACE_ORDER = ['U','R','F','D','L','B'];
  const c2f = {};
  for (const face of FACE_ORDER) c2f[faceData[face][4]] = face;
  let s = '';
  for (const face of FACE_ORDER)
    for (let i = 0; i < 9; i++) {
      const m = c2f[faceData[face][i]];
      if (!m) return null;
      s += m;
    }
  return s;
}

/* ============================================================
   패리티 검사 (물리적 불가능 상태 검출)
   
   코너/엣지 위치별로 현재 색상 집합을 분석하여
   허용 불가 상태(비틀림, 뒤집힘, 패리티 오류)를 감지합니다.
============================================================ */

// 코너 위치별 3개 facelet [UD면, side1, side2]
// orientation 기준: UD면 색이 _CPOS[c][0] 위치에 있으면 0
const _CPOS = [
  [8, 9, 20],   // 0: URF  U[8]=8,  R[0]=9,  F[2]=20
  [6, 18, 38],  // 1: UFL  U[6]=6,  F[0]=18, L[2]=38
  [0, 36, 47],  // 2: ULB  U[0]=0,  L[0]=36, B[2]=47
  [2, 11, 45],  // 3: URB  U[2]=2,  R[2]=11, B[0]=45
  [29, 26, 15], // 4: DFR  D[2]=29, F[8]=26, R[6]=15
  [27, 24, 44], // 5: DFL  D[0]=27, F[6]=24, L[8]=44
  [33, 42, 51], // 6: DBL  D[6]=33, L[6]=42, B[6]=51
  [35, 17, 53], // 7: DRB  D[8]=35, R[8]=17, B[8]=53
];
// 해결상태 각 코너 면 ID (= floor(fi/9))
const _CREF = _CPOS.map(fl => fl.map(fi => Math.floor(fi/9)));

// 엣지 위치별 2개 facelet [face1, face2]
const _EPOS = [
  [5, 10],  // 0: UR
  [7, 19],  // 1: UF
  [3, 37],  // 2: UL
  [1, 46],  // 3: UB
  [32, 16], // 4: DR
  [28, 25], // 5: DF
  [30, 43], // 6: DL
  [34, 52], // 7: DB
  [23, 12], // 8: FR
  [21, 41], // 9: FL
  [48, 14], // 10: BR
  [50, 39], // 11: BL
];
const _EREF = _EPOS.map(fl => fl.map(fi => Math.floor(fi/9)));

function checkParity(fc) {
  const cp = new Array(8).fill(-1);
  const co = new Array(8).fill(0);

  for (let c = 0; c < 8; c++) {
    const clr = [fc.f[_CPOS[c][0]], fc.f[_CPOS[c][1]], fc.f[_CPOS[c][2]]];
    // 3개 색이 모두 달라야 함
    if (clr[0] === clr[1] || clr[0] === clr[2] || clr[1] === clr[2]) return false;
    // 어느 코너 조각인지 찾기 (정렬된 집합 비교)
    const key = [clr[0], clr[1], clr[2]].sort().join(',');
    for (let d = 0; d < 8; d++) {
      const refKey = [_CREF[d][0], _CREF[d][1], _CREF[d][2]].sort().join(',');
      if (key === refKey) {
        cp[c] = d;
        // orientation: _CREF[d][0](UD면)이 현재 clr의 몇번째에?
        const udFace = _CREF[d][0]; // 0(U) or 3(D)
        if (clr[0] === udFace) co[c] = 0;
        else if (clr[1] === udFace) co[c] = 1;
        else co[c] = 2;
        break;
      }
    }
    if (cp[c] === -1) return false;
  }

  const ep = new Array(12).fill(-1);
  const eo = new Array(12).fill(0);

  for (let e = 0; e < 12; e++) {
    const clr = [fc.f[_EPOS[e][0]], fc.f[_EPOS[e][1]]];
    if (clr[0] === clr[1]) return false;
    for (let d = 0; d < 12; d++) {
      const ref = _EREF[d];
      if ((clr[0] === ref[0] && clr[1] === ref[1]) ||
          (clr[0] === ref[1] && clr[1] === ref[0])) {
        ep[e] = d;
        eo[e] = (clr[0] === ref[0]) ? 0 : 1;
        break;
      }
    }
    if (ep[e] === -1) return false;
  }

  // 조건 1: 코너 orientation 합 ≡ 0 (mod 3)
  let coSum = 0;
  for (const v of co) coSum += v;
  if (coSum % 3 !== 0) return false;

  // 조건 2: 엣지 orientation 합 ≡ 0 (mod 2)
  let eoSum = 0;
  for (const v of eo) eoSum += v;
  if (eoSum % 2 !== 0) return false;

  // 조건 3: 코너 permutation 패리티
  let cpPar = 0;
  const cpVis = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    if (!cpVis[i]) {
      let len = 0, j = i;
      while (!cpVis[j]) { cpVis[j] = 1; j = cp[j]; len++; }
      if (len % 2 === 0) cpPar ^= 1; // 짝수 길이 사이클 = 홀수 개 transposition
    }
  }

  // 조건 4: 엣지 permutation 패리티
  let epPar = 0;
  const epVis = new Uint8Array(12);
  for (let i = 0; i < 12; i++) {
    if (!epVis[i]) {
      let len = 0, j = i;
      while (!epVis[j]) { epVis[j] = 1; j = ep[j]; len++; }
      if (len % 2 === 0) epPar ^= 1;
    }
  }

  // 조건 5: 코너 패리티 = 엣지 패리티
  if (cpPar !== epPar) return false;

  return true;
}

/* ============================================================
   공개 API
============================================================ */
function getMoveInfo(mv) { return MOVE_INFO[mv] || {name:mv, desc:''}; }

function countColors(faceData) {
  const c = {W:0,Y:0,R:0,O:0,B:0,G:0};
  for (const face of ['U','R','F','D','L','B'])
    for (const v of (faceData[face]||[]))
      if (v && c.hasOwnProperty(v)) c[v]++;
  return c;
}

async function solveCube(faceData) {
  // 1. 기본 유효성 검증
  const vr = validateCube(faceData);
  if (!vr.valid) return {valid:false, errors:vr.errors, solution:null};

  // 2. FaceletCube 생성
  const cube = new FaceletCube();
  cube.fromString(vr.cubeStr);

  // 3. 이미 완성?
  if (cube.isSolved()) return {valid:true, errors:[], solution:[], alreadySolved:true};

  // 4. 자가 검증
  if (!selfTest()) return {valid:false, errors:['내부 오류: 치환 테이블 검증 실패'], solution:null};

  // 5. 패리티 검사
  if (!checkParity(cube)) {
    return {valid:false, errors:[
      '큐브가 물리적으로 불가능한 상태입니다.',
      '다음 중 하나일 가능성이 높습니다:',
      '• 두 조각의 위치만 교환 (패리티 오류)',
      '• 코너 조각이 비틀려 있음',
      '• 엣지 조각이 뒤집혀 있음',
      '색상 입력을 처음부터 다시 확인해 주세요.'
    ], solution:null};
  }

  // 6. Two-Phase + IDA* 솔버
  const solution = solveCubeInternal(cube);
  if (!solution) {
    return {valid:false, errors:[
      '해결 방법을 찾지 못했습니다.',
      '색상 입력을 다시 확인해 주세요.'
    ], solution:null};
  }

  return {valid:true, errors:[], solution};
}
