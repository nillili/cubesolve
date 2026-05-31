/**
 * main.js
 * 루빅스 큐브 솔버 메인 컨트롤러
 * - 큐브 전개도 색상 입력
 * - 실시간 유효성 검증
 * - 솔루션 계산 및 단계별 표시
 */

'use strict';

/* ============================================================
   상태 관리
============================================================ */
const STATE = {
  faceData: {
    U: Array(9).fill(null),
    R: Array(9).fill(null),
    F: Array(9).fill(null),
    D: Array(9).fill(null),
    L: Array(9).fill(null),
    B: Array(9).fill(null),
  },
  selectedColor: 'W',
  solution: null,
  currentStep: 0,
  solving: false,
};

/* ============================================================
   DOM 초기화
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initFaces();
  initPalette();
  initButtons();
  updateColorCounts();
});

// 6면 각각에 9개 셀 생성
function initFaces() {
  const faceNames = ['U', 'R', 'F', 'D', 'L', 'B'];
  faceNames.forEach(face => {
    const el = document.getElementById(`face-${face}`);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (i === 4) cell.classList.add('center-mark');
      cell.dataset.face = face;
      cell.dataset.idx = i;
      cell.addEventListener('click', onCellClick);
      el.appendChild(cell);
    }
  });
}

// 색상 팔레트 클릭
function initPalette() {
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.selectedColor = btn.dataset.color;
    });
  });
}

function initButtons() {
  document.getElementById('btn-solve').addEventListener('click', onSolve);
  document.getElementById('btn-reset').addEventListener('click', onReset);
}

/* ============================================================
   셀 클릭 처리
============================================================ */
function onCellClick(e) {
  const cell = e.currentTarget;
  const face = cell.dataset.face;
  const idx = parseInt(cell.dataset.idx);

  // 이미 같은 색이면 지우기 (토글)
  if (STATE.faceData[face][idx] === STATE.selectedColor) {
    STATE.faceData[face][idx] = null;
    delete cell.dataset.color;
  } else {
    STATE.faceData[face][idx] = STATE.selectedColor;
    cell.dataset.color = STATE.selectedColor;
  }

  updateColorCounts();
  update3DCube(STATE.faceData);
  hideError();

  // 실시간 간단 검증 (색상 초과 경고)
  realtimeValidation();
}

/* ============================================================
   실시간 유효성 검증 (색상 개수만)
============================================================ */
function realtimeValidation() {
  const counts = countColors(STATE.faceData);
  let hasError = false;

  for (const [color, cnt] of Object.entries(counts)) {
    const el = document.getElementById(`count-${color}`);
    if (!el) continue;
    el.classList.remove('over', 'full');
    if (cnt > 9) {
      el.classList.add('over');
      hasError = true;
    } else if (cnt === 9) {
      el.classList.add('full');
    }
  }

  if (hasError) {
    showError('특정 색상이 9개를 초과했습니다. 색상 카운트를 확인하세요.');
  }
}

/* ============================================================
   색상 카운트 UI 업데이트
============================================================ */
function updateColorCounts() {
  const counts = countColors(STATE.faceData);
  const colorNames = { W: 'W', Y: 'Y', R: 'R', O: 'O', B: 'B', G: 'G' };
  for (const [color] of Object.entries(colorNames)) {
    const el = document.getElementById(`cnt-${color}`);
    if (el) el.textContent = counts[color] || 0;
    const itemEl = document.getElementById(`count-${color}`);
    if (itemEl) {
      itemEl.classList.remove('over', 'full');
      if ((counts[color] || 0) > 9) itemEl.classList.add('over');
      else if ((counts[color] || 0) === 9) itemEl.classList.add('full');
    }
  }
}

/* ============================================================
   초기화
============================================================ */
function onReset() {
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    STATE.faceData[face] = Array(9).fill(null);
  }
  STATE.solution = null;
  STATE.currentStep = 0;

  // 셀 UI 초기화
  document.querySelectorAll('.cell').forEach(cell => {
    delete cell.dataset.color;
  });

  updateColorCounts();
  update3DCube(STATE.faceData);
  hideError();
  resetSolutionPanel();
  setStepIndicator(1);
  if (typeof window.clearMoveArrow === 'function') window.clearMoveArrow();
  if (typeof window.unlockCubeView === 'function') window.unlockCubeView();
}

