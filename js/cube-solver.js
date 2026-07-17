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
  'U' :{ name:'U  (윗면 시계방향)',       desc:'큐브 위쪽 면을 시계 방향으로 1칸 회전합니다.' },
  "U'":{name:"U' (윗면 반시계방향)",      desc:'큐브 위쪽 면을 반시계 방향으로 1칸 회전합니다.' },
  'U2':{name:'U2 (윗면 2칸)',              desc:'큐브 위쪽 면을 2칸 회전합니다.' },
  'D' :{name:'D  (아랫면 시계방향)',      desc:'큐브 아래쪽 면을 시계 방향으로 1칸 회전합니다.' },
  "D'":{name:"D' (아랫면 반시계방향)",    desc:'큐브 아래쪽 면을 반시계 방향으로 1칸 회전합니다.' },
  'D2':{name:'D2 (아랫면 2칸)',            desc:'큐브 아래쪽 면을 2칸 회전합니다.' },
  'F' :{name:'F  (앞면 시계방향)',        desc:'큐브 앞쪽 면을 시계 방향으로 1칸 회전합니다.' },
  "F'":{name:"F' (앞면 반시계방향)",      desc:'큐브 앞쪽 면을 반시계 방향으로 1칸 회전합니다.' },
  'F2':{name:'F2 (앞면 2칸)',              desc:'큐브 앞쪽 면을 2칸 회전합니다.' },
  'B' :{name:'B  (뒷면 시계방향)',        desc:'큐브 뒷쪽 면을 시계 방향으로 1칸 회전합니다.' },
  "B'":{name:"B' (뒷면 반시계방향)",      desc:'큐브 뒷쪽 면을 반시계 방향으로 1칸 회전합니다.' },
  'B2':{name:'B2 (뒷면 2칸)',              desc:'큐브 뒷쪽 면을 2칸 회전합니다.' },
  'L' :{name:'L  (왼쪽면 시계방향)',      desc:'큐브 왼쪽 면을 시계 방향으로 1칸 회전합니다.' },
  "L'":{name:"L' (왼쪽면 반시계방향)",    desc:'큐브 왼쪽 면을 반시계 방향으로 1칸 회전합니다.' },
  'L2':{name:'L2 (왼쪽면 2칸)',            desc:'큐브 왼쪽 면을 2칸 회전합니다.' },
  'R' :{name:'R  (오른쪽면 시계방향)',    desc:'큐브 오른쪽 면을 시계 방향으로 1칸 회전합니다.' },
  "R'":{name:"R' (오른쪽면 반시계방향)", desc:'큐브 오른쪽 면을 반시계 방향으로 1칸 회전합니다.' },
  'R2':{name:'R2 (오른쪽면 2칸)',          desc:'큐브 오른쪽 면을 2칸 회전합니다.' },
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
  [0,6,8,2], [1,3,7,5],
  [18,9,45,36], [19,10,46,37], [20,11,47,38]
]);

