/*
 * WBT App - Central Data Loader (PREMIUM DESIGN RESTORED)
 */

const WBTApp = {
    data: [],

   async loadData() {
        if (this.data.length > 0) return; 

        try {
            // NEU: Wir fragen jetzt einfach unsere eigene API! 
            // Egal wo wir sind (Startseite oder Unterseite), der Server antwortet immer unter /api/wbts
            const response = await fetch('/api/wbts');
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            this.data = await response.json();
        } catch (error) {
            console.error("Fehler beim Laden:", error);
            this.data = []; 
        }
    },

    getAll() { return this.data; },
    getById(id) { return this.data.find(wbt => wbt.id === id); },
    getFeatured() { return this.data.filter(wbt => wbt.featured); },

    // GLOBALER KARTEN-RENDERER (Für Liste & Startseite)
    renderCard(wbt) {
        const isPages = window.location.pathname.includes('/pages/');
        const imgPrefix = isPages ? '../' : '';
        const linkPrefix = isPages ? '' : 'pages/'; 

        const imagePath = wbt.thumbnail ? (imgPrefix + wbt.thumbnail) : 'https://placehold.co/600x400';
        const detailLink = `${linkPrefix}detail.html?id=${wbt.id}`;
        const color = wbt.themeColor || '#3b82f6';

        // PREMIUM DESIGN
        return `
            <div class="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col h-full cursor-pointer"
                 style="background: linear-gradient(135deg, var(--card-base, #ffffff) 60%, ${color}08 100%); border-bottom: 3px solid ${color}20;"
                 onclick="window.location.href='${detailLink}'">
                
                <div class="relative h-48 overflow-hidden bg-slate-50 m-2 rounded-2xl">
                    <img src="${imagePath}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="${wbt.title}">
                    
                    <div class="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm border border-white/50">
                        ${wbt.format}
                    </div>
                </div>
                
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="text-lg md:text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-[${color}] transition-colors">
                        ${wbt.title}
                    </h3>
                    <p class="text-slate-500 text-sm line-clamp-2 mb-4 flex-grow">
                        ${wbt.subtitle}
                    </p>
                    
                    <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <span class="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${wbt.duration}
                        </span>
                        
                        <div class="flex items-center gap-1 text-sm font-bold text-slate-300 group-hover:text-[${color}] transition-colors group-hover:translate-x-1 duration-300">
                            Starten ➜
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.WBTApp = WBTApp;
