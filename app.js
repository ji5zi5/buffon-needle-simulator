/**
 * 뷔퐁의 바늘 시뮬레이터
 * Buffon's Needle Simulation for estimating π
 */

// ========================================
// 상수 및 설정
// ========================================
const STORAGE_KEY = 'buffon-needle-simulator';
const CHART_UPDATE_INTERVAL = 100; // 그래프 업데이트 간격 (던지기 횟수)
const MAX_VISIBLE_NEEDLES = 500; // 화면에 표시할 최대 바늘 수

// ========================================
// 상태 관리
// ========================================
const state = {
    // 시뮬레이션 파라미터
    needleLength: 1.0,
    lineSpacing: 2.0,
    speed: 100,
    
    // 시뮬레이션 상태
    isRunning: false,
    totalThrows: 0,
    crossings: 0,
    
    // 바늘 데이터 (시각화용)
    needles: [],
    
    // 그래프 데이터
    history: []
};

// ========================================
// DOM 요소
// ========================================
const elements = {
    // 캔버스
    canvas: document.getElementById('simulationCanvas'),
    ctx: null,
    
    // 통계
    piEstimate: document.getElementById('piEstimate'),
    errorRate: document.getElementById('errorRate'),
    totalThrows: document.getElementById('totalThrows'),
    crossings: document.getElementById('crossings'),
    
    // 컨트롤
    needleLength: document.getElementById('needleLength'),
    needleLengthValue: document.getElementById('needleLengthValue'),
    lineSpacing: document.getElementById('lineSpacing'),
    lineSpacingValue: document.getElementById('lineSpacingValue'),
    speed: document.getElementById('speed'),
    speedValue: document.getElementById('speedValue'),
    
    // 버튼
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    saveBtn: document.getElementById('saveBtn'),
    loadBtn: document.getElementById('loadBtn'),
    exportBtn: document.getElementById('exportBtn'),
    exportMenu: document.getElementById('exportMenu'),
    exportPng: document.getElementById('exportPng'),
    exportCsv: document.getElementById('exportCsv'),
    exportJson: document.getElementById('exportJson'),
    themeToggle: document.getElementById('themeToggle'),
    
    // 차트
    chartCanvas: document.getElementById('convergenceChart'),
    chart: null
};

// ========================================
// 초기화
// ========================================
function init() {
    // 캔버스 설정
    setupCanvas();
    
    // 차트 설정
    setupChart();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 테마 초기화
    initTheme();
    
    // 초기 렌더링
    render();
}

function setupCanvas() {
    elements.ctx = elements.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = elements.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    elements.canvas.width = rect.width * dpr;
    elements.canvas.height = rect.height * dpr;
    elements.canvas.style.width = rect.width + 'px';
    elements.canvas.style.height = rect.height + 'px';
    
    elements.ctx.scale(dpr, dpr);
    
    if (!state.isRunning) {
        render();
    }
}