// D CW: 아래서 봤을때 CW = F하단→L하단→B하단→R하단
PERM_CW['D'] = makeCyclePerm([
  [27,33,35,29], [28,30,34,32],
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
  [9,15,17,11], [10,12,16,14],
  [2,20,29,51], [5,23,32,48], [8,26,35,45]
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
  [8, 9, 20],  // 0: URF  U[8], R[0], F[2]
  [6, 18, 38], // 1: UFL  U[6], F[0], L[2]
  [0, 36, 47], // 2: ULB  U[0], L[0], B[2]
  [2, 45, 11], // 3: URB  U[2], B[0], R[2]
  [29, 26, 15],// 4: DFR  D[2], F[8], R[6]
  [27, 44, 24],// 5: DFL  D[0], L[8], F[6]
  [33, 53, 42],// 6: DBL  D[6], B[8], L[6]
  [35, 17, 51],// 7: DRB  D[8], R[8], B[6]
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
   Kociemba 좌표/가지치기 테이블 기반 Phase 1 & Phase 2 솔버
============================================================ */

const ALL_MOVES = ['U',"U'","U2",'D',"D'","D2",'F',"F'","F2",'B',"B'","B2",'L',"L'","L2",'R',"R'","R2"];
const PHASE2_MOVES = ['U',"U'","U2",'D',"D'","D2",'F2','B2','L2','R2'];
const PHASE2_MOVE_INDEXES = PHASE2_MOVES.map(mv => ALL_MOVES.indexOf(mv));
const OPP_FACE = {U:'D',D:'U',F:'B',B:'F',L:'R',R:'L'};
const FACT = [1,1,2,6,24,120,720,5040,40320];

let _tablesReady = false;
let _solverTables = null;

function faceletToCubie(fc) {
  const cp = new Uint8Array(8);
  const co = new Uint8Array(8);
  for (let c = 0; c < 8; c++) {
    const clr = [fc.f[_CF[c][0]], fc.f[_CF[c][1]], fc.f[_CF[c][2]]];
    const key = [clr[0], clr[1], clr[2]].sort().join(',');
    for (let d = 0; d < 8; d++) {
      const refKey = [_CF_SOLVED[d][0], _CF_SOLVED[d][1], _CF_SOLVED[d][2]].sort().join(',');
      if (key === refKey) {
        cp[c] = d;
        const udFace = _CF_SOLVED[d][0];
        co[c] = (clr[0] === udFace) ? 0 : ((clr[1] === udFace) ? 1 : 2);
        break;
      }
    }
  }

  const ep = new Uint8Array(12);
  const eo = new Uint8Array(12);
  for (let e = 0; e < 12; e++) {
    const clr = [fc.f[_EF[e][0]], fc.f[_EF[e][1]]];
    for (let d = 0; d < 12; d++) {
      const ref = _EF_SOLVED[d];
      if ((clr[0] === ref[0] && clr[1] === ref[1]) ||
          (clr[0] === ref[1] && clr[1] === ref[0])) {
        ep[e] = d;
        eo[e] = (clr[0] === ref[0]) ? 0 : 1;
        break;
      }
    }
  }
  return {cp, co, ep, eo};
}

function applyCubieMove(c, mv) {
  const cp = new Uint8Array(8);
  const co = new Uint8Array(8);
  const ep = new Uint8Array(12);
  const eo = new Uint8Array(12);
  for (let i = 0; i < 8; i++) {
    const src = mv.cp[i];
    cp[i] = c.cp[src];
    co[i] = (c.co[src] + mv.co[i]) % 3;
  }
  for (let i = 0; i < 12; i++) {
    const src = mv.ep[i];
    ep[i] = c.ep[src];
    eo[i] = (c.eo[src] + mv.eo[i]) & 1;
  }
  return {cp, co, ep, eo};
}

function solvedCubie() {
  return {
    cp: Uint8Array.from([0,1,2,3,4,5,6,7]),
    co: new Uint8Array(8),
    ep: Uint8Array.from([0,1,2,3,4,5,6,7,8,9,10,11]),
    eo: new Uint8Array(12)
  };
}

function buildCubieMoves() {
  const solved = new FaceletCube();
  const moves = [];
  for (const mv of ALL_MOVES) {
    const c = solved.clone();
    c.move(mv);
    moves.push(faceletToCubie(c));
  }
  return moves;
}

function getCO(c) {
  let idx = 0;
  for (let i = 0; i < 7; i++) idx = idx * 3 + c.co[i];
  return idx;
}
function setCO(c, idx) {
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    c.co[i] = idx % 3;
    sum += c.co[i];
    idx = Math.floor(idx / 3);
  }
  c.co[7] = (3 - (sum % 3)) % 3;
}
function getEO(c) {
  let idx = 0;
  for (let i = 0; i < 11; i++) idx = (idx << 1) | c.eo[i];
  return idx;
}
function setEO(c, idx) {
  let sum = 0;
  for (let i = 10; i >= 0; i--) {
    c.eo[i] = idx & 1;
    sum += c.eo[i];
    idx >>= 1;
  }
  c.eo[11] = sum & 1;
}

const SLICE_MASK_TO_COORD = new Int16Array(4096).fill(-1);
const COORD_TO_SLICE_MASK = new Uint16Array(495);
(function initSliceMasks() {
  let n = 0;
  for (let mask = 4095; mask >= 0; mask--) {
    let bits = 0;
    for (let i = 0; i < 12; i++) bits += (mask >> i) & 1;
    if (bits === 4) {
      SLICE_MASK_TO_COORD[mask] = n;
      COORD_TO_SLICE_MASK[n] = mask;
      n++;
    }
  }
})();

function getSlice(c) {
  let mask = 0;
  for (let i = 0; i < 12; i++) if (c.ep[i] >= 8) mask |= 1 << i;
  return SLICE_MASK_TO_COORD[mask];
}

function permRank(arr, n) {
  let idx = 0;
  const used = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let less = 0;
    for (let j = 0; j < arr[i]; j++) if (!used[j]) less++;
    idx += less * FACT[n - 1 - i];
    used[arr[i]] = 1;
  }
  return idx;
}

