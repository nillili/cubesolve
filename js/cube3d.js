/**
 * cube3d.js
 * 3D 큐브 미리보기 - CSS 3D Transform + 마우스/터치 드래그 회전
 */

'use strict';

(function () {
  const wrap = document.getElementById('cube3d-wrap');
  const cube = document.getElementById('cube3d');
  if (!wrap || !cube) return;

  // 초기 회전 각도
  let rotX = -25;
  let rotY = 35;
  let isDragging = false;
  let startX = 0, startY = 0;
  let startRotX = 0, startRotY = 0;
  let viewLocked = false; // 풀이 중 시점 고정

  function applyRotation() {
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  // 마우스 이벤트
  wrap.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startRotX = rotX;
    startRotY = rotY;
    wrap.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    rotY = startRotY + dx * 0.5;
    rotX = startRotX - dy * 0.5;
    rotX = Math.max(-90, Math.min(90, rotX));
    applyRotation();
    if (viewLocked) showRecenter();
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    wrap.style.cursor = 'grab';
  });

  // 터치 이벤트
  wrap.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startRotX = rotX;
    startRotY = rotY;
  }, { passive: true });
  wrap.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    rotY = startRotY + dx * 0.5;
    rotX = startRotX - dy * 0.5;
    rotX = Math.max(-90, Math.min(90, rotX));
    applyRotation();
    if (viewLocked) showRecenter();
  }, { passive: true });
  wrap.addEventListener('touchend', () => { isDragging = false; });

  // 자동 천천히 회전 (아이들 상태)
  let autoRotate = true;
  let autoTimer = null;

  function startAutoRotate() {
    if (autoTimer) return;
    autoTimer = setInterval(() => {
      // 풀이 중(viewLocked)에는 절대 자동 회전하지 않음
      if (!isDragging && autoRotate && !viewLocked) {
        rotY += 0.3;
        applyRotation();
      }
    }, 30);
  }
  function stopAutoRotate() { autoRotate = false; }
  function resumeAutoRotate() {
    if (viewLocked) return; // 풀이 중에는 자동 회전 재개 금지
    setTimeout(() => { if (!viewLocked) autoRotate = true; }, 3000);
  }

  wrap.addEventListener('mousedown', () => { stopAutoRotate(); });
  wrap.addEventListener('mouseup', resumeAutoRotate);
  wrap.addEventListener('touchstart', () => { stopAutoRotate(); });
  wrap.addEventListener('touchend', resumeAutoRotate);

  startAutoRotate();

  // 3D 큐브 각 면에 미니 셀 생성
  const faces3d = {
    'F': document.getElementById('3d-F'),
    'B': document.getElementById('3d-B'),
    'L': document.getElementById('3d-L'),
    'R': document.getElementById('3d-R'),
    'U': document.getElementById('3d-U'),
    'D': document.getElementById('3d-D'),
  };

  for (const [faceName, el] of Object.entries(faces3d)) {
    if (!el) continue;
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'mini-cell';
      cell.dataset.face = faceName;
      cell.dataset.idx = i;
      el.appendChild(cell);
    }
  }

  // 공개 함수: 3D 큐브 색상 업데이트
  window.update3DCube = function (faceData) {
    for (const [faceName, cells] of Object.entries(faceData)) {
      const el = faces3d[faceName];
      if (!el) continue;
      const miniCells = el.querySelectorAll('.mini-cell');
      for (let i = 0; i < 9; i++) {
        const color = cells[i] || null;
        if (color) {
          miniCells[i].dataset.color = color;
        } else {
          delete miniCells[i].dataset.color;
          miniCells[i].style.background = '';
        }
      }
    }
  };

  // 이동 애니메이션 (간단한 회전 효과)
  window.animateMove = function (mv, callback) {
    // 이동에 따라 큐브를 흔들어주는 시각 효과
    const face = mv[0];
    const targets = {
      'U': { axis: 'X', dir: -1 },
      'D': { axis: 'X', dir: 1 },
      'F': { axis: 'Z', dir: -1 },
      'B': { axis: 'Z', dir: 1 },
      'L': { axis: 'Y', dir: -1 },
      'R': { axis: 'Y', dir: 1 },
    };
    const t = targets[face];
    if (!t) { if (callback) callback(); return; }

    const deg = mv.includes('2') ? 180 : (mv.includes("'") ? -90 : 90);
    const origTransform = cube.style.transform;

    // 짧은 흔들림 효과
    cube.style.transition = 'transform 0.25s ease';
    const extra = t.axis === 'Y'
      ? `rotateY(${rotY + deg * t.dir * 0.3}deg) rotateX(${rotX}deg)`
      : t.axis === 'X'
        ? `rotateY(${rotY}deg) rotateX(${rotX + deg * t.dir * 0.3}deg)`
        : `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    cube.style.transform = extra;

    setTimeout(() => {
      cube.style.transition = 'transform 0.15s ease';
      cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      setTimeout(() => {
        cube.style.transition = '';
        if (callback) callback();
      }, 150);
    }, 250);
  };

  /* ============================================================
     풀이 중 시점 고정 (전후좌우를 헷갈리지 않도록)
     - 기본은 표준 등각 시점으로 고정, 자동 회전 안 함
     - 마우스로 돌리면 자유롭게 움직이고 "원위치" 버튼이 나타남
     - 원위치 클릭 시 다시 표준 시점으로 복귀
  ============================================================ */
  const DEFAULT_ROT_X = -25;
  const DEFAULT_ROT_Y = 35;
  const recenterBtn = document.getElementById('btn-recenter');

  function showRecenter() { if (recenterBtn) recenterBtn.classList.remove('hidden'); }
  function hideRecenter() { if (recenterBtn) recenterBtn.classList.add('hidden'); }

  function recenterView() {
    rotX = DEFAULT_ROT_X;
    rotY = DEFAULT_ROT_Y;
    applyRotation();
    hideRecenter();
  }

  if (recenterBtn) {
    recenterBtn.addEventListener('click', recenterView);
  }

  window.lockCubeView = function () {
    // 이미 고정 상태면 사용자가 돌려둔 각도를 유지(스텝 이동 시 스냅 방지)
    if (viewLocked) return;
    viewLocked = true;
    autoRotate = false;
    isDragging = false;
    recenterView(); // 표준 등각 시점(앞=F, 위=U, 오른쪽=R)으로 고정 + 버튼 숨김
  };
  window.unlockCubeView = function () {
    viewLocked = false;
    autoRotate = true;
    hideRecenter();
  };

  /* ============================================================
     이동 방향 화살표 오버레이
     - 큐브 바깥을 감싸는 큰 고리 형태로, 회전할 층과 방향을 표시
     - 회전축(=해당 면의 법선)에 수직인 평면에 고리를 배치
     - 시점이 고정돼 있으므로 화살표만으로 어느 층인지 짐작 가능
  ============================================================ */
  // 회전할 층 평면에 고리를 배치 (translateZ로 해당 면 쪽으로 이동)
  const FACE_TF = {
    U: 'rotateX(90deg) translateZ(48px)',
    D: 'rotateX(-90deg) translateZ(48px)',
    F: 'translateZ(48px)',
    B: 'rotateY(180deg) translateZ(48px)',
    L: 'rotateY(-90deg) translateZ(48px)',
    R: 'rotateY(90deg) translateZ(48px)',
  };

  /*
    면별 기본 회전 방향(prime 아님)을 cube-solver의 PERM_CW에서 유도.
    각 면의 "자기 면 코너 사이클"을 그 면 그리드(local) 기준으로 분석하면:
      - U, D, R : local 화면 기준 반시계(CCW)
      - F, B, L : local 화면 기준 시계(CW)
    화살표는 면의 local 평면에 그려지므로(3D가 시점별 반전을 자동 처리),
    이 local 방향에 맞춰 CW/CCW 원호를 선택하면 모든 시점에서 올바르다.
  */
  const BASE_CW = { U: false, D: false, R: false, F: true, B: true, L: true };

  const arrowEl = document.createElement('div');
  arrowEl.id = 'move-arrow';
  arrowEl.style.display = 'none';
  // viewBox 220×220, 중심(110,110), 반지름 88의 큰 고리 → 큐브(120px)를 감쌈
  // CW/CCW 두 개의 원호 그룹 + 가운데 칸 수 숫자(SVG로 화살표와 함께 표시)
  arrowEl.innerHTML = `
    <svg viewBox="0 0 220 220" class="move-arrow-svg" data-dir="cw">
      <g class="arc arc-cw">
        <path d="M 110 22 A 88 88 0 1 1 22 110" fill="none" stroke-width="12" stroke-linecap="round"/>
        <polygon points="22,80 2,112 42,112" />
      </g>
      <g class="arc arc-ccw">
        <path d="M 110 22 A 88 88 0 1 0 198 110" fill="none" stroke-width="12" stroke-linecap="round"/>
        <polygon points="198,80 178,112 218,112" />
      </g>
    </svg>`;
  cube.appendChild(arrowEl);

  const arrowSvg = arrowEl.querySelector('.move-arrow-svg');
  // 칸 수 배지("×1"/"×2") — 큐브에 가리지 않도록 "드래그로 회전" 옆에 표시
  const turnBadge = document.getElementById('turn-badge');

  // 현재 이동을 화살표로 표시
  window.showMoveArrow = function (mv) {
    const face = mv && mv[0];
    const tf = FACE_TF[face];
    if (!tf) {
      arrowEl.style.display = 'none';
      if (turnBadge) turnBadge.classList.add('hidden');
      console.log('[CUBE][arrow] 알 수 없는 이동, 화살표 숨김:', mv);
      return;
    }

    const prime = mv.includes("'");   // 반시계 (기본 방향 반전)
    const dbl = mv.includes('2');     // 2칸 (180°)

    // 면 기본 방향 XOR prime → 실제로 그릴 방향
    const drawCW = (BASE_CW[face] !== prime);
    const turns = dbl ? 2 : 1;

    arrowEl.style.transform = tf;
    arrowSvg.dataset.dir = drawCW ? 'cw' : 'ccw';
    arrowEl.style.display = '';

    // "드래그로 회전" 옆 칸 수 배지
    if (turnBadge) {
      turnBadge.textContent = '×' + turns;
      turnBadge.classList.remove('hidden');
    }

    console.log(
      `[CUBE][arrow] mv=${mv} face=${face} baseCW=${BASE_CW[face]} ` +
      `prime=${prime} dbl=${dbl} → 그리는방향=${drawCW ? '시계(CW)' : '반시계(CCW)'} 칸수=${turns}`
    );
  };

  window.clearMoveArrow = function () {
    arrowEl.style.display = 'none';
    if (turnBadge) turnBadge.classList.add('hidden');
    console.log('[CUBE][arrow] 화살표 제거');
  };

  applyRotation();
})();
