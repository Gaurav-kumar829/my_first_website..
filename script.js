/**
 * OfferShield - Frontend Controller
 * Connects UI interactions to OfferShield Node.js Backend APIs
 */

const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000'))
    ? 'http://localhost:3000'
    : '';

const $ = id => document.getElementById(id);
const esc = s => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Universal Fetch Wrapper
async function fetchAPI(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Server responded with status ${res.status}`);
        }
        return await res.json();
    } catch (e) {
        throw new Error(e.message || 'Network connection failed. Ensure backend server is running on port 3000.');
    }
}

// Check Backend Connection Status
async function checkBackendHealth() {
    const statusEl = $('backend-status');
    try {
        const data = await fetchAPI('/api/health');
        if (data.status === 'ok') {
            statusEl.innerHTML = '● Backend Connected (Port 3000)';
            statusEl.style.color = '#4de5cf';
        }
    } catch (e) {
        statusEl.innerHTML = '● Backend Offline (Run Start OfferShield.command)';
        statusEl.style.color = '#fb7185';
    }
}

// Tab Switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        
        const targetContent = $(`tab-${target}`);
        if (targetContent) targetContent.classList.remove('hidden');

        if (target === 'simulation' && !SIM.loaded) loadSimulation();
        if (target === 'deepfake' && !$('cues-list').children.length) loadInterviewCues();
        if (target === 'history') loadScanHistory();
    };
});

// ---------------- 1. Job Offer Analysis ----------------
const SAMPLE_OFFERS = [
    { title: "Registration Fee Scam", text: "Congratulations! You are shortlisted for our Work-from-Home Data Entry Internship. Salary ₹45,000/week. No interview required. Pay ₹1,200 refundable registration fee via UPI to confirm your joining kit.", email: "hr.recruit@gmail.com", web: "infosys-careers.xyz" },
    { title: "Hinglish Urgent Scam", text: "Ghar baithe kamao ₹5000 daily. Pehle ₹999 registration fees dena hoga laptop kit ke liye. Only 3 seats left, confirm within 2 hours.", email: "", web: "" },
    { title: "Genuine Offer", text: "Acme Analytics Pvt. Ltd. is hiring a Data Analyst Intern in Bengaluru. Stipend: ₹20,000 per month. Selection process includes resume shortlist, technical assessment and two interviews. Apply via careers.acmeanalytics.com. There is no fee at any stage.", email: "careers@acmeanalytics.com", web: "acmeanalytics.com" }
];

const sampleContainer = $('sample-chips');
if (sampleContainer) {
    sampleContainer.innerHTML = SAMPLE_OFFERS.map((s, idx) => `<button type="button" data-idx="${idx}">${esc(s.title)}</button>`).join('');
    sampleContainer.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
            const sample = SAMPLE_OFFERS[btn.dataset.idx];
            $('offer-text').value = sample.text;
            $('sender-email').value = sample.email;
            $('company-website').value = sample.web;
            runOfferScan();
        };
    });
}

$('scan-offer-btn').onclick = runOfferScan;

async function runOfferScan() {
    const text = $('offer-text').value.trim();
    const email = $('sender-email').value.trim();
    const website = $('company-website').value.trim();
    const resultBox = $('result-box');

    if (!text && !email && !website) {
        alert('Please paste the job offer text, sender email, or company website.');
        return;
    }

    resultBox.classList.remove('hidden');
    $('verdict-title').textContent = 'Analyzing...';
    $('description').textContent = 'Contacting OfferShield AI & Rule Engine on backend...';
    $('signals-container').innerHTML = '';
    $('advice-box').classList.add('hidden');

    try {
        const res = await fetchAPI('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, email, website })
        });

        // Update score
        $('score-val').textContent = res.score;
        const circle = document.querySelector('.score-circle');
        circle.style.borderColor = res.level === 'High' ? '#fb7185' : res.level === 'Medium' ? '#fbbf24' : '#4de5cf';

        // Verdict title & message
        $('verdict-title').textContent = res.level === 'High' ? '🚨 High Risk – Likely Scam' : res.level === 'Medium' ? '⚠️ Caution – Suspicious Signs' : '✅ Low Risk – Safe Signs';
        $('verdict-title').style.color = circle.style.borderColor;
        
        $('description').textContent = res.level === 'High'
            ? 'Do not transfer money or share identity documents. This offer triggered major scam indicators.'
            : res.level === 'Medium'
                ? 'Multiple unusual indicators were detected. Verify the employer directly on official channels.'
                : 'No red flags matched our scam database. Standard hiring precautions still apply.';

        // Signals list
        let signalsHtml = '';
        if (res.good && res.good.length) {
            signalsHtml += `<div class="signal low"><b>Good Signs Detected:</b><ul style="margin:4px 0 0 16px">${res.good.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>`;
        }

        if (res.flags && res.flags.length) {
            signalsHtml += res.flags.map(f => `
                <div class="signal ${f.s ? 'high' : 'medium'}">
                    <div style="display:flex;justify-content:space-between">
                        <b>${esc(f.t)}</b>
                        <span style="font-weight:bold;color:${f.s ? '#fb7185' : '#fbbf24'}">+${f.w} pts</span>
                    </div>
                    <p style="margin:4px 0 0;color:#c1ccda">${esc(f.why)}</p>
                    ${f.q && f.q.length ? `<p style="margin:4px 0 0;font-size:12px;color:#4de5cf">Matched: ${f.q.map(x => `"${esc(x)}"`).join(', ')}</p>` : ''}
                </div>
            `).join('');
        } else if (!res.good || !res.good.length) {
            signalsHtml += '<p style="color:#a9b7c9;font-size:14px">No warnings or severe flags were identified.</p>';
        }
        $('signals-container').innerHTML = signalsHtml;

        // Recommendations
        if (res.recommendations && res.recommendations.length) {
            $('advice-box').classList.remove('hidden');
            $('advice-text').innerHTML = res.recommendations.map(r => `• ${esc(r)}`).join('<br>');
        }
    } catch (err) {
        $('verdict-title').textContent = 'Error';
        $('description').textContent = err.message;
    }
}

// ---------------- 2. Phishing Simulation ----------------
const SIM = { loaded: 0, scenarios: [], idx: 0, score: 0, selectedLines: new Set(), answered: 0 };

async function loadSimulation() {
    $('sim-card').innerHTML = '<p style="color:#a9b7c9">Loading scenarios from server...</p>';
    try {
        SIM.scenarios = await fetchAPI('/api/simulations');
        SIM.loaded = 1;
        SIM.idx = 0;
        SIM.score = 0;
        renderSimQuestion();
    } catch (e) {
        $('sim-card').innerHTML = `<p style="color:#fb7185">Could not load simulations: ${esc(e.message)}</p>`;
    }
}

function renderSimQuestion() {
    if (SIM.idx >= SIM.scenarios.length) {
        $('sim-progress').textContent = '';
        $('sim-card').innerHTML = `
            <div style="text-align:center;padding:20px;background:#091322;border-radius:12px">
                <h3 style="color:#4de5cf">Simulation Completed!</h3>
                <p style="font-size:28px;font-weight:bold;margin:15px 0">${SIM.score} / ${SIM.scenarios.length}</p>
                <p style="color:#a9b7c9">${SIM.score >= 5 ? 'Excellent work! You quickly spot upfront fees, look-alike links, and OTP tricks.' : 'Review the explanations and try again to improve your scam recognition skills.'}</p>
                <button class="scan-btn" style="width:auto;margin-top:15px;padding:10px 24px" onclick="loadSimulation()">Play Again</button>
            </div>
        `;
        return;
    }

    const q = SIM.scenarios[SIM.idx];
    SIM.selectedLines = new Set();
    SIM.answered = 0;

    $('sim-progress').textContent = `Scenario ${SIM.idx + 1} of ${SIM.scenarios.length} · Current Score: ${SIM.score}`;
    $('sim-card').innerHTML = `
        <div style="background:#091322;border:1px solid #293c54;border-radius:12px;padding:16px;margin-bottom:14px">
            <div style="font-size:13px;color:#4de5cf;margin-bottom:8px">${esc(q.channel)} · From: <b>${esc(q.from)}</b> ${q.subject ? `· Subject: ${esc(q.subject)}` : ''}</div>
            <div id="sim-lines">
                ${q.lines.map((l, i) => `
                    <div class="sim-line" data-i="${i}" style="padding:8px 12px;border:1px solid transparent;border-radius:6px;cursor:pointer;margin:4px 0;transition:0.2s">
                        ${esc(l)}
                    </div>
                `).join('')}
            </div>
        </div>
        <p style="font-size:13px;color:#a9b7c9;margin-bottom:12px">Tap any line that looks like a red flag, then pick your verdict below:</p>
        <div style="display:flex;gap:12px">
            <button class="scan-btn" style="background:#fb7185;color:white" id="btn-verdict-scam">🚨 This is a Scam</button>
            <button class="scan-btn" style="background:#23344b;color:#4de5cf;border:1px solid #4de5cf" id="btn-verdict-real">✅ This Looks Genuine</button>
        </div>
        <div id="sim-feedback" style="margin-top:14px"></div>
    `;

    document.querySelectorAll('.sim-line').forEach(el => {
        el.onclick = () => {
            if (SIM.answered) return;
            const i = +el.dataset.i;
            if (SIM.selectedLines.has(i)) {
                SIM.selectedLines.delete(i);
                el.style.borderColor = 'transparent';
                el.style.background = 'transparent';
            } else {
                SIM.selectedLines.add(i);
                el.style.borderColor = '#4de5cf';
                el.style.background = 'rgba(77,229,207,0.1)';
            }
        };
    });

    $('btn-verdict-scam').onclick = () => submitSimVerdict('scam');
    $('btn-verdict-real').onclick = () => submitSimVerdict('real');
}

async function submitSimVerdict(v) {
    if (SIM.answered) return;
    SIM.answered = 1;
    const q = SIM.scenarios[SIM.idx];

    try {
        const r = await fetchAPI('/api/simulations/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: q.id, verdict: v, picked: [...SIM.selectedLines] })
        });

        if (r.correct) SIM.score++;

        // Highlight true red lines
        document.querySelectorAll('.sim-line').forEach(el => {
            const i = +el.dataset.i;
            if (r.red.includes(i)) {
                el.style.borderColor = '#fb7185';
                el.style.background = 'rgba(251,113,133,0.15)';
            }
        });

        $('sim-feedback').innerHTML = `
            <div style="padding:14px;background:#091322;border:1px solid ${r.correct ? '#4de5cf' : '#fb7185'};border-radius:8px">
                <h4 style="color:${r.correct ? '#4de5cf' : '#fb7185'};margin-bottom:6px">${r.correct ? '✅ Correct!' : '❌ Not Quite'}: This message was ${r.scam ? 'a SCAM' : 'GENUINE'}.</h4>
                <p style="color:#c1ccda;font-size:14px">${esc(r.why)}</p>
                ${r.total ? `<p style="color:#4de5cf;font-size:13px;margin-top:6px">You caught ${r.hit} of ${r.total} red flag lines.</p>` : ''}
                <button class="scan-btn" style="width:auto;margin-top:10px;padding:8px 20px" id="btn-next-sim">Next Message &rarr;</button>
            </div>
        `;
        $('btn-next-sim').onclick = () => { SIM.idx++; renderSimQuestion(); };
    } catch (e) {
        SIM.answered = 0;
        alert(e.message);
    }
}

// ---------------- 3. Deepfake & Fake Interview ----------------
async function loadInterviewCues() {
    try {
        const cues = await fetchAPI('/api/deepfake/cues');
        $('cues-list').innerHTML = cues.map(c => `
            <label style="display:flex;align-items:flex-start;gap:10px;color:#c1ccda;padding:8px 0;border-bottom:1px solid #1c2b3f;cursor:pointer">
                <input type="checkbox" value="${esc(c.id)}" style="margin-top:4px">
                <span>${esc(c.text)}</span>
            </label>
        `).join('');
    } catch (e) {
        $('cues-list').innerHTML = `<p style="color:#fb7185">Could not load cues: ${esc(e.message)}</p>`;
    }
}

$('assess-interview-btn').onclick = async () => {
    const selected = [...document.querySelectorAll('#cues-list input:checked')].map(x => x.value);
    if (!selected.length) {
        alert('Please check at least one sign you observed during the interview call.');
        return;
    }
    $('interview-report').innerHTML = '<p style="color:#a9b7c9">Evaluating interview signs...</p>';
    try {
        const res = await fetchAPI('/api/deepfake/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selected })
        });

        $('interview-report').innerHTML = `
            <div class="result" style="margin-top:10px">
                <div class="score-circle" style="border-color:${res.level === 'High' ? '#fb7185' : res.level === 'Medium' ? '#fbbf24' : '#4de5cf'}">
                    <span>${res.score}</span><small>/${res.max}</small>
                </div>
                <h3 style="color:${res.level === 'High' ? '#fb7185' : res.level === 'Medium' ? '#fbbf24' : '#4de5cf'}">Risk Assessment: ${res.level} Risk</h3>
                <div style="margin:16px 0">
                    ${res.flags.map(f => `
                        <div class="signal ${f.w >= 4 ? 'high' : 'medium'}">
                            <b>${esc(f.text)}</b>
                            <p style="margin-top:4px;color:#c1ccda">${esc(f.why)}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="advice">
                    <h4 style="color:#4de5cf;margin-bottom:6px">Recommended Actions</h4>
                    ${res.advice.map(a => `<p style="margin:4px 0">• ${esc(a)}</p>`).join('')}
                </div>
                <p style="font-size:11px;color:#8899aa;margin-top:10px">${esc(res.disclaimer)}</p>
            </div>
        `;
    } catch (e) {
        $('interview-report').innerHTML = `<p style="color:#fb7185">${esc(e.message)}</p>`;
    }
};

$('image-input').onchange = () => {
    const f = $('image-input').files[0];
    $('image-preview').innerHTML = f ? `<img src="${URL.createObjectURL(f)}" style="max-width:200px;border-radius:8px;border:1px solid #354960">` : '';
};

$('scan-image-btn').onclick = async () => {
    const f = $('image-input').files[0];
    if (!f) {
        alert('Please choose an image file (JPEG, PNG or WebP) to inspect.');
        return;
    }
    $('image-report').innerHTML = '<p style="color:#a9b7c9">Inspecting hidden image metadata and AI signatures...</p>';
    try {
        const formData = new FormData();
        formData.append('file', f);

        const res = await fetch(`${API_BASE}/api/deepfake/image`, {
            method: 'POST',
            body: formData
        }).then(x => x.json());

        if (res.error) throw new Error(res.error);

        $('image-report').innerHTML = `
            <div class="result" style="margin-top:10px">
                <div class="score-circle" style="border-color:${res.level === 'High' ? '#fb7185' : res.level === 'Medium' ? '#fbbf24' : '#4de5cf'}">
                    <span>${res.score}</span><small>/100</small>
                </div>
                <h3 style="color:${res.level === 'High' ? '#fb7185' : res.level === 'Medium' ? '#fbbf24' : '#4de5cf'}">${res.level} AI Indicator Score</h3>
                <p style="font-size:13px;color:#a9b7c9;margin:6px 0">${esc(res.kind)} · ${res.width && res.height ? `${res.width}×${res.height} · ` : ''}${res.sizeKB} KB</p>
                ${res.good && res.good.length ? `<div class="signal low">${res.good.map(g => `<p>✅ ${esc(g)}</p>`).join('')}</div>` : ''}
                ${res.indicators.length ? res.indicators.map(i => `
                    <div class="signal ${i.strength === 'Strong' ? 'high' : 'medium'}">
                        <b>${esc(i.text)} (${esc(i.strength)})</b>
                        <p style="margin-top:4px;color:#c1ccda">Detail: ${esc(i.evidence)}</p>
                    </div>
                `).join('') : '<p style="color:#4de5cf;margin:10px 0">No AI-generation artifacts or editing traces were detected in file headers.</p>'}
                <p style="font-size:11px;color:#8899aa;margin-top:10px">${esc(res.disclaimer)}</p>
            </div>
        `;
    } catch (e) {
        $('image-report').innerHTML = `<p style="color:#fb7185">${esc(e.message)}</p>`;
    }
};

// ---------------- 4. Link & File Scanner ----------------
$('scan-url-btn').onclick = async () => {
    const url = $('url-input').value.trim();
    if (!url) {
        alert('Please enter a website link or domain.');
        return;
    }
    $('url-report').innerHTML = '<p style="color:#a9b7c9">Scanning link through 8 security engines...</p>';
    try {
        const res = await fetchAPI('/api/scan/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        renderEngineScan(res, $('url-report'));
    } catch (e) {
        $('url-report').innerHTML = `<p style="color:#fb7185">${esc(e.message)}</p>`;
    }
};

$('scan-file-btn').onclick = async () => {
    const f = $('doc-file-input').files[0];
    if (!f) {
        alert('Please select an offer document or attachment (up to 8MB).');
        return;
    }
    $('file-report').innerHTML = '<p style="color:#a9b7c9">Hashing and scanning file buffer in memory...</p>';
    try {
        const formData = new FormData();
        formData.append('file', f);

        const res = await fetch(`${API_BASE}/api/scan/file`, {
            method: 'POST',
            headers: { 'x-filename': encodeURIComponent(f.name) },
            body: f
        }).then(x => x.json());

        if (res.error) throw new Error(res.error);
        renderEngineScan(res, $('file-report'));
    } catch (e) {
        $('file-report').innerHTML = `<p style="color:#fb7185">${esc(e.message)}</p>`;
    }
};

function renderEngineScan(data, targetEl) {
    const isDan = data.verdict === 'Dangerous';
    const isSus = data.verdict === 'Suspicious';
    const col = isDan ? '#fb7185' : isSus ? '#fbbf24' : '#4de5cf';

    let html = `
        <div class="result" style="margin-top:10px">
            <h3 style="color:${col};margin-bottom:6px">${data.verdict === 'Dangerous' ? '🚨 Malicious Threat Detected' : data.verdict === 'Suspicious' ? '⚠️ Suspicious Indicators' : '✅ Clean – No Known Threats'}</h3>
            <p style="font-size:13px;color:#a9b7c9">${data.flagged} of ${data.total} engines flagged warning signs</p>
            ${data.meta ? `<p style="font-size:12px;color:#c1ccda;margin:4px 0">${esc(data.meta)}</p>` : ''}
            ${data.hashes ? `
                <div style="text-align:left;background:#091322;padding:10px;border-radius:6px;font-family:monospace;font-size:11px;color:#c1ccda;margin:10px 0;word-break:break-all">
                    SHA-256: ${data.hashes.sha256}<br>
                    SHA-1:   ${data.hashes.sha1}<br>
                    MD5:     ${data.hashes.md5}
                </div>
            ` : ''}
            <div style="margin-top:12px;text-align:left">
                ${data.engines.map(e => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #1c2b3f;font-size:13px">
                        <div>
                            <b>${esc(e.engine)}</b>
                            <div style="font-size:12px;color:#a9b7c9">${esc(e.detail)}</div>
                        </div>
                        <span style="font-weight:bold;color:${e.verdict === 'malicious' ? '#fb7185' : e.verdict === 'suspicious' ? '#fbbf24' : '#4de5cf'}">
                            ${e.verdict.toUpperCase()}
                        </span>
                    </div>
                `).join('')}
            </div>
            ${data.disclaimer ? `<p style="font-size:11px;color:#8899aa;margin-top:10px">${esc(data.disclaimer)}</p>` : ''}
        </div>
    `;
    targetEl.innerHTML = html;
}

// ---------------- 5. Scan History ----------------
async function loadScanHistory() {
    const box = $('history-container');
    box.innerHTML = '<p style="color:#a9b7c9">Loading scan history from backend...</p>';
    try {
        const data = await fetchAPI('/api/history');
        const list = data.scans || [];
        if (!list.length) {
            box.innerHTML = '<p style="color:#a9b7c9">No scans recorded yet. Perform a scan above to save results.</p>';
            return;
        }

        box.innerHTML = `
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
                    <tr style="border-bottom:1px solid #293c54;color:#4de5cf">
                        <th style="padding:10px">Date &amp; Time</th>
                        <th style="padding:10px">Type</th>
                        <th style="padding:10px">Target / Snippet</th>
                        <th style="padding:10px">Score</th>
                        <th style="padding:10px">Verdict</th>
                    </tr>
                    ${list.map(s => {
                        const col = s.riskLevel === 'High' ? '#fb7185' : s.riskLevel === 'Medium' ? '#fbbf24' : '#4de5cf';
                        return `
                            <tr style="border-bottom:1px solid #1c2b3f">
                                <td style="padding:10px;color:#a9b7c9">${s.date ? new Date(s.date).toLocaleString() : '–'}</td>
                                <td style="padding:10px;text-transform:uppercase;font-size:11px;font-weight:bold">${esc(s.type)}</td>
                                <td style="padding:10px;color:#c1ccda">${esc(s.snippet)}</td>
                                <td style="padding:10px;font-weight:bold;color:${col}">${s.riskScore}/100</td>
                                <td style="padding:10px;font-weight:bold;color:${col}">${esc(s.verdict)}</td>
                            </tr>
                        `;
                    }).join('')}
                </table>
            </div>
        `;
    } catch (e) {
        box.innerHTML = `<p style="color:#fb7185">${esc(e.message)}</p>`;
    }
}

$('clear-history-btn').onclick = async () => {
    if (!confirm('Clear all local scan history?')) return;
    try {
        await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
        loadScanHistory();
    } catch (e) {
        alert(e.message);
    }
};

// Initial health check on page load
checkBackendHealth();