function setupChart() {
    const ctx = elements.chartCanvas.getContext('2d');
    
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#8B95A1' : '#8B95A1'; // Toss Gray
    
    elements.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'π 추정값',
                    data: [],
                    borderColor: '#3182F6', // Toss Blue
                    backgroundColor: 'rgba(49, 130, 246, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: '실제 π',
                    data: [],
                    borderColor: '#F45452', // Toss Red
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 20,
                        font: {
                            family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#333D4B' : '#FFFFFF',
                    titleColor: isDark ? '#F4F5F7' : '#191F28',
                    bodyColor: isDark ? '#B0B8C1' : '#6B7684',
                    borderColor: isDark ? '#4E5968' : '#E5E8EB',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                const error = Math.abs(context.raw - Math.PI) / Math.PI * 100;
                                return `π ≈ ${context.raw.toFixed(6)} (오차: ${error.toFixed(4)}%)`;
                            }
                            return `π = ${Math.PI.toFixed(6)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false, // Clean look
                    grid: {
                        display: false
                    }
                },
                y: {
                    position: 'right',
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: gridColor,
                        borderDash: [4, 4]
                    },
                    border: {
                        display: false
                    },
                    suggestedMin: 2.5,
                    suggestedMax: 4.0
                }
            }
        }
    });
}

// ========================================
// 이벤트 리스너
// ========================================
function setupEventListeners() {
    // 슬라이더
    elements.needleLength.addEventListener('input', (e) => {
        state.needleLength = parseFloat(e.target.value);
        elements.needleLengthValue.textContent = state.needleLength.toFixed(1);
        if (!state.isRunning) render();
    });
    
    elements.lineSpacing.addEventListener('input', (e) => {
        state.lineSpacing = parseFloat(e.target.value);
        elements.lineSpacingValue.textContent = state.lineSpacing.toFixed(1);
        if (!state.isRunning) render();
    });
    
    elements.speed.addEventListener('input', (e) => {
        state.speed = parseInt(e.target.value);
        elements.speedValue.textContent = state.speed;
    });
    
    // 버튼
    elements.startBtn.addEventListener('click', startSimulation);
    elements.pauseBtn.addEventListener('click', pauseSimulation);
    elements.resetBtn.addEventListener('click', resetSimulation);
    elements.saveBtn.addEventListener('click', saveState);
    elements.loadBtn.addEventListener('click', loadState);
    
    // 내보내기 드롭다운
    elements.exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
        elements.exportMenu.classList.remove('show');
    });
    
    elements.exportPng.addEventListener('click', exportAsPng);
    elements.exportCsv.addEventListener('click', exportAsCsv);
    elements.exportJson.addEventListener('click', exportAsJson);
    
    // 테마 토글
    elements.themeToggle.addEventListener('click', toggleTheme);
}

// ========================================
// 테마 관리
// ========================================
function initTheme() {
    // Check system preference first if no saved theme
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    updateThemeIcon(theme);
    updateChartTheme(theme); // Ensure chart matches initial theme
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // 차트 색상 업데이트
    updateChartTheme(newTheme);
    
    if (!state.isRunning) render();
}

function updateThemeIcon(theme) {
    elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function updateChartTheme(theme) {
    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#8B95A1' : '#8B95A1';
    
    elements.chart.options.scales.x.ticks.color = textColor;
    elements.chart.options.scales.y.ticks.color = textColor;
    elements.chart.options.scales.y.grid.color = gridColor;
    elements.chart.options.plugins.legend.labels.color = textColor;
    
    elements.chart.options.plugins.tooltip.backgroundColor = isDark ? '#333D4B' : '#FFFFFF';
    elements.chart.options.plugins.tooltip.titleColor = isDark ? '#F4F5F7' : '#191F28';
    elements.chart.options.plugins.tooltip.bodyColor = isDark ? '#B0B8C1' : '#6B7684';
    elements.chart.options.plugins.tooltip.borderColor = isDark ? '#4E5968' : '#E5E8EB';
    
    elements.chart.update('none');
}

// ========================================
// 시뮬레이션 로직
// ========================================
let animationId = null;
let lastTime = 0;
let accumulator = 0;
let lastChartUpdate = 0;
const CHART_UPDATE_MS = 50; // 50ms마다 차트 업데이트

function startSimulation() {
    if (state.isRunning) return;
    
    state.isRunning = true;
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    
    lastTime = performance.now();
    accumulator = 0;
    
    animate();
}

function pauseSimulation() {
    if (!state.isRunning) return;
    
    state.isRunning = false;
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function resetSimulation() {
    pauseSimulation();
    
    state.totalThrows = 0;
    state.crossings = 0;
    state.needles = [];
    state.history = [];
    
    // 차트 리셋
    elements.chart.data.labels = [];
    elements.chart.data.datasets[0].data = [];
    elements.chart.data.datasets[1].data = [];
    elements.chart.update('none');
    
    // UI 업데이트
    updateStats();
    render();
    
    elements.startBtn.disabled = false;
}

function animate(currentTime = performance.now()) {
    if (!state.isRunning) return;
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // 초당 던지기 횟수를 프레임당 던지기 횟수로 변환
    accumulator += (state.speed * deltaTime) / 1000;
    
    const throwsThisFrame = Math.floor(accumulator);
    accumulator -= throwsThisFrame;
    
    // 바늘 던지기
    for (let i = 0; i < throwsThisFrame; i++) {
        throwNeedle();
    }
    
    // 렌더링 및 업데이트
    render();
    updateStats();
    
    // 시간 기반 그래프 업데이트 (50ms마다)
    if (state.totalThrows > 0 && currentTime - lastChartUpdate >= CHART_UPDATE_MS) {
        updateChart();
        lastChartUpdate = currentTime;
    }
    
    animationId = requestAnimationFrame(animate);
}

function throwNeedle() {
    const L = state.needleLength;
    const D = state.lineSpacing;
    
    // 바늘 중심의 위치 (선 사이에서)
    const x = Math.random() * (D / 2);
    
    // 바늘의 각도 (0 ~ π)
    const theta = Math.random() * Math.PI;
    
    // 교차 조건: x ≤ (L/2) * sin(θ)
    const crosses = x <= (L / 2) * Math.sin(theta);
    
    state.totalThrows++;
    if (crosses) {
        state.crossings++;
    }
    
    // 기록 저장
    state.history.push({
        throws: state.totalThrows,
        crossings: state.crossings,
        pi: calculatePi()
    });
    
    // 시각화용 바늘 저장 (최대 개수 제한)
    if (state.needles.length >= MAX_VISIBLE_NEEDLES) {
        state.needles.shift();
    }
    
    state.needles.push({
        x: x,
        theta: theta,
        crosses: crosses,
        // 캔버스 위치용 (나중에 계산)
        canvasX: Math.random(),
        canvasY: Math.random()
    });
}

function calculatePi() {
    if (state.crossings === 0) return 0;
    
    const L = state.needleLength;
    const D = state.lineSpacing;
    
    // π ≈ (2 * L * n) / (D * h)
    return (2 * L * state.totalThrows) / (D * state.crossings);
}

// ========================================
// 렌더링
// ========================================
function render() {
    const ctx = elements.ctx;
    const width = elements.canvas.width / (window.devicePixelRatio || 1);
    const height = elements.canvas.height / (window.devicePixelRatio || 1);
    
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#1E2530' : '#F9FAFB'; // Match Card BG
    ctx.fillRect(0, 0, width, height);
    
    // 평행선 그리기
    drawLines(ctx, width, height);
    
    // 바늘 그리기
    drawNeedles(ctx, width, height);
}

function drawLines(ctx, width, height) {
    const D = state.lineSpacing;
    const scale = 80; // 픽셀/단위
    const lineSpacingPx = D * scale;
    
    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 2;
    
    // 수직 평행선 그리기
    const startX = (width % lineSpacingPx) / 2;
    
    for (let x = startX; x < width; x += lineSpacingPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
}

function drawNeedles(ctx, width, height) {
    const L = state.needleLength;
    const D = state.lineSpacing;
    const scale = 80;
    const needleLengthPx = L * scale;
    const lineSpacingPx = D * scale;
    
    const isDark = document.documentElement.classList.contains('dark');
    
    state.needles.forEach(needle => {
        // 캔버스 위치 계산
        const centerX = needle.canvasX * width;
        const centerY = needle.canvasY * height;
        
        // 바늘 양 끝점 계산
        const halfLength = needleLengthPx / 2;
        const dx = halfLength * Math.cos(needle.theta);
        const dy = halfLength * Math.sin(needle.theta);
        
        const x1 = centerX - dx;
        const y1 = centerY - dy;
        const x2 = centerX + dx;
        const y2 = centerY + dy;
        
        // 색상 설정 (교차: 빨강, 미교차: 파랑)
        if (needle.crosses) {
            ctx.strokeStyle = '#EF4444'; // Vivid Red
            ctx.lineWidth = 2.5;
        } else {
            ctx.strokeStyle = '#60A5FA'; // Soft Blue
            ctx.lineWidth = 1.5;
        }
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

// ========================================
// 통계 및 차트 업데이트
// ========================================
function updateStats() {
    const pi = calculatePi();
    const error = pi > 0 ? Math.abs(pi - Math.PI) / Math.PI * 100 : 0;
    
    elements.piEstimate.textContent = pi > 0 ? pi.toFixed(8) : '-';
    elements.errorRate.textContent = pi > 0 ? error.toFixed(4) + '%' : '-';
    elements.totalThrows.textContent = state.totalThrows.toLocaleString();
    elements.crossings.textContent = state.crossings.toLocaleString();
}

function updateChart() {
    const pi = calculatePi();
    
    if (pi <= 0) return;
    
    elements.chart.data.labels.push(state.totalThrows);
    elements.chart.data.datasets[0].data.push(pi);
    elements.chart.data.datasets[1].data.push(Math.PI);
    
    // 데이터 포인트가 너무 많으면 간추리기
    if (elements.chart.data.labels.length > 200) {
        // 처음 절반 데이터를 간추려서 절반으로 줄임
        const labels = elements.chart.data.labels;
        const data0 = elements.chart.data.datasets[0].data;
        const data1 = elements.chart.data.datasets[1].data;
        
        const newLabels = [];
        const newData0 = [];
        const newData1 = [];
        
        for (let i = 0; i < labels.length; i += 2) {
            newLabels.push(labels[i]);
            newData0.push(data0[i]);
            newData1.push(data1[i]);
        }
        
        elements.chart.data.labels = newLabels;
        elements.chart.data.datasets[0].data = newData0;
        elements.chart.data.datasets[1].data = newData1;
    }
    
    elements.chart.update('none');
}

// ========================================
// 저장/불러오기
// ========================================
function saveState() {
    const saveData = {
        needleLength: state.needleLength,
        lineSpacing: state.lineSpacing,
        speed: state.speed,
        totalThrows: state.totalThrows,
        crossings: state.crossings,
        history: state.history.filter((_, i) => i % 10 === 0), // 10개 중 1개만 저장
        savedAt: new Date().toISOString()
    };
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
        showToast('저장되었습니다!', 'success');
    } catch (e) {
        showToast('저장 실패: ' + e.message, 'error');
    }
}

function loadState() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        
        if (!savedData) {
            showToast('저장된 데이터가 없습니다.', 'error');
            return;
        }
        
        const data = JSON.parse(savedData);
        
        // 시뮬레이션 정지
        pauseSimulation();
        
        // 상태 복원
        state.needleLength = data.needleLength;
        state.lineSpacing = data.lineSpacing;
        state.speed = data.speed;
        state.totalThrows = data.totalThrows;
        state.crossings = data.crossings;
        state.history = data.history || [];
        state.needles = []; // 바늘은 복원하지 않음
        
        // UI 업데이트
        elements.needleLength.value = state.needleLength;
        elements.needleLengthValue.textContent = state.needleLength.toFixed(1);
        elements.lineSpacing.value = state.lineSpacing;
        elements.lineSpacingValue.textContent = state.lineSpacing.toFixed(1);
        elements.speed.value = state.speed;
        elements.speedValue.textContent = state.speed;
        
        // 차트 복원
        elements.chart.data.labels = [];
        elements.chart.data.datasets[0].data = [];
        elements.chart.data.datasets[1].data = [];
        
        state.history.forEach(h => {
            elements.chart.data.labels.push(h.throws);
            elements.chart.data.datasets[0].data.push(h.pi);
            elements.chart.data.datasets[1].data.push(Math.PI);
        });
        
        elements.chart.update('none');
        updateStats();
        render();
        
        const savedDate = new Date(data.savedAt).toLocaleString('ko-KR');
        showToast(`불러왔습니다! (${savedDate})`, 'success');
        
    } catch (e) {
        showToast('불러오기 실패: ' + e.message, 'error');
    }
}

// ========================================
// 내보내기
// ========================================
function exportAsPng() {
    elements.canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `buffon-needle-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('PNG 저장됨!', 'success');
    });
}

