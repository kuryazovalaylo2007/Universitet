// ===================== CONFIG =====================
const API = window.location.origin;
const CHART_OPTS = {
  color: '#e8e8f0',
  plugins: { legend: { labels: { color: '#8888a0', font: { family: 'Space Mono', size: 11 } } } },
  scales: {
    x: { ticks: { color: '#8888a0', font: { family: 'Space Mono', size: 10 } }, grid: { color: '#1a1a24' } },
    y: { ticks: { color: '#8888a0', font: { family: 'Space Mono', size: 10 } }, grid: { color: '#1a1a24' } }
  }
};

let charts = {};

// ===================== NAVIGATION =====================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');

    if (page === 'talabalar') loadTalabalar();
    if (page === 'baholar') loadBaholarTahlil();
    if (page === 'davomat') loadDavomatTahlil();
    if (page === 'reyting') loadReyting();
  });
});

// ===================== CHART HELPERS =====================
function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function createBarChart(id, labels, values, color = '#7c6af7') {
  destroyChart(id);
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: color + '99', borderColor: color, borderWidth: 2, borderRadius: 6 }]
    },
    options: { ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: false } }, responsive: true, maintainAspectRatio: true }
  });
}

function createDoughnutChart(id, labels, values) {
  destroyChart(id);
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx) return;
  const colors = { A: '#4af7a0', B: '#7c6af7', C: '#f7c26a', D: '#f77a4a', F: '#f74a6a' };
  charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: labels.map(l => (colors[l] || '#888') + 'cc'), borderColor: '#1a1a24', borderWidth: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#8888a0', font: { family: 'Space Mono', size: 10 }, padding: 12 } } }
    }
  });
}

function createLineChart(id, labels, values, color = '#7c6af7') {
  destroyChart(id);
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values, borderColor: color, borderWidth: 2,
        backgroundColor: color + '22', fill: true,
        tension: 0.4, pointBackgroundColor: color, pointRadius: 4
      }]
    },
    options: { ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: false } }, responsive: true, maintainAspectRatio: true }
  });
}

// ===================== DASHBOARD =====================
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/api/dashboard`);
    const d = await res.json();

    document.getElementById('stat-talabalar').textContent = d.umumiy.jami_talabalar;
    document.getElementById('stat-baho').textContent = d.umumiy.ortacha_baho;
    document.getElementById('stat-davomat').textContent = d.umumiy.davomat_foiz + '%';
    document.getElementById('stat-a').textContent = d.umumiy.a_talabalar;

    // Fan baholar
    createBarChart('chart-fan-baho', d.fan_baho.labels, d.fan_baho.values, '#7c6af7');

    // Harf taqsimoti
    const harfLabels = Object.keys(d.harf_taqsim);
    const harfValues = Object.values(d.harf_taqsim);
    createDoughnutChart('chart-harf', harfLabels, harfValues);

    // Guruh baholar
    const guruhLabels = Object.keys(d.guruh_baho);
    const guruhValues = Object.values(d.guruh_baho);
    createBarChart('chart-guruh', guruhLabels, guruhValues, '#4af7a0');

    // Oylik davomat
    const oyLabels = Object.keys(d.oylik_davomat);
    const oyValues = Object.values(d.oylik_davomat);
    createLineChart('chart-davomat-trend', oyLabels, oyValues, '#f7c26a');
  } catch (err) {
    console.error('Dashboard xatosi:', err);
  }
}

// ===================== TALABALAR =====================
async function loadTalabalar() {
  const guruh = document.getElementById('guruh-filter')?.value || '';
  const q = document.getElementById('qidiruv')?.value || '';
  try {
    const res = await fetch(`${API}/api/talabalar?guruh=${guruh}&q=${q}`);
    const d = await res.json();

    // Guruh filterini to'ldirish
    const guruhSel = document.getElementById('guruh-filter');
    if (guruhSel && guruhSel.options.length <= 1) {
      d.guruhlar.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g; opt.textContent = g;
        guruhSel.appendChild(opt);
      });
    }

    const tbody = document.getElementById('talabalar-tbody');
    tbody.innerHTML = '';
    d.talabalar.forEach((t, i) => {
      const holat = t.ortacha_baho >= 71 ? '<span class="badge badge-green">A\'lo</span>' :
                    t.ortacha_baho >= 56 ? '<span class="badge badge-blue">Yaxshi</span>' :
                    t.ortacha_baho >= 40 ? '<span class="badge badge-yellow">Qoniqarli</span>' :
                    '<span class="badge badge-red">Qoniqarsiz</span>';
      tbody.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${t.ism}</strong></td>
          <td><span class="badge badge-blue">${t.guruh}</span></td>
          <td style="color:var(--text2)">${t.email}</td>
          <td><strong style="color:${t.ortacha_baho>=71?'var(--green)':t.ortacha_baho>=56?'var(--accent)':'var(--red)'}">${t.ortacha_baho}</strong></td>
          <td>${t.davomat_foiz}%</td>
          <td>${holat}</td>
          <td style="display:flex; gap:8px;">
            <button class="btn-detail" onclick="showTalaba(${t.id})">Ko'rish</button>
            <button class="btn-detail" style="border-color:var(--red); color:var(--red);" onclick="deleteTalaba(${t.id})">O'chirish</button>
          </td>
        </tr>`;
    });
  } catch (err) {
    console.error('Talabalar xatosi:', err);
  }
}