/* ============================================================
   해결하기 버튼
============================================================ */
async function onSolve() {
  if (STATE.solving) return;

  hideError();

  console.group('[CUBE] 해결하기 시작');
  console.log('[CUBE] 입력 faceData:', JSON.parse(JSON.stringify(STATE.faceData)));
  console.log('[CUBE] 색상 개수:', countColors(STATE.faceData));
  const t0 = performance.now();

  // 로딩 표시
  STATE.solving = true;
  document.getElementById('loading-overlay').classList.remove('hidden');

  // 비동기 처리 (UI 업데이트를 위해 setTimeout 사용)
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const result = await solveCube(STATE.faceData);
    console.log(`[CUBE] solveCube 결과 (${(performance.now() - t0).toFixed(0)}ms):`, result);

    if (!result.valid) {
      console.warn('[CUBE] 유효하지 않음:', result.errors);
      showError(result.errors.join('\n'));
      setStepIndicator(1);
    } else if (result.alreadySolved) {
      console.log('[CUBE] 이미 완성된 큐브');
      showAlreadySolved();
      setStepIndicator(3);
    } else {
      STATE.solution = result.solution;
      STATE.currentStep = 0;
      console.log(`[CUBE] 해법 (${result.solution.length}수):`, result.solution.join(' '));
      showSolution(result.solution);
      setStepIndicator(3);
    }
  } catch (err) {
    console.error('[CUBE] 계산 중 예외:', err);
    showError('계산 중 오류가 발생했습니다: ' + err.message);
  } finally {
    STATE.solving = false;
    document.getElementById('loading-overlay').classList.add('hidden');
    console.groupEnd();
  }
}

/* ============================================================
   솔루션 UI 표시
============================================================ */
function showSolution(moves) {
  const panel = document.getElementById('solution-content');
  setStepIndicator(2);
  setTimeout(() => setStepIndicator(3), 300);

  if (!moves || moves.length === 0) {
    showAlreadySolved();
    return;
  }

  // 풀이 중에는 3D 큐브 시점을 고정 (전후좌우 혼동 방지)
  if (typeof window.lockCubeView === 'function') window.lockCubeView();

  // 현재 스텝으로 큐브 상태 추적
  let displayStep = STATE.currentStep;

  function render() {
    displayStep = STATE.currentStep;
    const total = moves.length;
    const isDone = displayStep >= total;

    // 3D 미리보기에 현재 이동 방향 화살표 표시
    if (isDone) {
      console.log(`[CUBE][step] 완료 상태 (${total}/${total}) — 화살표 제거, 시점 고정 해제`);
      if (typeof window.clearMoveArrow === 'function') window.clearMoveArrow();
      // 모든 스텝 완료 후에는 자유롭게 돌려볼 수 있도록 시점 고정 해제
      if (typeof window.unlockCubeView === 'function') window.unlockCubeView();
    } else {
      console.log(`[CUBE][step] 스텝 ${displayStep + 1}/${total} — 현재 이동: ${moves[displayStep]}`);
      if (typeof window.lockCubeView === 'function') window.lockCubeView();
      if (typeof window.showMoveArrow === 'function') window.showMoveArrow(moves[displayStep]);
    }

    panel.innerHTML = `
      <div class="solution-header">
        <div class="solution-stats">
          <div class="stat-badge">총 <b>${total}</b> 스텝</div>
          <div class="stat-badge">진행 <b>${Math.min(displayStep, total)}</b>/${total}</div>
        </div>
        <button class="btn btn-secondary" id="btn-restart-sol" style="padding:6px 12px;font-size:0.8rem;">
          <i class="fas fa-redo"></i> 다시보기
        </button>
      </div>

      <!-- 전체 이동 기보 -->
      <div class="move-notation" id="move-notation">
        ${moves.map((mv, i) => {
          let cls = 'move-chip';
          if (i < displayStep) cls += ' done';
          if (i === displayStep) cls += ' current';
          return `<span class="${cls}" data-step="${i}">${mv}</span>`;
        }).join('')}
      </div>

      <!-- 스텝 네비게이터 -->
      <div class="step-nav">
        <button class="nav-btn" id="nav-first" ${displayStep === 0 ? 'disabled' : ''}>
          <i class="fas fa-fast-backward"></i>
        </button>
        <button class="nav-btn" id="nav-prev" ${displayStep === 0 ? 'disabled' : ''}>
          <i class="fas fa-step-backward"></i>
        </button>
        <div class="step-counter">
          스텝 <b>${isDone ? total : displayStep + 1}</b> / ${total}
        </div>
        <button class="nav-btn" id="nav-next" ${isDone ? 'disabled' : ''}>
          <i class="fas fa-step-forward"></i>
        </button>
        <button class="nav-btn" id="nav-last" ${isDone ? 'disabled' : ''}>
          <i class="fas fa-fast-forward"></i>
        </button>
      </div>

      <!-- 현재 이동 카드 -->
      ${isDone
        ? `<div class="solved-banner">
              <i class="fas fa-check-circle"></i>
              <div>
                <p>🎉 큐브가 완성되었습니다!</p>
                <p style="font-size:0.8rem;margin-top:4px;opacity:0.8;">모든 ${total}개 스텝을 완료했습니다.</p>
              </div>
           </div>`
        : (() => {
            const mv = moves[displayStep];
            const info = getMoveInfo(mv);
            const dbl = mv.includes('2');
            const prime = mv.includes("'");
            const turnAmt = dbl ? '2칸' : '1칸';
            const dir = dbl ? '' : (prime ? ' · 반시계 방향' : ' · 시계 방향');
            return `<div class="current-move-card">
              <div class="move-symbol">${mv}</div>
              <div class="move-info">
                <div class="move-name">${info.name}</div>
                <div class="move-desc">${info.desc}</div>
                <div class="move-turn"><i class="fas fa-rotate"></i> 회전량: <b>${turnAmt}</b>${dir}</div>
              </div>
            </div>`;
          })()
      }
    `;

    // 이벤트 바인딩
    document.getElementById('btn-restart-sol')?.addEventListener('click', () => {
      STATE.currentStep = 0;
      // 큐브를 원래 섞인 상태로 복원
      update3DCube(STATE.faceData);
      render();
    });

    document.getElementById('nav-first')?.addEventListener('click', () => {
      STATE.currentStep = 0;
      update3DCube(STATE.faceData);
      render();
    });

    document.getElementById('nav-prev')?.addEventListener('click', () => {
      if (STATE.currentStep > 0) {
        STATE.currentStep--;
        updateCubeForStep(moves, STATE.currentStep);
        render();
      }
    });

    document.getElementById('nav-next')?.addEventListener('click', () => {
      if (STATE.currentStep < total) {
        const mv = moves[STATE.currentStep];
        STATE.currentStep++;
        updateCubeForStep(moves, STATE.currentStep);
        if (typeof window.animateMove === 'function') {
          window.animateMove(mv, null);
        }
        render();
      }
    });

    document.getElementById('nav-last')?.addEventListener('click', () => {
      STATE.currentStep = total;
      updateCubeForStep(moves, total);
      render();
    });

    // 기보 칩 클릭으로 해당 스텝으로 이동
    document.querySelectorAll('.move-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const step = parseInt(chip.dataset.step);
        STATE.currentStep = step;
        updateCubeForStep(moves, step);
        render();
      });
    });
  }

  render();
}

