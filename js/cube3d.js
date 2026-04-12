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
  }, { passive: true });
  wrap.addEventListener('touchend', () => { isDragging = false; });

  // 자동 천천히 회전 (아이들 상태)
  let autoRotate = true;
  let autoTimer = null;

  function startAutoRotate() {
    if (autoTimer) return;
    autoTimer = setInterval(() => {
      if (!isDragging && autoRotate) {
        rotY += 0.3;
        applyRotation();
      }
    }, 30);
  }
  function stopAutoRotate() { autoRotate = false; }
  function resumeAutoRotate() {
    setTimeout(() => { autoRotate = true; }, 3000);
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

  applyRotation();
})();