// Qidiruv va filter
document.getElementById('qidiruv')?.addEventListener('input', () => loadTalabalar());
document.getElementById('guruh-filter')?.addEventListener('change', () => loadTalabalar());

// ADD STUDENT FUNKSIYALARI
function openAddModal() {
  document.getElementById('add-modal-overlay').classList.add('open');
}

function closeAddModal() {
  document.getElementById('add-modal-overlay').classList.remove('open');
  document.getElementById('add-student-form').reset();
}

async function addTalaba(e) {
  e.preventDefault();
  const ism = document.getElementById('new-ism').value;
  const guruh = document.getElementById('new-guruh').value;
  const email = document.getElementById('new-email').value;
  const baho = parseFloat(document.getElementById('new-baho').value) || 0;
  const davomat = parseFloat(document.getElementById('new-davomat').value) || 0;

  try {
    const res = await fetch(`${API}/api/talaba`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ism, guruh, email, baho, davomat })
    });
    if (res.ok) {
      closeAddModal();
      loadTalabalar(); // Ro'yxatni yangilash
      // Dashboarddagi statistikani yangilash uchun u qismga o'tganda loadDashboard ishlaydi
    }
  } catch (err) {
    console.error('Qo\'shishda xatolik:', err);
  }
}

// DELETE STUDENT
async function deleteTalaba(id) {
  if (!confirm("Haqiqatan ham bu talabani o'chirmoqchimisiz?")) return;
  try {
    const res = await fetch(`${API}/api/talaba/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      loadTalabalar();
    }
  } catch (err) {
    console.error('O\'chirishda xatolik:', err);
  }
}
window.openAddModal = openAddModal;
window.closeAddModal = closeAddModal;
window.addTalaba = addTalaba;
window.deleteTalaba = deleteTalaba;

// ===================== TALABA DETAIL =====================
async function showTalaba(id) {
  try {
    const res = await fetch(`${API}/api/talaba/${id}`);
    const d = await res.json();
    const modal = document.getElementById('modal-content');

    const harfClass = { A: 'baho-a', B: 'baho-b', C: 'baho-c', D: 'baho-d', F: 'baho-f' };

    // Fanlar bo'yicha guruhlash
    const fanMap = {};
    d.baholar.forEach(b => {
      if (!fanMap[b.fan]) fanMap[b.fan] = [];
      fanMap[b.fan].push(b);
    });

    let bahoHTML = '<div class="baho-grid">';
    Object.entries(fanMap).forEach(([fan, baholar]) => {
      const avg = (baholar.reduce((s, b) => s + b.jami, 0) / baholar.length).toFixed(1);
      const harf = baholar[0].harf;
      bahoHTML += `
        <div class="baho-item">
          <span class="baho-fan">${fan}</span>
          <div style="text-align:right">
            <div class="baho-val ${harfClass[harf]}">${avg}</div>
            <div style="font-size:10px;color:var(--text2)">${harf}</div>
          </div>
        </div>`;
    });
    bahoHTML += '</div>';

    let davomatHTML = '<div class="baho-grid">';
    Object.entries(d.fan_davomat).forEach(([fan, foiz]) => {
      const color = foiz >= 80 ? 'var(--green)' : foiz >= 60 ? 'var(--yellow)' : 'var(--red)';
      davomatHTML += `
        <div class="baho-item">
          <span class="baho-fan">${fan}</span>
          <strong style="color:${color}">${foiz}%</strong>
        </div>`;
    });
    davomatHTML += '</div>';

    modal.innerHTML = `
      <div class="modal-talaba-name">${d.talaba.ism}</div>
      <div class="modal-meta">${d.talaba.guruh} · ${d.talaba.email} · Umumiy davomat: <strong style="color:var(--green)">${d.davomat_foiz}%</strong></div>
      <div class="modal-section"><h4>📊 Baholar (fanlar bo'yicha)</h4>${bahoHTML}</div>
      <div class="modal-section"><h4>📅 Davomat (fan bo'yicha)</h4>${davomatHTML}</div>`;

    document.getElementById('modal-overlay').classList.add('open');
  } catch (err) {
    console.error('Talaba detail xatosi:', err);
  }
}

document.getElementById('modal-close')?.addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('open');
});
document.getElementById('modal-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay'))
    document.getElementById('modal-overlay').classList.remove('open');
});
window.showTalaba = showTalaba;

