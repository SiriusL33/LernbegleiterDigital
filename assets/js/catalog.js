/*
 * WBT Companion - Premium Catalog Generator
 * Features: Cover, TOC, Rounded Images, Landscape Layout
 */

async function generateFullCatalog() {
    const btn = document.getElementById('btn-catalog');
    const originalContent = btn.innerHTML;
    
    // Lade-Animation im Button
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generiere Katalog...`;
    btn.classList.add('cursor-wait', 'opacity-80');

    // Check Dependencies
    if (!window.jspdf || typeof WBTApp === 'undefined') {
        alert("System initialisiert noch. Bitte kurz warten.");
        resetBtn(btn, originalContent);
        return;
    }

    try {
        await WBTApp.loadData();
        const wbts = WBTApp.getAll();
        
        if(wbts.length === 0) { alert("Keine Daten vorhanden."); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();

        // --- SEITE 1: DECKBLATT (PREMIUM DARK) ---
        // Hintergrund Dark Blue/Slate
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, width, height, 'F');
        
        // Akzent-Linie (Gold/Amber)
        doc.setDrawColor(217, 119, 6); // amber-600
        doc.setLineWidth(2);
        doc.line(20, 20, width - 20, 20);
        doc.line(20, height - 20, width - 20, height - 20);

        // Titel
        doc.setFont("helvetica", "bold");
        doc.setFontSize(60);
        doc.setTextColor(255, 255, 255);
        doc.text("KLARTEXT MEDIZIN", width / 2, 80, { align: 'center' });
        doc.setTextColor(217, 119, 6); // Amber
        doc.text("KATALOG", width / 2, 105, { align: 'center' });
        
        doc.setFontSize(20);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text("AUSGABE 2026", width / 2, 125, { align: 'center' });

        doc.setFontSize(12);
        doc.text("Digitaler Lernbegleiter", width / 2, height - 30, { align: 'center' });


        // --- SEITE 2: INHALTSVERZEICHNIS (TOC) ---
        doc.addPage();
        doc.setFillColor(248, 250, 252); // Slate-50 Background
        doc.rect(0, 0, width, height, 'F');

        doc.setFontSize(24);
        doc.setTextColor(15, 23, 42);
        doc.text("Inhaltsverzeichnis", 20, 30);
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 35, width - 20, 35);

        let yPos = 50;
        const pageMap = {}; // Speichert ID -> Seitennummer

        wbts.forEach((wbt, index) => {
            const pageNum = index + 3; // Cover + TOC + Index (1-based)
            pageMap[wbt.id] = pageNum;

            doc.setFontSize(14);
            doc.setTextColor(51, 65, 85);
            doc.text(`${String(index + 1).padStart(2, '0')}. ${wbt.title}`, 20, yPos);
            
            // Dotted Line
            doc.setTextColor(200);
            doc.text("...................................................................................................................", 120, yPos);
            
            doc.setTextColor(217, 119, 6); // Amber Page Num
            doc.text(`Seite ${pageNum}`, width - 30, yPos, { align: 'right' });

            // Interaktiver Link zur Seite
            doc.link(20, yPos - 5, width - 40, 8, { pageNumber: pageNum });

            yPos += 12;
        });

        // --- SEITEN 3+: WBT DETAILS ---
        for (const wbt of wbts) {
            doc.addPage();
            await renderWBTPage(doc, wbt, width, height);
        }

        doc.save('Klartext-Medizin_Katalog_2026.pdf');
        
    } catch (err) {
        console.error(err);
        alert("Fehler beim Generieren: " + err.message);
    } finally {
        resetBtn(btn, originalContent);
    }
}

async function renderWBTPage(doc, wbt, w, h) {
    const themeColor = wbt.themeColor || '#3b82f6';
    
    // 1. Hintergrund (Card Look)
    doc.setFillColor(248, 250, 252); // Page BG
    doc.rect(0, 0, w, h, 'F');
    
    // Header Balken (Theme Color)
    doc.setFillColor(themeColor);
    doc.rect(0, 0, 15, h, 'F'); // Linker Streifen

    // Titel Area
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42);
    doc.text(wbt.title, 30, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(wbt.subtitle, 30, 40);

    // 2. Bild (Mit Round Rect Hack via Canvas)
    const imgX = 30;
    const imgY = 55;
    const imgW = 120;
    const imgH = 68;

    // Lade Bild und mache es rund
    if(wbt.thumbnail) {
        const roundedImg = await loadAndRoundImage(wbt.thumbnail, 10); // 10px Radius
        if(roundedImg) {
            doc.addImage(roundedImg, 'PNG', imgX, imgY, imgW, imgH);
            // Rahmen drumherum für Sauberkeit
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.roundedRect(imgX, imgY, imgW, imgH, 3, 3, 'S');
        }
    }

    // 3. Info Block (Rechts)
    const infoX = 160;
    const infoY = 55;
    
    // Tags
    if(wbt.tags && wbt.tags.length) {
        let tagX = infoX;
        wbt.tags.forEach(tag => {
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(tagX, infoY, 35, 8, 2, 2, 'FD');
            
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text(tag, tagX + 17.5, infoY + 5.5, { align: 'center' });
            tagX += 38;
        });
    }

    // Beschreibung
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(wbt.description, 110);
    doc.text(descLines, infoX, infoY + 20);

    // Stats Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(themeColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(infoX, infoY + 60, 110, 25, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("DAUER", infoX + 10, infoY + 68);
    doc.text("MODULFORM", infoX + 50, infoY + 68);
    doc.text("FORTSCHRITT", infoX + 90, infoY + 68);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(wbt.duration, infoX + 10, infoY + 75);
    doc.text(wbt.format, infoX + 50, infoY + 75);
    doc.text(String(wbt.xp), infoX + 90, infoY + 75);

    // 4. QR Code & Footer
    const qrPath = `assets/img/qr/${wbt.id}.svg`;
    const qrImg = await loadAndRoundImage(qrPath, 0); // Kein Radius für QR
    if(qrImg) {
        doc.addImage(qrImg, 'PNG', w - 40, h - 40, 25, 25);
    }
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Auf einem mobilen Endgerät weitermachen:", w - 27.5, h - 12, { align: 'center' });
    
    // Link Overlay über das ganze Bild
    if(wbt.link) {
        doc.link(imgX, imgY, imgW, imgH, { url: wbt.link });
    }
}

// Helper: Bild laden und Ecken abrunden via Canvas
function loadAndRoundImage(url, radius = 0) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const w = img.width;
            const h = img.height;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            
            if(radius > 0) {
                // Round Rect Path
                ctx.beginPath();
                ctx.moveTo(radius, 0);
                ctx.lineTo(w - radius, 0);
                ctx.quadraticCurveTo(w, 0, w, radius);
                ctx.lineTo(w, h - radius);
                ctx.quadraticCurveTo(w, h, w - radius, h);
                ctx.lineTo(radius, h);
                ctx.quadraticCurveTo(0, h, 0, h - radius);
                ctx.lineTo(0, radius);
                ctx.quadraticCurveTo(0, 0, radius, 0);
                ctx.closePath();
                ctx.clip();
            }
            
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function resetBtn(btn, content) {
    btn.innerHTML = content;
    btn.classList.remove('cursor-wait', 'opacity-80');
}