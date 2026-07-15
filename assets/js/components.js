/*
 * Lernbegleiter Digital - UI Components (minimal, rebranded)
 *
 * Aufgaben:
 * - Nur Startseite erreichbar: redirect aller Unterseiten auf '/'
 * - Dark Mode & Toggle entfernt
 * - Login/Registrierung im Header entfernt/ausgeblendet
 */

document.addEventListener('DOMContentLoaded', () => {
    // harte Umleitung: wenn wir nicht auf der Startseite sind => root
    const path = window.location.pathname;
    const isIndex = path === '/' || path.endsWith('/index.html') || path === '';
    if (!isIndex) {
        // harte Weiterleitung auf Root
        window.location.replace('/');
        return;
    }

    injectHeader();
    injectFooter();
    setupMobileMenu();
    initUserSystem(); // bleibt minimal und ohne Anmelde-Links
});

function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : '';
}

/* --- HEADER & FOOTER --- */
function injectHeader() {
    const basePath = getBasePath();

    const headerHTML = `
    <nav class="fixed w-full z-50 top-0 left-0 bg-[rgba(255,255,255,0.9)] backdrop-blur-md border-b border-slate-100">
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="${basePath}index.html" class="flex items-center gap-3">
                <div class="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-lb-emerald to-lb-sage rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                    L
                </div>
                <div class="flex flex-col leading-none">
                    <span class="text-lg md:text-xl font-bold text-slate-800">Lernbegleiter <span class="text-sm text-slate-500">Digital</span></span>
                    <span class="text-[10px] text-slate-400 uppercase tracking-widest">Einfach. Warm. Professionell.</span>
                </div>
            </a>

            <div id="navbar-default" class="hidden md:flex md:items-center md:space-x-8">
                <a href="#featured" class="text-slate-700 font-medium">Startseite</a>
                <span class="text-slate-400">|</span>
                <a href="#featured" class="text-slate-500 hover:text-slate-700">Im Fokus</a>
            </div>

            <div id="auth-menu-container" class="hidden md:flex items-center"></div>
        </div>
    </nav>`;

    const headerContainer = document.getElementById('app-header');
    if(headerContainer) headerContainer.innerHTML = headerHTML;
}

function injectFooter() {
    const html = `
    <footer class="py-12 border-t border-slate-100 bg-[var(--lb-base)] mt-auto">
        <div class="container mx-auto px-4 text-center">
            <div class="mb-4 opacity-80">
                <div class="inline-flex items-center gap-2">
                    <div class="w-6 h-6 bg-gradient-to-br from-lb-emerald to-lb-sage rounded-md flex items-center justify-center text-white text-xs font-bold">L</div>
                    <span class="font-bold text-slate-700">Lernbegleiter Digital</span>
                </div>
            </div>
            <p class="text-slate-500 text-sm mb-6 max-w-md mx-auto">Ein reduziertes Landingpage-Design — alle interne Bereiche sind deaktiviert.</p>
            <div class="mt-8 pt-8 border-t border-slate-100/60 opacity-40"><span class="text-xs font-mono">&copy; 2026 Lernbegleiter Digital</span></div>
        </div>
    </footer>`;
    const footerContainer = document.getElementById('app-footer');
    if(footerContainer) footerContainer.innerHTML = html;
}

function setupMobileMenu() {
    setTimeout(() => {
        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('navbar-default');
        if(btn && menu) btn.onclick = () => { menu.classList.toggle('hidden'); };
    }, 100);
}

/* --- USER / AUTH (minimal) --- */
async function initUserSystem() {
    // bewusst minimal: Benutzer-HUD ausgeblendet, kein Login-Link
    const authContainer = document.getElementById('auth-menu-container');
    if (authContainer) {
        authContainer.innerHTML = ''; // nichts anzeigen
    }
}