function permUnrank(idx, n, out) {
  const elems = [];
  for (let i = 0; i < n; i++) elems.push(i);
  for (let i = 0; i < n; i++) {
    const f = FACT[n - 1 - i];
    const j = Math.floor(idx / f);
    idx %= f;
    out[i] = elems.splice(j, 1)[0];
  }
}

function getCP(c) { return permRank(c.cp, 8); }
function setCP(c, idx) { permUnrank(idx, 8, c.cp); }
function getEP8(c) {
  const a = new Uint8Array(8);
  for (let i = 0; i < 8; i++) a[i] = c.ep[i];
  return permRank(a, 8);
}
function setEP8(c, idx) {
  const a = new Uint8Array(8);
  permUnrank(idx, 8, a);
  for (let i = 0; i < 8; i++) c.ep[i] = a[i];
  for (let i = 8; i < 12; i++) c.ep[i] = i;
}
function getSlicePerm(c) {
  const a = new Uint8Array(4);
  for (let i = 0; i < 4; i++) a[i] = c.ep[i + 8] - 8;
  return permRank(a, 4);
}
function setSlicePerm(c, idx) {
  const a = new Uint8Array(4);
  permUnrank(idx, 4, a);
  for (let i = 0; i < 8; i++) c.ep[i] = i;
  for (let i = 0; i < 4; i++) c.ep[i + 8] = a[i] + 8;
}

function buildMoveTable(size, setter, getter, moves, moveIndexes) {
  const indexes = moveIndexes || ALL_MOVES.map((_, i) => i);
  const table = new Uint16Array(size * 18);
  for (let idx = 0; idx < size; idx++) {
    const c = solvedCubie();
    setter(c, idx);
    for (const m of indexes) {
      table[idx * 18 + m] = getter(applyCubieMove(c, moves[m]));
    }
  }
  return table;
}

function buildSliceMoveTable(moves) {
  const table = new Uint16Array(495 * 18);
  for (let idx = 0; idx < 495; idx++) {
    const mask = COORD_TO_SLICE_MASK[idx];
    for (let m = 0; m < 18; m++) {
      const mv = moves[m];
      let next = 0;
      for (let dest = 0; dest < 12; dest++) {
        if (mask & (1 << mv.ep[dest])) next |= 1 << dest;
      }
      table[idx * 18 + m] = SLICE_MASK_TO_COORD[next];
    }
  }
  return table;
}

function buildPruneTable(sizeA, sizeB, moveA, moveB, moveIndexes) {
  const total = sizeA * sizeB;
  const prune = new Int8Array(total);
  prune.fill(-1);
  const qa = new Int32Array(total);
  const qb = new Int16Array(total);
  let head = 0, tail = 0;
  prune[0] = 0;
  qa[tail] = 0; qb[tail++] = 0;
  while (head < tail) {
    const a = qa[head];
    const b = qb[head++];
    const d = prune[a * sizeB + b] + 1;
    for (const m of moveIndexes) {
      const na = moveA[a * 18 + m];
      const nb = moveB[b * 18 + m];
      const p = na * sizeB + nb;
      if (prune[p] === -1) {
        prune[p] = d;
        qa[tail] = na;
        qb[tail++] = nb;
      }
    }
  }
  return prune;
}

