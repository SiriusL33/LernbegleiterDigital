/*
 * WBT Explorer - Detail Page Logic (FINAL POLISH: PDF SYMBOL FIX)
 */

let qrTimer = null; 
let currentWBT = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const wbtId = params.get('id');
    
    if (!wbtId) { window.location.href = '../index.html'; return; }

    if (typeof WBTApp === 'undefined') {
        console.error("Data Loader fehlt! Bitte data-loader.js prüfen.");
        return;
    }

    try {
        await WBTApp.loadData();
        currentWBT = WBTApp.getById(wbtId);

        if (!currentWBT) {
            document.getElementById('loading').innerText = "Modul nicht gefunden.";
            return;
        }

        renderDetailView(currentWBT);
    } catch (e) {
        console.error("Fehler beim Initialisieren:", e);
        document.getElementById('loading').innerText = "Fehler beim Laden.";
    }
});

function renderDetailView(wbt) {
    document.title = `${wbt.title} | WBT Companion`;
    
    setText('wbt-title', wbt.title);
    setText('wbt-subtitle', wbt.subtitle);
    setText('wbt-desc', wbt.description);
    setText('wbt-format', wbt.format);
    setText('wbt-xp-display', "0"); 
    
    const themeColor = wbt.themeColor || '#3b82f6';
    document.documentElement.style.setProperty('--theme-color', themeColor);
    document.documentElement.style.setProperty('--theme-light', themeColor + '80');

    const durationEl = document.getElementById('wbt-duration');
    if(durationEl) durationEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${wbt.duration}`;

    const btnStart = document.getElementById('btn-start');
    if(btnStart) btnStart.href = wbt.link;

    const imgEl = document.getElementById('wbt-image');
    if(imgEl) imgEl.src = wbt.thumbnail ? `../${wbt.thumbnail}` : 'https://placehold.co/1200x600';

    const tagContainer = document.getElementById('wbt-tags');
    if(tagContainer) {
        tagContainer.innerHTML = wbt.tags.map(tag => 
            `<span class="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-sm font-medium border border-slate-200">${tag}</span>`
        ).join('');
    }

    setupQR(wbt);

    const examCard = document.getElementById('exam-card');
    if(examCard) {
        examCard.classList.remove('hidden');
        examCard.classList.add('flex'); 
        examCard.onmouseenter = () => { if(!examCard.classList.contains('completed')) examCard.style.borderColor = themeColor; };
        examCard.onmouseleave = () => { if(!examCard.classList.contains('completed')) examCard.style.borderColor = ''; };
    }

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
}

/* --- PRÜFUNGS SIMULATION --- */
function runExamSimulation() {
    const card = document.getElementById('exam-card');
    const progress = document.getElementById('exam-progress');
    const text = document.getElementById('exam-text');
    const icon = document.getElementById('exam-icon');
    const arrow = document.getElementById('exam-arrow');
    const xpBar = document.getElementById('xp-bar');
    const xpDisplay = document.getElementById('wbt-xp-display');

    if(card.classList.contains('running') || card.classList.contains('completed')) return;

    card.classList.add('running');
    text.innerText = "Wissensüberprüfung läuft...";
    progress.style.width = "100%"; 

    setTimeout(() => {
        card.classList.add('completed');
        card.classList.remove('bg-white', 'hover:border-blue-500');
        card.classList.add('bg-green-50', 'border-green-300'); 
        card.style.borderColor = '#86efac'; 
        
        progress.style.opacity = "0"; 
        icon.innerText = "✓";
        icon.className = "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-green-200 text-green-700 shadow-sm";
        
        text.innerHTML = "<span class='text-green-700 font-bold'>Bestanden! XP gutgeschrieben.</span>";
        arrow.style.display = "none";

        if(xpBar) xpBar.style.width = "100%";
        if(xpDisplay && currentWBT) {
            xpDisplay.innerText = currentWBT.xp;
            xpDisplay.classList.add('text-green-500', 'transition-colors');
        }
        
        if(typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: [currentWBT.themeColor, '#22c55e'] });
        }

    }, 2000); 
}

/* --- HELPER --- */
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}

function setupQR(wbt) {
    const qrContainer = document.getElementById('qr-placeholder');
    if(qrContainer) {
        qrContainer.innerHTML = `<img src="../assets/img/qr/${wbt.id}.svg" class="w-full h-full object-contain p-2">`;
    }
}

const loadAndConvertImage = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 500; 
        canvas.height = img.height || 500;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try { resolve(canvas.toDataURL('image/png')); } catch (e) { resolve(null); }
    };
    
    img.onerror = () => { resolve(null); };
    img.src = url;
});

/* --- TOOLBAR ACTIONS --- */
function toggleQR() {
    const panel = document.getElementById('qr-panel');
    const btn = document.getElementById('btn-qr');
    const timerBar = document.querySelector('#qr-timer div');

    if(!panel || !btn) return;
    if(qrTimer) clearTimeout(qrTimer);

    if(panel.classList.contains('scale-0')) {
        panel.classList.remove('scale-0', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
        btn.classList.add('text-slate-800', 'bg-slate-100');
        btn.classList.remove('text-slate-400', 'bg-white/90');
        if(timerBar) {
            timerBar.style.transition = 'none';
            timerBar.style.transform = 'scaleX(1)'; 
            setTimeout(() => {
                timerBar.style.transition = 'transform 5000ms linear';
                timerBar.style.transform = 'scaleX(0)'; 
            }, 50);
        }
        qrTimer = setTimeout(() => { toggleQR(); }, 5000);
    } else {
        panel.classList.add('scale-0', 'opacity-0');
        panel.classList.remove('scale-100', 'opacity-100');
        btn.classList.remove('text-slate-800', 'bg-slate-100');
        btn.classList.add('text-slate-400', 'bg-white/90');
    }
}

function toggleLike(btn) {
    if (btn.classList.contains('text-pink-500')) {
        btn.classList.remove('text-pink-500', 'bg-pink-50');
        btn.classList.add('text-slate-400');
    } else {
        btn.classList.add('text-pink-500', 'bg-pink-50');
        btn.classList.remove('text-slate-400');
        btn.style.transform = "scale(1.2)";
        setTimeout(() => btn.style.transform = "scale(1)", 200);
    }
}

function shareWBT() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => alert("Link kopiert!"))
        .catch(() => alert("Konnte Link nicht kopieren."));
}

/* --- HIGH-END PDF GENERATOR (FINAL) --- */
async function generatePDF() {
    const btn = document.querySelector('button[title="Offline PDF"]');
    const oldContent = btn ? btn.innerHTML : '';
    
    if(btn) btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

    if(!window.jspdf || !currentWBT) {
        alert("System noch nicht bereit.");
        if(btn) btn.innerHTML = oldContent;
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        
        const thumbPath = currentWBT.thumbnail ? `../${currentWBT.thumbnail}` : null;
        const qrPath = `../assets/img/qr/${currentWBT.id}.svg`;
        
        const [thumbImgData, qrImgData] = await Promise.all([
            thumbPath ? loadAndConvertImage(thumbPath) : Promise.resolve(null),
            loadAndConvertImage(qrPath) 
        ]);

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();
        const themeColor = currentWBT.themeColor || '#3b82f6';

        // Background & Header
        doc.setFillColor(248, 250, 252); doc.rect(0, 0, width, height, 'F');
        doc.setFillColor(themeColor); doc.rect(0, 0, width, 15, 'F');
        
        // Card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(10, 25, width - 20, height - 35, 3, 3, 'FD');

        // Titles
        doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(30, 41, 59);
        doc.text(currentWBT.title, 20, 45);

        doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor(100, 116, 139);
        doc.text(currentWBT.subtitle, 20, 53);

        doc.setDrawColor(themeColor); doc.setLineWidth(0.5); doc.line(20, 58, width - 20, 58);

        // Bild
        if (thumbImgData) {
            const imgW = 120; const imgH = 67.5; 
            doc.setDrawColor(200, 200, 200); doc.rect(20, 70, imgW, imgH, 'S'); 
            doc.addImage(thumbImgData, 'PNG', 20, 70, imgW, imgH);
            
            const targetLink = currentWBT.link && currentWBT.link.startsWith('http') ? currentWBT.link : window.location.href;
            doc.link(20, 70, imgW, imgH, { url: targetLink });
            
            doc.setFontSize(9); doc.setTextColor(themeColor);
            // FIX: Hier ist der Zeichensatz-Fehler behoben (statt ▲ nehmen wir >>)
            doc.text("Klicken Sie auf das Foto zum Starten", 20, 70 + imgH + 5);
        }

        // Infos & Text
        const rightColX = 150;
        doc.setFillColor(241, 245, 249); doc.roundedRect(rightColX, 70, 110, 30, 2, 2, 'F');
        doc.setFontSize(10); doc.setTextColor(71, 85, 105);
        doc.text(`Dauer: ${currentWBT.duration}`, rightColX + 5, 80);
        doc.text(`Format: ${currentWBT.format}`, rightColX + 5, 87);
        doc.text(`XP: ${currentWBT.xp} Punkte`, rightColX + 5, 94);

        doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text("Inhalt:", rightColX, 115);
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
        const descSplit = doc.splitTextToSize(currentWBT.description, 110);
        doc.text(descSplit, rightColX, 122);

        // QR
        if(qrImgData) {
            doc.addImage(qrImgData, 'PNG', width - 50, height - 50, 30, 30);
            doc.setFontSize(8); doc.text("Auf Mobilgerät öffnen", width - 48, height - 18);
        } else {
            doc.setDrawColor(200); doc.rect(width - 50, height - 50, 30, 30);
            doc.text("QR-Code<br>Nicht Verfügbar", width - 45, height - 35);
        }

        doc.save(`Klartext-Medizin_Offlineansicht_${currentWBT.id}.pdf`);
    } catch (err) {
        console.error("PDF Fehler:", err);
        alert("Fehler beim PDF Erstellen.");
    } finally {
        if(btn) setTimeout(() => { btn.innerHTML = oldContent; }, 500);
    }
}