// ===================== BAHOLAR TAHLIL =====================
async function loadBaholarTahlil(fan = '', semestr = '') {
  try {
    const res = await fetch(`${API}/api/baholar/tahlil?fan=${fan}&semestr=${semestr}`);
    const d = await res.json();

    document.getElementById('b-max').textContent = d.stats.max;
    document.getElementById('b-min').textContent = d.stats.min;
    document.getElementById('b-avg').textContent = d.stats.ortacha;
    document.getElementById('b-med').textContent = d.stats.median;
    document.getElementById('b-std').textContent = d.stats.std;

    // Fan filter to'ldirish
    const fanSel = document.getElementById('fan-filter');
    if (fanSel && fanSel.options.length <= 1) {
      d.fanlar.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f; opt.textContent = f;
        fanSel.appendChild(opt);
      });
    }

    createBarChart('chart-fan-filtered',
      Object.keys(d.fan_ortacha), Object.values(d.fan_ortacha), '#7c6af7');

    const harfLabels = Object.keys(d.harf_taqsim);
    const harfValues = Object.values(d.harf_taqsim);
    createDoughnutChart('chart-harf-filtered', harfLabels, harfValues);
  } catch (err) {
    console.error('Baholar tahlil xatosi:', err);
  }
}

document.getElementById('baho-filter-btn')?.addEventListener('click', () => {
  const fan = document.getElementById('fan-filter').value;
  const semestr = document.getElementById('semestr-filter').value;
  loadBaholarTahlil(fan, semestr);
});

// ===================== DAVOMAT TAHLIL =====================
async function loadDavomatTahlil() {
  try {
    const res = await fetch(`${API}/api/davomat/tahlil`);
    const d = await res.json();

    createBarChart('chart-guruh-davomat',
      Object.keys(d.guruh_davomat), Object.values(d.guruh_davomat), '#4af7a0');

    createBarChart('chart-fan-davomat',
      Object.keys(d.fan_davomat), Object.values(d.fan_davomat), '#f7c26a');

    const hafLabels = Object.keys(d.haftalik_trend).map(k => `${k}-hafta`);
    const hafValues = Object.values(d.haftalik_trend);
    createLineChart('chart-haftalik', hafLabels, hafValues, '#7c6af7');

    // Xavfli talabalar
    const tbody = document.getElementById('xavfli-tbody');
    tbody.innerHTML = '';
    d.xavfli_talabalar.forEach(t => {
      const color = t.davomat_foiz < 40 ? 'badge-red' : 'badge-yellow';
      tbody.innerHTML += `
        <tr>
          <td><strong>${t.ism}</strong></td>
          <td><span class="badge badge-blue">${t.guruh}</span></td>
          <td><strong style="color:var(--red)">${t.davomat_foiz}%</strong></td>
          <td><span class="badge ${color}">⚠ Diqqat</span></td>
        </tr>`;
    });
  } catch (err) {
    console.error('Davomat tahlil xatosi:', err);
  }
}

// ===================== REYTING =====================
async function loadReyting() {
  try {
    const res = await fetch(`${API}/api/reytinglar`);
    const d = await res.json();

    const top10Div = document.getElementById('top10-list');
    top10Div.innerHTML = '';
    d.top10.forEach((t, i) => {
      top10Div.innerHTML += `
        <div class="reyting-item">
          <div class="reyting-orin">${t["o'rin"] || i + 1}</div>
          <div class="reyting-info">
            <div class="reyting-ism">${t.ism}</div>
            <div class="reyting-guruh">${t.guruh} · Baho: ${t.ortacha_baho} · Davomat: ${t.davomat_foiz}%</div>
          </div>
          <div class="reyting-ball">${t.umumiy_ball}</div>
        </div>`;
    });

    const bot10Div = document.getElementById('bottom10-list');
    bot10Div.innerHTML = '';
    d.bottom10.forEach(t => {
      bot10Div.innerHTML += `
        <div class="reyting-item">
          <div class="reyting-orin" style="color:var(--red)">${t["o'rin"]}</div>
          <div class="reyting-info">
            <div class="reyting-ism">${t.ism}</div>
            <div class="reyting-guruh">${t.guruh} · Baho: ${t.ortacha_baho} · Davomat: ${t.davomat_foiz}%</div>
          </div>
          <div class="reyting-ball" style="color:var(--red)">${t.umumiy_ball}</div>
        </div>`;
    });
  } catch (err) {
    console.error('Reyting xatosi:', err);
  }
}

// ===================== INIT =====================
loadDashboard();