function initSolverTables() {
  if (_tablesReady) return _solverTables;
  const moves = buildCubieMoves();
  const coMove = buildMoveTable(2187, setCO, getCO, moves);
  const eoMove = buildMoveTable(2048, setEO, getEO, moves);
  const sliceMove = buildSliceMoveTable(moves);
  const cpMove = buildMoveTable(40320, setCP, getCP, moves, PHASE2_MOVE_INDEXES);
  const epMove = buildMoveTable(40320, setEP8, getEP8, moves, PHASE2_MOVE_INDEXES);
  const slicePermMove = buildMoveTable(24, setSlicePerm, getSlicePerm, moves, PHASE2_MOVE_INDEXES);

  _solverTables = {
    moves, coMove, eoMove, sliceMove, cpMove, epMove, slicePermMove,
    cornerOrientPrune: buildPruneTable(2187, 495, coMove, sliceMove, ALL_MOVES.map((_, i) => i)),
    edgeOrientPrune: buildPruneTable(2048, 495, eoMove, sliceMove, ALL_MOVES.map((_, i) => i)),
    cornerPermPrune: buildPruneTable(40320, 24, cpMove, slicePermMove, PHASE2_MOVE_INDEXES),
    edgePermPrune: buildPruneTable(40320, 24, epMove, slicePermMove, PHASE2_MOVE_INDEXES)
  };
  _tablesReady = true;
  return _solverTables;
}

function h1Coord(st, t) {
  return Math.max(
    t.cornerOrientPrune[st.co * 495 + st.slice],
    t.edgeOrientPrune[st.eo * 495 + st.slice]
  );
}

function h2Coord(st, t) {
  return Math.max(
    t.cornerPermPrune[st.cp * 24 + st.sp],
    t.edgePermPrune[st.ep * 24 + st.sp]
  );
}

function coordsFromCubie(c) {
  return {
    co: getCO(c),
    eo: getEO(c),
    slice: getSlice(c),
    cp: getCP(c),
    ep: getEP8(c),
    sp: getSlicePerm(c)
  };
}

/* ------ IDA* ------ */
let _stopSearch = false;

function shouldSkipMove(face, lastFace, last2Face) {
  return face === lastFace || (OPP_FACE[face] === lastFace && face === last2Face);
}

function applyPathCubie(c, path, t) {
  let cur = c;
  for (const mv of path) cur = applyCubieMove(cur, t.moves[ALL_MOVES.indexOf(mv)]);
  return cur;
}

function phase2DFS(st, t, limit, depth, lastFace, last2Face, path, deadline) {
  if (Date.now() > deadline) return null;
  const h = h2Coord(st, t);
  if (depth + h > limit) return null;
  if (st.cp === 0 && st.ep === 0 && st.sp === 0) return path.slice();
  if (depth >= limit) return null;

  for (const mi of PHASE2_MOVE_INDEXES) {
    const mv = ALL_MOVES[mi];
    const face = mv[0];
    if (shouldSkipMove(face, lastFace, last2Face)) continue;
    const next = {
      cp: t.cpMove[st.cp * 18 + mi],
      ep: t.epMove[st.ep * 18 + mi],
      sp: t.slicePermMove[st.sp * 18 + mi]
    };
    path.push(mv);
    const found = phase2DFS(next, t, limit, depth + 1, face, lastFace, path, deadline);
    if (found) return found;
    path.pop();
  }
  return null;
}

function phase2Search(st, t, maxDepth, deadline, lastFace, last2Face) {
  for (let depth = h2Coord(st, t); depth <= maxDepth; depth++) {
    if (Date.now() > deadline) return null;
    const found = phase2DFS(st, t, depth, 0, lastFace, last2Face, [], deadline);
    if (found) return found;
  }
  return null;
}

function phase1DFS(st, t, initialCubie, limit, depth, lastFace, last2Face, path, deadline, maxTotal) {
  if (Date.now() > deadline || _stopSearch) return null;
  const h = h1Coord(st, t);
  if (depth + h > limit) return null;

  if (st.co === 0 && st.eo === 0 && st.slice === 0) {
    const afterP1 = applyPathCubie(initialCubie, path, t);
    const p2Start = coordsFromCubie(afterP1);
    const p2Max = Math.min(18, maxTotal - path.length);
    const p2 = phase2Search(p2Start, t, p2Max, deadline, lastFace, last2Face);
    if (p2) return path.concat(p2);
  }
  if (depth >= limit) return null;

  for (let mi = 0; mi < 18; mi++) {
    const mv = ALL_MOVES[mi];
    const face = mv[0];
    if (shouldSkipMove(face, lastFace, last2Face)) continue;
    const next = {
      co: t.coMove[st.co * 18 + mi],
      eo: t.eoMove[st.eo * 18 + mi],
      slice: t.sliceMove[st.slice * 18 + mi]
    };
    path.push(mv);
    const found = phase1DFS(next, t, initialCubie, limit, depth + 1, face, lastFace, path, deadline, maxTotal);
    if (found) return found;
    path.pop();
  }
  return null;
}