// 특정 스텝까지 큐브 상태 계산 후 3D 업데이트
function updateCubeForStep(moves, targetStep) {
  // 원본 faceData를 복사하여 targetStep까지 이동 적용
  const simFace = {};
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    simFace[face] = [...STATE.faceData[face]];
  }

  // FaceletCube로 변환
  const cube = buildFaceletCubeFromFaceData(simFace);
  if (!cube) return;

  for (let i = 0; i < targetStep && i < moves.length; i++) {
    cube.move(moves[i]);
  }

  // 다시 faceData로 변환
  const resultFaceData = faceletCubeToFaceData(cube, STATE.faceData);
  update3DCube(resultFaceData);
}

// FaceletCube → faceData 변환
function faceletCubeToFaceData(cube, originalFaceData) {
  // 센터 색상 → 실제 색상 매핑
  const centers = {};
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    centers[face] = originalFaceData[face][4];
  }

  // face 인덱스 → 색상
  // cube.f[i]는 0=U,1=R,2=F,3=D,4=L,5=B 면 색
  const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
  const result = {};
  for (const face of FACE_ORDER) result[face] = Array(9).fill(null);

  for (let i = 0; i < 54; i++) {
    const faceIdx = Math.floor(i / 9);
    const cellIdx = i % 9;
    const faceName = FACE_ORDER[faceIdx];
    const colorFace = FACE_ORDER[cube.f[i]];
    result[faceName][cellIdx] = centers[colorFace];
  }

  return result;
}

// faceData → FaceletCube 변환
function buildFaceletCubeFromFaceData(faceData) {
  const centers = {};
  for(const face of ['U','R','F','D','L','B']) centers[face] = faceData[face][4];
  const cubeStr = buildCubeString(faceData, centers);
  if (!cubeStr) return null;
  const cube = new FaceletCube();
  cube.fromString(cubeStr);
  return cube;
}

/* ============================================================
   이미 완성된 큐브
============================================================ */
function showAlreadySolved() {
  const panel = document.getElementById('solution-content');
  panel.innerHTML = `
    <div class="already-solved">
      <i class="fas fa-star"></i>
      <div>
        <p style="font-weight:600;">이미 완성된 큐브입니다! 🎊</p>
        <p style="font-size:0.8rem;margin-top:4px;opacity:0.8;">입력한 큐브가 이미 해결된 상태입니다.</p>
      </div>
    </div>
  `;
}

/* ============================================================
   솔루션 패널 초기화
============================================================ */
function resetSolutionPanel() {
  const panel = document.getElementById('solution-content');
  panel.innerHTML = `
    <div class="solution-empty">
      <i class="fas fa-puzzle-piece"></i>
      <p>큐브 색상을 입력하고<br/><b>해결하기</b> 버튼을 누르세요</p>
    </div>
  `;
}

/* ============================================================
   에러 메시지
============================================================ */
function showError(msg) {
  const el = document.getElementById('error-msg');
  const text = document.getElementById('error-text');
  if (!el || !text) return;
  text.innerHTML = msg.replace(/\n/g, '<br/>');
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  document.getElementById('error-msg')?.classList.add('hidden');
}

/* ============================================================
   스텝 인디케이터
============================================================ */
function setStepIndicator(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`step${i}-indicator`);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    else if (i === step) el.classList.add('active');
  }
}
