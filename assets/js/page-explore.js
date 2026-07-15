/*
 * WBT Explorer - Explore Page Logic (FINAL POLISH - HIGHLIGHT FIX)
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof WBTApp === 'undefined') {
        console.error("CRITICAL: WBTApp nicht gefunden! Check data-loader.js");
        const container = document.getElementById('hero-grid');
        if(container) container.innerHTML = '<div class="text-red-500 p-10">Fehler: Data Loader fehlt.</div>';
        return;
    }

    await WBTApp.loadData();
    const wbts = WBTApp.getAll();
    const heroContainer = document.getElementById('hero-grid');

    if (!wbts || wbts.length === 0) {
        if(heroContainer) heroContainer.innerHTML = '<div class="col-span-3 text-center text-slate-400 p-10 font-bold border-2 border-dashed border-slate-200 rounded-3xl">Keine Module gefunden.</div>';
        return;
    }

    renderHeroSection(wbts);
    renderGrid(wbts);
});

// --- BENTO GRID (Highlights) ---
function renderHeroSection(items) {
    const container = document.getElementById('hero-grid');
    if(!container) return;

    let featured = items.filter(i => i.featured);
    if (featured.length < 3) {
        const others = items.filter(i => !i.featured);
        featured = [...featured, ...others].slice(0, 3);
    } else {
        featured = featured.slice(0, 3);
    }

    const [main, sub1, sub2] = featured;

    // Helper: Bento-Kachel Design
    const posterStyle = (wbt, isBig) => {
        if(!wbt) return ''; 
        const color = wbt.themeColor || '#3b82f6';
        
        const titleSize = isBig ? 'text-3xl md:text-5xl' : 'text-xl'; 
        const imgContainerClass = isBig ? 'h-64 md:h-80' : 'h-32';
        
        // FIX: Hintergrund Clean White (kein Champagner/Tint mehr), dafür Border Color stärker
        // Glow Effect: Box Shadow nutzt jetzt die Theme Color
        const cardStyle = `background: #ffffff; border: 1px solid ${color}30; --hover-shadow: 0 20px 40px -5px ${color}40;`;
        
        return `
        <div class="relative group rounded-3xl overflow-hidden shadow-sm transition-all duration-500 cursor-pointer p-6 flex flex-col justify-between h-full bg-white hover:shadow-[var(--hover-shadow)] hover:-translate-y-1 dark:bg-[#1e1e2e] dark:border-slate-700"
                style="${cardStyle}"
                onclick="window.location.href='detail.html?id=${wbt.id}'">
            
            <div class="flex justify-between items-center z-10 mb-4">
                <span class="bg-white/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-slate-800 border border-slate-100">
                    ${isBig ? 'Diesen Monat im Fokus' : 'Neu'}
                </span>
                <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform" style="color: ${color}">
                    ➜
                </div>
            </div>

            <div class="relative w-full ${imgContainerClass} rounded-2xl overflow-hidden bg-slate-50 shadow-inner mb-4">
                <img src="../${wbt.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm border border-white/50">
                    ${wbt.format}
                </div>
            </div>

            <div class="z-10 mt-auto">
                <style>
                    .group:hover .hover-color-${wbt.id} { color: ${color} !important; }
                </style>
                <h3 class="${titleSize} font-bold text-slate-800 leading-snug mb-2 pb-1 line-clamp-2 transition-colors hover-color-${wbt.id} dark:text-slate-100">
                    ${wbt.title}
                </h3>
                
                ${isBig ? `<p class="text-slate-500 line-clamp-2 text-lg mb-3 font-medium leading-relaxed pb-2 dark:text-slate-400">${wbt.description}</p>` : ''}
                
                <div class="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span class="bg-white/50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1 dark:border-slate-700 dark:bg-slate-800">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${wbt.duration}
                    </span>
                </div>
            </div>
            
            <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-[${color}] opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500 pointer-events-none"></div>
        </div>`;
    };

    container.innerHTML = `
        <div class="lg:col-span-2 h-full">
            ${posterStyle(main, true)}
        </div>
        <div class="flex flex-col gap-6 h-full">
            <div class="flex-1">${posterStyle(sub1, false)}</div>
            <div class="flex-1">${posterStyle(sub2, false)}</div>
        </div>
    `;
}

function renderGrid(items) {
    const grid = document.getElementById('wbt-grid');
    if(!grid) return;
    if(items.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center">Keine Module.</div>';
        return;
    }
    grid.innerHTML = items.map(wbt => WBTApp.renderCard(wbt)).join('');
}