/* ------ Two-Phase Solve ------ */
function twoPhaseSearch(cube, timeLimitMs) {
  const t = initSolverTables();
  const deadline = Date.now() + (timeLimitMs || 15000);
  const cubie = faceletToCubie(cube);
  const start = coordsFromCubie(cubie);

  for (let p1Depth = h1Coord(start, t); p1Depth <= 12; p1Depth++) {
    const found = phase1DFS(start, t, cubie, p1Depth, 0, '', '', [], deadline, 30);
    if (found) return found;
  }
  return null;
}

/* ============================================================
   메인 솔버 (Two-Phase IDA*)
============================================================ */
function solveCubeInternal(cube) {
  if (cube.isSolved()) return [];
  _stopSearch = false;
  return twoPhaseSearch(cube, 15000);
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
  [2, 45, 11],  // 3: URB  U[2]=2,  B[0]=45, R[2]=11
  [29, 26, 15], // 4: DFR  D[2]=29, F[8]=26, R[6]=15
  [27, 44, 24], // 5: DFL  D[0]=27, L[8]=44, F[6]=24
  [33, 53, 42], // 6: DBL  D[6]=33, B[8]=53, L[6]=42
  [35, 17, 51], // 7: DRB  D[8]=35, R[8]=17, B[6]=51
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
      '색상 입력은 물리적으로 가능한 상태이지만, 제한 시간 안에 해법을 찾지 못했습니다.'
    ], solution:null};
  }

  // 7. 해법 실검증 — 계산한 해법을 실제 스티커 큐브에 적용해 완성되는지 확인
  //    솔버는 코너/엣지 조각 모델만 보므로, 중앙 색을 잘못 입력해
  //    "조각은 제자리지만 스티커는 안 맞는" 물리적으로 불가능한 배치가
  //    빈 해법([])이나 잘못된 해법으로 새어 나올 수 있다. 이를 여기서 차단한다.
  const verify = cube.clone();
  for (const mv of solution) verify.move(mv);
  if (!verify.isSolved()) {
    return {valid:false, errors:[
      '입력한 색상이 물리적으로 불가능한 큐브입니다.',
      '각 면의 중앙 색과 조각들의 색 배치가 서로 맞지 않습니다.',
      '특히 마주보는 면(위-아래, 앞-뒤, 좌-우)의 중앙 색이',
      '뒤바뀌어 입력되지 않았는지 확인해 주세요.',
      '색상 입력을 처음부터 다시 확인하는 것을 권장합니다.'
    ], solution:null};
  }

  return {valid:true, errors:[], solution};
}

function randomScramble(length) {
  const seq = [];
  let lastFace = '', last2Face = '';
  for (let i = 0; i < length; i++) {
    const candidates = ALL_MOVES.filter(mv => !shouldSkipMove(mv[0], lastFace, last2Face));
    const mv = candidates[Math.floor(Math.random() * candidates.length)];
    seq.push(mv);
    last2Face = lastFace;
    lastFace = mv[0];
  }
  return seq;
}

function runSolverTest(count) {
  const total = count || 100;
  const result = {passed:0, failed:0, errors:[]};
  initSolverTables();
  for (let i = 0; i < total; i++) {
    const scramble = randomScramble(25);
    const cube = new FaceletCube();
    for (const mv of scramble) cube.move(mv);
    const solution = solveCubeInternal(cube);
    if (!solution) {
      result.failed++;
      result.errors.push({index:i, scramble, error:'no solution'});
      continue;
    }
    const check = cube.clone();
    for (const mv of solution) check.move(mv);
    if (check.isSolved()) {
      result.passed++;
    } else {
      result.failed++;
      result.errors.push({index:i, scramble, solution, error:'solution did not solve cube'});
    }
  }
  console.log(`Solver self-test: ${result.passed}/${total} passed, ${result.failed} failed`);
  return result;
}

if (typeof window !== 'undefined') {
  window.solveCube = solveCube;
  window.getMoveInfo = getMoveInfo;
  window.runSolverTest = runSolverTest;
  window.initSolverTables = initSolverTables;
  initSolverTables();
}