function exportAsCsv() {
    if (state.history.length === 0) {
        showToast('내보낼 데이터가 없습니다.', 'error');
        return;
    }
    
    let csv = '던진횟수,교차횟수,π추정값,오차율(%)\n';
    
    // 샘플링 (최대 1000행)
    const step = Math.max(1, Math.floor(state.history.length / 1000));
    
    for (let i = 0; i < state.history.length; i += step) {
        const h = state.history[i];
        const error = Math.abs(h.pi - Math.PI) / Math.PI * 100;
        csv += `${h.throws},${h.crossings},${h.pi.toFixed(8)},${error.toFixed(6)}\n`;
    }
    
    downloadText(csv, `buffon-needle-${Date.now()}.csv`, 'text/csv');
    showToast('CSV 저장됨!', 'success');
}

function exportAsJson() {
    const exportData = {
        parameters: {
            needleLength: state.needleLength,
            lineSpacing: state.lineSpacing
        },
        results: {
            totalThrows: state.totalThrows,
            crossings: state.crossings,
            piEstimate: calculatePi(),
            actualPi: Math.PI,
            errorRate: Math.abs(calculatePi() - Math.PI) / Math.PI * 100
        },
        history: state.history.filter((_, i) => i % 10 === 0),
        exportedAt: new Date().toISOString()
    };
    
    downloadText(
        JSON.stringify(exportData, null, 2),
        `buffon-needle-${Date.now()}.json`,
        'application/json'
    );
    showToast('JSON 저장됨!', 'success');
}

function downloadText(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ========================================
// 유틸리티
// ========================================
function showToast(message, type = 'success') {
    // 기존 토스트 제거
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animation trigger
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for transition
    }, 3000);
}

// ========================================
// 앱 시작
// ========================================
document.addEventListener('DOMContentLoaded', init);
