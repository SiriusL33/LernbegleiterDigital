/*
 * Lernbegleiter App - Central Data Loader
 * - Core: Backend-Aufruf /api/wbts bleibt erhalten
 * - UI: Details / Navigation zu Unterseiten deaktiviert (nur Landing-UI)
 */

const LBApp = {
    data: [],

    async loadData() {
        if (this.data.length > 0) return;

        try {
            const response = await fetch('/api/wbts');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.data = await response.json();
        } catch (error) {
            console.error("Fehler beim Laden:", error);
            this.data = [];
        }
    },

    getAll() { return this.data; },
    getById(id) { return this.data.find(item => item.id === id); },
    getFeatured() { return this.data.filter(item => item.featured); },

    // Karten-Renderer: Navigation zu Detailseiten deaktiviert (Startseiten-only)
    renderCard(item) {
        const imagePath = item.thumbnail ? item.thumbnail : 'https://placehold.co/600x400';
        const color = item.themeColor || '#2f9d82';

        return `
            <div class="group relative bg-white rounded-2xl overflow-hidden shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
                <div class="relative h-44 overflow-hidden bg-slate-50 m-2 rounded-2xl">
                    <img src="${imagePath}" class="w-full h-full object-cover transition-transform duration-700" alt="${item.title}">
                    <div class="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm border border-white/50">
                        ${item.format || ''}
                    </div>
                </div>

                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="text-lg md:text-xl font-bold text-slate-800 mb-2 leading-tight">${item.title}</h3>
                    <p class="text-slate-500 text-sm line-clamp-2 mb-4 flex-grow">${item.subtitle || ''}</p>

                    <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <span class="text-xs font-medium text-slate-400">${item.duration || ''}</span>
                        <div class="text-sm font-bold text-slate-400 select-none opacity-60">Starten ➜</div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.LBApp = LBApp;