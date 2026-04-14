// ============================================================
// مصحف ورش الرقمي - التطبيق الرئيسي
// Warsh Digital Mushaf - Main Application
// ============================================================

// ─── Global State ───────────────────────────────────────────
let currentPage = 1;
const totalPages = 604;
const STORAGE_KEY = 'warsh-mushaf-page';
const DARK_MODE_KEY = 'warsh-mushaf-dark';
const BOOKMARKS_KEY = 'warsh-mushaf-bookmarks';

// Audio state
import { VerseMapper } from './src/utils/verse-mapper.js';
const AUDIO_BASE = 'https://everyayah.com/data/warsh/warsh_ibrahim_aldosary_128kbps';
let audioElement = new Audio();
let isPlaying = false;
let isAutoPlay = false;
let repeatMode = 0; // 0 = off, 1 = repeat one
let currentAudioSurah = null;
let currentAudioAyah = null;
let audioQueue = [];

// Surah data (loaded from JSON)
let surahData = [];

// Selected verse
let selectedSurah = null;
let selectedAyah = null;

// Desktop two-page mode
let isTwoPageMode = false;
let verseTooltipTimer = null;
let headerHideTimer = null;
let lastScrollY = 0;

// Juz page mapping (start page of each juz in Warsh mushaf)
const JUZ_PAGES = [
    1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
    201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
    402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

// ─── DOM Elements ──────────────────────────────────────────
const pageContainer = document.getElementById('page-container');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const pageInput = document.getElementById('page-input');
const infoSurahName = document.getElementById('info-surah-name');
const infoJuzNumber = document.getElementById('info-juz-number');
const infoJuzHizb = document.getElementById('info-juz-hizb');
const selectedVerseBar = document.getElementById('selected-verse-bar');
const verseTooltip = document.getElementById('verse-tooltip');
const juzDropdown = document.getElementById('juz-dropdown');
const btnJuzNav = document.getElementById('btn-juz-nav');

// Bottom Sheet
const bottomSheetOverlay = document.getElementById('bottom-sheet-overlay');
const verseBottomSheet = document.getElementById('verse-bottom-sheet');
const sheetAyahNum = document.getElementById('sheet-ayah-num');
const sheetSurahName = document.getElementById('sheet-surah-name');
const sheetVerseDetail = document.getElementById('sheet-verse-detail');
const bookmarkActionText = document.getElementById('bookmark-action-text');

// Audio Player
const audioPlayerBar = document.getElementById('audio-player');
const audioPlayIcon = document.getElementById('audio-play-icon');
const audioProgressFill = document.getElementById('audio-progress-fill');
const audioProgressBar = document.getElementById('audio-progress-bar');
const audioAyahInfo = document.getElementById('audio-ayah-info');
const btnAudioPlay = document.getElementById('btn-audio-play');
const btnAudioPrev = document.getElementById('btn-audio-prev');
const btnAudioNext = document.getElementById('btn-audio-next');
const btnAudioClose = document.getElementById('btn-audio-close');
const btnRepeat = document.getElementById('btn-repeat');
const repeatBadge = document.getElementById('repeat-badge');

// Drawers
const drawerOverlay = document.getElementById('drawer-overlay');
const surahDrawer = document.getElementById('surah-drawer');
const bookmarksDrawer = document.getElementById('bookmarks-drawer');
const surahList = document.getElementById('surah-list');
const surahSearch = document.getElementById('surah-search');
const bookmarksList = document.getElementById('bookmarks-list');
const bookmarksEmpty = document.getElementById('bookmarks-empty');

// Toast
const toast = document.getElementById('toast');

// Store loader template
const loaderHTML = pageContainer.innerHTML;

// ─── Utility Functions ─────────────────────────────────────
function padNum(n, len = 3) {
    return String(n).padStart(len, '0');
}

function toArabicNum(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, d => arabicDigits[+d]);
}

function showToast(message, duration = 2500) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── Initialize ─────────────────────────────────────────────
async function init() {
    // Load saved page
    const savedPage = localStorage.getItem(STORAGE_KEY);
    if (savedPage) {
        currentPage = parseInt(savedPage, 10);
        pageInput.value = currentPage;
    }

    // Load dark mode (removed - light mode only)
    // Dark mode has been disabled

    // Load surah data
    try {
        const res = await fetch('assets/warsh/json/surah.json');
        surahData = await res.json();
        renderSurahIndex();
    } catch (e) {
        console.warn('Could not load surah data:', e);
    }

    // Navigation
    nextBtn.addEventListener('click', () => navigatePages(1));
    prevBtn.addEventListener('click', () => navigatePages(-1));
    pageInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (value >= 1 && value <= totalPages) {
            changePage(value);
        } else {
            e.target.value = currentPage;
        }
    });
    pageInput.addEventListener('focus', () => pageInput.select());

    // Header buttons
    document.getElementById('btn-index').addEventListener('click', () => openDrawer('surah'));
    document.getElementById('btn-bookmarks').addEventListener('click', () => openDrawer('bookmarks'));
    document.getElementById('close-surah-drawer').addEventListener('click', closeDrawer);
    document.getElementById('close-bookmarks-drawer').addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // Bottom Sheet
    bottomSheetOverlay.addEventListener('click', closeBottomSheet);
    document.getElementById('action-listen').addEventListener('click', actionListen);
    document.getElementById('action-listen-auto').addEventListener('click', actionListenAuto);
    document.getElementById('action-bookmark').addEventListener('click', actionBookmark);
    document.getElementById('action-copy').addEventListener('click', actionCopy);
    document.getElementById('action-share').addEventListener('click', actionShare);

    // Audio controls
    btnAudioPlay.addEventListener('click', toggleAudioPlay);
    btnAudioPrev.addEventListener('click', audioPrev);
    btnAudioNext.addEventListener('click', audioNext);
    btnAudioClose.addEventListener('click', closeAudioPlayer);
    btnRepeat.addEventListener('click', toggleRepeat);
    audioProgressBar.addEventListener('click', seekAudio);

    audioElement.addEventListener('timeupdate', updateAudioProgress);
    audioElement.addEventListener('ended', onAudioEnded);
    audioElement.addEventListener('playing', () => {
        isPlaying = true;
        updatePlayIcon();
    });
    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayIcon();
    });

    // Surah search
    surahSearch.addEventListener('input', filterSurahList);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Swipe gestures
    setupSwipeGestures();

    // Auto-hide header on scroll
    setupAutoHideHeader();

    // Desktop two-page mode detection
    checkTwoPageMode();
    window.addEventListener('resize', checkTwoPageMode);

    // Juz navigation
    if (btnJuzNav) {
        btnJuzNav.addEventListener('click', toggleJuzDropdown);
        document.addEventListener('click', (e) => {
            if (!juzDropdown.contains(e.target) && !btnJuzNav.contains(e.target)) {
                juzDropdown.classList.remove('active');
            }
        });
    }

    // Render
    renderPage(currentPage);
    updateButtons();
    renderBookmarks();
    renderJuzDropdown();
    lucide.createIcons();
}

// ─── Desktop Two-Page Mode ─────────────────────────────────
function checkTwoPageMode() {
    const wasTwoPage = isTwoPageMode;
    isTwoPageMode = window.innerWidth >= 1100;
    if (wasTwoPage !== isTwoPageMode) {
        renderPage(currentPage);
    }
}

function navigatePages(direction) {
    // In two-page mode, navigate by 2 pages; otherwise 1
    const step = isTwoPageMode ? 2 : 1;
    changePage(currentPage + (direction * step));
}

// ─── Auto-Hide Header ──────────────────────────────────────
function setupAutoHideHeader() {
    const header = document.getElementById('main-header');
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                if (scrollY > lastScrollY && scrollY > 80) {
                    header.classList.add('header-hidden');
                } else {
                    header.classList.remove('header-hidden');
                }
                lastScrollY = scrollY;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ─── Page Rendering ─────────────────────────────────────────
async function renderPage(pageNum) {
    pageContainer.innerHTML = loaderHTML;

    if (isTwoPageMode && pageNum > 2) {
        // Two-page spread: show even page (left) and odd page (right)
        // In RTL mushaf: right = higher page number, left = lower
        let rightPage, leftPage;

        if (pageNum % 2 === 0) {
            // Even: this is the left page
            rightPage = pageNum + 1;
            leftPage = pageNum;
        } else {
            // Odd: this is the right page
            rightPage = pageNum;
            leftPage = pageNum - 1;
        }

        // Clamp
        if (rightPage > totalPages) rightPage = totalPages;
        if (leftPage < 1) leftPage = 1;

        pageContainer.className = 'w-full flex justify-center two-page-spread';

        try {
            const [rightRes, leftRes] = await Promise.all([
                fetch(`assets/warsh/svg/${padNum(rightPage)}.svg`),
                fetch(`assets/warsh/svg/${padNum(leftPage)}.svg`)
            ]);

            if (!rightRes.ok || !leftRes.ok) throw new Error('فشل تحميل الصفحة');

            const [rightSvg, leftSvg] = await Promise.all([
                rightRes.text(), leftRes.text()
            ]);

            pageContainer.innerHTML = `
                <div class="quran-page-svg page-enter w-full" data-page="${rightPage}">${rightSvg}</div>
                <div class="page-divider"></div>
                <div class="quran-page-svg page-enter w-full" data-page="${leftPage}">${leftSvg}</div>
            `;

            // Setup interactions for both pages
            pageContainer.querySelectorAll('svg').forEach(svg => setupInteractions(svg));

            localStorage.setItem(STORAGE_KEY, pageNum);
            // In two-page mode, show the lower page number (rightPage in RTL means the page on the right visually)
            pageInput.value = leftPage;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updatePageInfo(leftPage);

        } catch (err) {
            showErrorPage(err);
        }
    } else {
        // Single page mode
        pageContainer.className = 'w-full max-w-[700px] flex justify-center';

        const formattedNum = padNum(pageNum);
        const svgPath = `assets/warsh/svg/${formattedNum}.svg`;

        try {
            const response = await fetch(svgPath);
            if (!response.ok) throw new Error('فشل تحميل الصفحة');
            const svgText = await response.text();

            pageContainer.innerHTML = `<div class="quran-page-svg page-enter w-full">${svgText}</div>`;

            const svgElement = pageContainer.querySelector('svg');
            setupInteractions(svgElement);

            localStorage.setItem(STORAGE_KEY, pageNum);
            pageInput.value = pageNum;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updatePageInfo(pageNum);

        } catch (err) {
            showErrorPage(err);
        }
    }

    lucide.createIcons();
}

function showErrorPage(err) {
    pageContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background: rgba(239,68,68,0.1);">
                <i data-lucide="alert-circle" class="w-7 h-7" style="color: #ef4444;"></i>
            </div>
            <p class="text-lg font-bold" style="color: #ef4444;">${err.message}</p>
            <button onclick="location.reload()" class="px-6 py-2.5 rounded-xl font-semibold transition-all" style="background: linear-gradient(135deg, var(--quran-gold), var(--quran-highlight)); color: #fff;">
                إعادة المحاولة
            </button>
        </div>
    `;
    lucide.createIcons();
}

function updatePageInfo(pageNum) {
    if (surahData.length === 0) return;

    // Find current surah for this page
    let currentSurah = surahData[0];
    for (let i = surahData.length - 1; i >= 0; i--) {
        if (surahData[i].pageNumber <= pageNum) {
            currentSurah = surahData[i];
            break;
        }
    }

    infoSurahName.textContent = `سورة ${currentSurah.nameArabic}`;
    infoJuzNumber.textContent = `الجزء ${toArabicNum(currentSurah.juzNumber)}`;

    // Hizb info
    const juz = currentSurah.juzNumber;
    const juzStart = JUZ_PAGES[juz - 1] || 1;
    const juzEnd = JUZ_PAGES[juz] || 605;
    const juzRange = juzEnd - juzStart;
    const progress = Math.min(100, Math.round(((pageNum - juzStart) / juzRange) * 100));
    if (infoJuzHizb) {
        infoJuzHizb.textContent = `${progress}% من الجزء`;
    }

    // Update juz label in footer
    const juzLabel = document.getElementById('juz-nav-label');
    if (juzLabel) {
        juzLabel.textContent = `جزء ${toArabicNum(juz)}`;
    }
}

// ─── Verse Interactions ────────────────────────────────────
function setupInteractions(svg) {
    if (!svg) return;
    const polygons = svg.querySelectorAll('.ayahPolygon');

    polygons.forEach(poly => {
        // Hover: show tooltip with verse info
        poly.addEventListener('mouseenter', (e) => {
            const surah = poly.getAttribute('surah');
            const ayah = poly.getAttribute('ayah');
            if (surah && ayah) {
                const surahInfo = surahData.find(s => s.number === parseInt(surah));
                const name = surahInfo ? surahInfo.nameArabic : surah;
                verseTooltip.textContent = `${name} : ${toArabicNum(ayah)}`;
                verseTooltip.classList.add('show');
                const rect = poly.getBoundingClientRect();
                verseTooltip.style.left = (rect.left + rect.width / 2 - verseTooltip.offsetWidth / 2) + 'px';
                verseTooltip.style.top = (rect.top - 35) + 'px';
            }
        });

        poly.addEventListener('mouseleave', () => {
            verseTooltip.classList.remove('show');
        });

        // Click: select verse
        poly.addEventListener('click', (e) => {
            e.stopPropagation();

            // Clear ALL previous active across all SVGs (for two-page mode)
            pageContainer.querySelectorAll('.ayahPolygon.active').forEach(p => p.classList.remove('active'));
            poly.classList.add('active');

            // Get verse info
            const surah = poly.getAttribute('surah');
            const ayah = poly.getAttribute('ayah');

            if (surah && ayah) {
                selectedSurah = parseInt(surah);
                selectedAyah = parseInt(ayah);

                // Show verse confirmation bar
                showSelectedVerseConfirmation(selectedSurah, selectedAyah);

                openBottomSheet(selectedSurah, selectedAyah);
            }
        });
    });

    // Click outside to deselect
    svg.addEventListener('click', (e) => {
        if (!e.target.classList.contains('ayahPolygon')) {
            pageContainer.querySelectorAll('.ayahPolygon.active').forEach(p => p.classList.remove('active'));
            hideSelectedVerseConfirmation();
        }
    });
}

function showSelectedVerseConfirmation(surahNum, ayahNum) {
    const surah = surahData.find(s => s.number === surahNum);
    const name = surah ? surah.nameArabic : `سورة ${surahNum}`;
    selectedVerseBar.textContent = `📖 ${name} ─ الآية ${toArabicNum(ayahNum)}`;
    selectedVerseBar.classList.add('show');

    clearTimeout(verseTooltipTimer);
    verseTooltipTimer = setTimeout(() => {
        selectedVerseBar.classList.remove('show');
    }, 4000);
}

function hideSelectedVerseConfirmation() {
    selectedVerseBar.classList.remove('show');
    clearTimeout(verseTooltipTimer);
}

// ─── Bottom Sheet ──────────────────────────────────────────
function openBottomSheet(surahNum, ayahNum) {
    const surah = surahData.find(s => s.number === surahNum);
    const surahName = surah ? surah.nameArabic : `سورة ${surahNum}`;

    sheetAyahNum.textContent = toArabicNum(ayahNum);
    sheetSurahName.textContent = `سورة ${surahName}`;
    sheetVerseDetail.textContent = `الآية ${toArabicNum(ayahNum)} - الصفحة ${toArabicNum(currentPage)}`;

    // Check if bookmarked
    const bookmarks = getBookmarks();
    const isBookmarked = bookmarks.some(b => b.surah === surahNum && b.ayah === ayahNum);
    bookmarkActionText.textContent = isBookmarked ? 'إزالة الإشارة المرجعية' : 'إضافة إشارة مرجعية';

    bottomSheetOverlay.classList.add('active');
    verseBottomSheet.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBottomSheet() {
    bottomSheetOverlay.classList.remove('active');
    verseBottomSheet.classList.remove('active');
    document.body.style.overflow = '';
}

// ─── Bottom Sheet Actions ──────────────────────────────────
function actionListen() {
    closeBottomSheet();
    playAyah(selectedSurah, selectedAyah, false);
}

function actionListenAuto() {
    closeBottomSheet();
    playAyah(selectedSurah, selectedAyah, true);
}

function actionBookmark() {
    closeBottomSheet();
    toggleBookmark(selectedSurah, selectedAyah);
}

function actionCopy() {
    closeBottomSheet();
    const surah = surahData.find(s => s.number === selectedSurah);
    const surahName = surah ? surah.nameArabic : selectedSurah;
    const text = `سورة ${surahName} - الآية ${selectedAyah} | صفحة ${currentPage}`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ تم النسخ بنجاح');
    }).catch(() => {
        showToast('❌ فشل النسخ');
    });
}

async function actionShare() {
    closeBottomSheet();
    const surah = surahData.find(s => s.number === selectedSurah);
    const surahName = surah ? surah.nameArabic : String(selectedSurah);
    const ayahNum = selectedAyah;

    showToast('⏳ جاري إنشاء الصورة...');

    // Fetch verse text using Hafs numbering mapped from Warsh
    let verseText = '';
    try {
        const kufiAyahs = VerseMapper.mapWarshToKufi(selectedSurah, selectedAyah);
        const reqs = kufiAyahs.map(k => fetch(`https://api.alquran.cloud/v1/ayah/${selectedSurah}:${k}/quran-uthmani`).then(res => res.json()));
        const responses = await Promise.all(reqs);
        verseText = responses.map(r => r.data.text).join(' ');
        // Clean up common basmalah prefix if it's not Fatiha ayah 1
        if (selectedSurah !== 1 && verseText.includes('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ')) {
            verseText = verseText.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ', '');
        }
    } catch (e) {
        console.warn('Could not fetch verse text', e);
    }

    try {
        const canvas = document.getElementById('share-canvas');
        const ctx = canvas.getContext('2d');

        // Card dimensions (Instagram/WhatsApp friendly)
        const W = 1080, H = 1080;
        canvas.width = W;
        canvas.height = H;

        // Background - warm parchment gradient
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#fdf8ed');
        bgGrad.addColorStop(0.5, '#fff9f0');
        bgGrad.addColorStop(1, '#fdf0d0');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Subtle geometric dot pattern
        ctx.fillStyle = 'rgba(184, 146, 42, 0.06)';
        for (let x = 0; x < W; x += 40) {
            for (let y = 0; y < H; y += 40) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Outer border
        ctx.strokeStyle = 'rgba(184, 146, 42, 0.35)';
        ctx.lineWidth = 3;
        roundRect(ctx, 30, 30, W - 60, H - 60, 28);
        ctx.stroke();

        // Inner border
        ctx.strokeStyle = 'rgba(184, 146, 42, 0.18)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 46, 46, W - 92, H - 92, 20);
        ctx.stroke();

        // Top decorative gold line
        const lineGrad = ctx.createLinearGradient(80, 0, W - 80, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.2, '#c9a84c');
        lineGrad.addColorStop(0.5, '#e8c96a');
        lineGrad.addColorStop(0.8, '#c9a84c');
        lineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(80, 130, W - 160, 2);

        // Bottom decorative gold line
        ctx.fillStyle = lineGrad;
        ctx.fillRect(80, H - 132, W - 160, 2);

        // Text settings
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Surah name - large
        ctx.fillStyle = '#1e1a13';
        ctx.font = 'bold 64px "Amiri", "Noto Naskh Arabic", serif';
        ctx.fillText(`سورة ${surahName}`, W / 2, 220);

        // Ayah number badge background
        const badgeGrad = ctx.createLinearGradient(W/2 - 80, 280, W/2 + 80, 350);
        badgeGrad.addColorStop(0, '#7a5c0e');
        badgeGrad.addColorStop(0.5, '#b8922a');
        badgeGrad.addColorStop(1, '#c9a84c');
        ctx.fillStyle = badgeGrad;
        roundRect(ctx, W/2 - 90, 280, 180, 68, 34);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Amiri", "Noto Naskh Arabic", serif';
        ctx.fillText(`الآية ${toArabicNum(ayahNum)}`, W / 2, 316);

        // Decorative stars / ornaments
        drawStar(ctx, W / 2 - 200, 420, 10, 'rgba(184, 146, 42, 0.4)');
        drawStar(ctx, W / 2 + 200, 420, 10, 'rgba(184, 146, 42, 0.4)');
        drawStar(ctx, W / 2, 420, 7, 'rgba(184, 146, 42, 0.3)');

        // Draw Verse Text
        ctx.fillStyle = '#1e1a13';
        if (verseText) {
            ctx.font = '48px "Amiri", "Noto Naskh Arabic", serif';
            const textY = wrapText(ctx, verseText, W / 2, 520, W - 200, 75);
            
            // Re-adjust page info dynamically based on text height
            ctx.fillStyle = '#7a6a52';
            ctx.font = '30px "Amiri", "Noto Naskh Arabic", serif';
            ctx.fillText(`صفحة ${toArabicNum(currentPage)}`, W / 2, Math.max(760, textY + 120));
        } else {
            // Fallback if no text could be loaded
            ctx.fillStyle = '#4a3c20';
            ctx.font = '44px "Amiri", "Noto Naskh Arabic", serif';
            ctx.fillText(`${surahName} : ${toArabicNum(ayahNum)}`, W / 2, 580);
            
            ctx.fillStyle = '#7a6a52';
            ctx.font = '30px "Amiri", "Noto Naskh Arabic", serif';
            ctx.fillText(`صفحة ${toArabicNum(currentPage)}`, W / 2, 660);
        }

        // Bottom ornament
        ctx.fillStyle = 'rgba(184, 146, 42, 0.08)';
        ctx.beginPath();
        ctx.arc(W / 2, H - 95, 40, 0, Math.PI * 2);
        ctx.fill();

        // Bottom label
        ctx.fillStyle = '#7a5c0e';
        ctx.font = '28px "Amiri", "Noto Naskh Arabic", serif';
        ctx.fillText('📖 مصحف ورش الرقمي', W / 2, H - 95);

        // Convert to blob and share
        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('❌ فشل إنشاء الصورة');
                return;
            }
            const file = new File([blob], `ayah-${selectedSurah}-${ayahNum}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `سورة ${surahName} - الآية ${ayahNum}`,
                        files: [file]
                    });
                } catch (e) {
                    if (e.name !== 'AbortError') downloadCanvasImage(canvas, surahName, ayahNum);
                }
            } else {
                // Fallback: download the image
                downloadCanvasImage(canvas, surahName, ayahNum);
            }
        }, 'image/png');

    } catch (err) {
        console.error('Share error:', err);
        showToast('❌ فشل إنشاء الصورة');
    }
}

function downloadCanvasImage(canvas, surahName, ayahNum) {
    const link = document.createElement('a');
    link.download = `سورة_${surahName}_آية_${ayahNum}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('✅ تم تحميل الصورة');
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currY = y;

    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, currY);
            line = words[n] + ' ';
            currY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, currY);
    return currY;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawStar(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(cx, cy);
    for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.ellipse(0, size, size * 0.2, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ─── Audio Player ──────────────────────────────────────────
function playAyah(surahNum, ayahNum, autoPlay = false) {
    currentAudioSurah = surahNum;
    currentAudioAyah = ayahNum;
    isAutoPlay = autoPlay;

    // Map Warsh to Kufi
    const kufiAyahs = VerseMapper.mapWarshToKufi(surahNum, ayahNum);
    
    if (kufiAyahs.length === 0) {
        showToast('⚠️ لا توجد بيانات صوتية');
        return;
    }

    // Load first Kufi ayah and put others in queue
    const firstKufi = kufiAyahs[0];
    audioQueue = kufiAyahs.slice(1);

    playKufiFile(surahNum, firstKufi);

    // Update player UI (Show Warsh verse info)
    const surah = surahData.find(s => s.number === surahNum);
    const surahName = surah ? surah.nameArabic : `سورة ${surahNum}`;
    audioAyahInfo.textContent = `سورة ${surahName} - آية ${toArabicNum(ayahNum)}`;

    // Show player
    audioPlayerBar.classList.add('active');

    // Highlight playing ayah (Warsh number)
    highlightPlayingAyah(surahNum, ayahNum);

    lucide.createIcons();
}

function playKufiFile(surahNum, kufiNum) {
    const url = `${AUDIO_BASE}/${padNum(surahNum)}${padNum(kufiNum)}.mp3`;
    audioElement.src = url;
    audioElement.play().catch(e => {
        console.error('Audio play failed:', e);
        showToast('⚠️ فشل تشغيل الصوت');
    });
}

function toggleAudioPlay() {
    if (!audioElement.src) return;
    if (isPlaying) {
        audioElement.pause();
    } else {
        audioElement.play().catch(() => {});
    }
}

function updatePlayIcon() {
    const icon = document.getElementById('audio-play-icon');
    if (icon) {
        icon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
        lucide.createIcons();
    }
}

function updateAudioProgress() {
    if (audioElement.duration) {
        const pct = (audioElement.currentTime / audioElement.duration) * 100;
        audioProgressFill.style.width = pct + '%';
    }
}

function seekAudio(e) {
    if (!audioElement.duration) return;
    const rect = audioProgressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioElement.currentTime = pct * audioElement.duration;
}

function onAudioEnded() {
    if (repeatMode === 1) {
        audioElement.currentTime = 0;
        audioElement.play();
        return;
    }

    // If there are more Kufi parts for the same Warsh ayah
    if (audioQueue.length > 0) {
        const nextKufi = audioQueue.shift();
        playKufiFile(currentAudioSurah, nextKufi);
        return;
    }

    if (isAutoPlay) {
        audioNext();
    } else {
        isPlaying = false;
        updatePlayIcon();
        clearPlayingHighlights();
    }
}

function audioNext() {
    if (!currentAudioSurah) return;
    const surah = surahData.find(s => s.number === currentAudioSurah);
    if (!surah) return;

    let nextAyah = currentAudioAyah + 1;
    const currentKufis = VerseMapper.mapWarshToKufi(currentAudioSurah, currentAudioAyah);
    const lastKufiPlayed = currentKufis[currentKufis.length - 1];

    // Skip Warsh ayahs whose audio overlap entirely with what we just played
    while (nextAyah <= surah.ayahCount) {
        const nextKufis = VerseMapper.mapWarshToKufi(currentAudioSurah, nextAyah);
        if (nextKufis[0] > lastKufiPlayed) {
            break; // Found a genuinely new audio portion
        }
        nextAyah++;
    }

    if (nextAyah <= surah.ayahCount) {
        playAyah(currentAudioSurah, nextAyah, isAutoPlay);
    } else {
        // Move to next surah
        const nextSurah = surahData.find(s => s.number === currentAudioSurah + 1);
        if (nextSurah) {
            playAyah(nextSurah.number, 1, isAutoPlay);
            // Navigate to the surah page
            if (nextSurah.pageNumber !== currentPage) {
                changePage(nextSurah.pageNumber);
            }
        } else {
            isAutoPlay = false;
            isPlaying = false;
            updatePlayIcon();
            showToast('🎉 انتهى التشغيل');
        }
    }
}

function audioPrev() {
    if (!currentAudioSurah) return;
    if (audioElement.currentTime > 3) {
        audioElement.currentTime = 0;
        return;
    }

    let prevAyah = currentAudioAyah - 1;
    const currentKufis = VerseMapper.mapWarshToKufi(currentAudioSurah, currentAudioAyah);
    const firstKufiPlayed = currentKufis[0];

    // Skip Warsh ayahs whose audio overlap entirely with the current block
    while (prevAyah > 0) {
        const prevKufis = VerseMapper.mapWarshToKufi(currentAudioSurah, prevAyah);
        if (prevKufis[prevKufis.length - 1] < firstKufiPlayed) {
            break; // Found the previous genuinely distinct audio portion
        }
        prevAyah--;
    }

    if (prevAyah > 0) {
        playAyah(currentAudioSurah, prevAyah, isAutoPlay);
    } else {
        // Move to previous surah
        const prevSurah = surahData.find(s => s.number === currentAudioSurah - 1);
        if (prevSurah) {
            playAyah(prevSurah.number, prevSurah.ayahCount, isAutoPlay);
        }
    }
}

function closeAudioPlayer() {
    audioElement.pause();
    audioElement.src = '';
    audioPlayerBar.classList.remove('active');
    isPlaying = false;
    isAutoPlay = false;
    currentAudioSurah = null;
    currentAudioAyah = null;
    audioProgressFill.style.width = '0%';
    clearPlayingHighlights();
    updatePlayIcon();
}

function toggleRepeat() {
    repeatMode = repeatMode === 0 ? 1 : 0;
    btnRepeat.style.color = repeatMode ? 'var(--quran-gold)' : '';
    repeatBadge.classList.toggle('hidden', repeatMode === 0);
    showToast(repeatMode ? '🔁 تكرار الآية مفعّل' : '➡️ تم إيقاف التكرار');
}

function highlightPlayingAyah(surahNum, ayahNum) {
    clearPlayingHighlights();
    
    // Find all Warsh ayahs that share the same Kufi audio file
    const targetKufis = VerseMapper.mapWarshToKufi(surahNum, ayahNum);
    if (!targetKufis || targetKufis.length === 0) return;
    
    const firstKufi = targetKufis[0];
    const lastKufi = targetKufis[targetKufis.length - 1];
    
    const ayahsToHighlight = [ayahNum];
    const surah = surahData.find(s => s.number === surahNum);
    
    if (surah) {
        // Check forwards for ayahs sharing the same audio interval
        let nextA = ayahNum + 1;
        while (nextA <= surah.ayahCount) {
            const nextK = VerseMapper.mapWarshToKufi(surahNum, nextA);
            if (nextK[0] <= lastKufi) {
                ayahsToHighlight.push(nextA);
                nextA++;
            } else {
                break;
            }
        }
        
        // Check backwards
        let prevA = ayahNum - 1;
        while (prevA > 0) {
            const prevK = VerseMapper.mapWarshToKufi(surahNum, prevA);
            if (prevK[prevK.length - 1] >= firstKufi) {
                ayahsToHighlight.push(prevA);
                prevA--;
            } else {
                break;
            }
        }
    }

    // Support both single and two-page mode
    const svgElements = pageContainer.querySelectorAll('svg');
    svgElements.forEach(svgElement => {
        const polygons = svgElement.querySelectorAll('.ayahPolygon');
        polygons.forEach(poly => {
            const pSurah = parseInt(poly.getAttribute('surah'));
            const pAyah = parseInt(poly.getAttribute('ayah'));
            if (pSurah === surahNum && ayahsToHighlight.includes(pAyah)) {
                poly.classList.add('playing');
            }
        });
    });
}

function clearPlayingHighlights() {
    pageContainer.querySelectorAll('.ayahPolygon.playing').forEach(p => p.classList.remove('playing'));
}

// ─── Drawers ───────────────────────────────────────────────
function openDrawer(type) {
    closeBottomSheet();
    drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (type === 'surah') {
        surahDrawer.classList.add('active');
        setTimeout(() => surahSearch.focus(), 400);
    } else {
        bookmarksDrawer.classList.add('active');
        renderBookmarks();
    }
}

function closeDrawer() {
    drawerOverlay.classList.remove('active');
    surahDrawer.classList.remove('active');
    bookmarksDrawer.classList.remove('active');
    document.body.style.overflow = '';
}

// ─── Surah Index ───────────────────────────────────────────
function renderSurahIndex() {
    surahList.innerHTML = '';

    surahData.forEach(surah => {
        const btn = document.createElement('button');
        btn.className = 'surah-item';
        btn.setAttribute('data-surah-number', surah.number);
        btn.setAttribute('data-surah-name', surah.nameArabic);
        btn.setAttribute('data-surah-english', surah.nameEnglish);

        btn.innerHTML = `
            <div class="surah-number"><span>${toArabicNum(surah.number)}</span></div>
            <div class="flex-1 text-right">
                <p class="font-bold text-base" style="color: var(--quran-text);">سورة ${surah.nameArabic}</p>
                <p class="text-xs" style="color: var(--quran-text-muted);">${surah.nameEnglish} · ${toArabicNum(surah.ayahCount)} آية · جزء ${toArabicNum(surah.juzNumber)}</p>
            </div>
            <div class="text-xs px-2 py-1 rounded-lg" style="background: var(--quran-surface); color: var(--quran-text-muted);">
                ص ${toArabicNum(surah.pageNumber)}
            </div>
        `;

        btn.addEventListener('click', () => {
            changePage(surah.pageNumber);
            closeDrawer();
            showToast(`📖 سورة ${surah.nameArabic}`);
        });

        surahList.appendChild(btn);
    });
}

function filterSurahList() {
    const query = surahSearch.value.trim().toLowerCase();
    const items = surahList.querySelectorAll('.surah-item');

    items.forEach(item => {
        const nameAr = item.getAttribute('data-surah-name');
        const nameEn = item.getAttribute('data-surah-english').toLowerCase();
        const num = item.getAttribute('data-surah-number');

        const match = !query || nameAr.includes(query) || nameEn.includes(query) || num === query;
        item.style.display = match ? '' : 'none';
    });
}

// ─── Bookmarks ─────────────────────────────────────────────
function getBookmarks() {
    try {
        return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    } catch { return []; }
}

function saveBookmarks(bookmarks) {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

function toggleBookmark(surahNum, ayahNum) {
    let bookmarks = getBookmarks();
    const idx = bookmarks.findIndex(b => b.surah === surahNum && b.ayah === ayahNum);

    if (idx >= 0) {
        bookmarks.splice(idx, 1);
        showToast('🔖 تم إزالة الإشارة المرجعية');
    } else {
        const surah = surahData.find(s => s.number === surahNum);
        bookmarks.unshift({
            surah: surahNum,
            ayah: ayahNum,
            surahName: surah ? surah.nameArabic : `سورة ${surahNum}`,
            page: currentPage,
            date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
        });
        showToast('🔖 تمت إضافة إشارة مرجعية');
    }

    saveBookmarks(bookmarks);
}

function renderBookmarks() {
    const bookmarks = getBookmarks();

    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '';
        bookmarksEmpty.classList.remove('hidden');
        return;
    }

    bookmarksEmpty.classList.add('hidden');
    bookmarksList.innerHTML = '';

    bookmarks.forEach((bm, index) => {
        const div = document.createElement('div');
        div.className = 'bookmark-item';
        div.innerHTML = `
            <div class="flex items-center gap-3 cursor-pointer flex-1" data-page="${bm.page}">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05));">
                    <span class="font-bold text-sm" style="color: var(--quran-gold);">${toArabicNum(bm.ayah)}</span>
                </div>
                <div>
                    <p class="font-semibold text-sm" style="color: var(--quran-text);">سورة ${bm.surahName} - آية ${toArabicNum(bm.ayah)}</p>
                    <p class="text-xs" style="color: var(--quran-text-muted);">صفحة ${toArabicNum(bm.page)} · ${bm.date}</p>
                </div>
            </div>
            <button class="header-icon-btn bookmark-delete-btn flex-shrink-0" data-index="${index}" title="حذف">
                <i data-lucide="trash-2" class="w-4 h-4" style="color: #ef4444;"></i>
            </button>
        `;

        // Navigate on click
        div.querySelector('[data-page]').addEventListener('click', () => {
            changePage(bm.page);
            closeDrawer();
        });

        // Delete
        div.querySelector('.bookmark-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const bookmarks = getBookmarks();
            bookmarks.splice(index, 1);
            saveBookmarks(bookmarks);
            renderBookmarks();
            showToast('🗑️ تم حذف الإشارة');
        });

        bookmarksList.appendChild(div);
    });

    lucide.createIcons();
}

// ─── Dark Mode (Disabled) ──────────────────────────────────
function toggleDarkMode(force = null) {
    // Dark mode has been removed from this application
    // This function is kept as a stub for compatibility
}

// ─── Navigation ────────────────────────────────────────────
function changePage(newPage) {
    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    // pageInput.value is set inside renderPage() for accuracy
    renderPage(currentPage);
    updateButtons();

    // Update highlights if audio is playing
    if (currentAudioSurah && currentAudioAyah) {
        setTimeout(() => highlightPlayingAyah(currentAudioSurah, currentAudioAyah), 500);
    }

    // Update juz dropdown highlight
    updateJuzHighlight();
}

function updateButtons() {
    nextBtn.disabled = currentPage >= totalPages;
    prevBtn.disabled = currentPage <= 1;
}

// ─── Juz Navigation ────────────────────────────────────────
function renderJuzDropdown() {
    if (!juzDropdown) return;
    juzDropdown.innerHTML = '';

    for (let i = 1; i <= 30; i++) {
        const btn = document.createElement('button');
        btn.className = 'juz-item';
        btn.setAttribute('data-juz', i);

        // Find surahs in this juz
        const juzSurahs = surahData.filter(s => s.juzNumber === i);
        const surahNames = juzSurahs.length > 0
            ? juzSurahs.map(s => s.nameArabic).slice(0, 3).join('، ')
            : '';

        btn.innerHTML = `
            <div class="juz-num">${toArabicNum(i)}</div>
            <div class="flex-1">
                <div class="font-bold">الجزء ${toArabicNum(i)}</div>
                <div class="text-xs" style="color: var(--quran-text-muted);">${surahNames}</div>
            </div>
            <div class="text-xs" style="color: var(--quran-text-muted);">ص ${toArabicNum(JUZ_PAGES[i-1])}</div>
        `;

        btn.addEventListener('click', () => {
            changePage(JUZ_PAGES[i - 1]);
            juzDropdown.classList.remove('active');
            showToast(`📖 الجزء ${toArabicNum(i)}`);
        });

        juzDropdown.appendChild(btn);
    }

    updateJuzHighlight();
}

function toggleJuzDropdown() {
    juzDropdown.classList.toggle('active');
    if (juzDropdown.classList.contains('active')) {
        updateJuzHighlight();
        // Scroll to current juz
        const currentItem = juzDropdown.querySelector('.juz-item.current');
        if (currentItem) {
            currentItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
}

function updateJuzHighlight() {
    if (!juzDropdown) return;
    const currentJuz = getCurrentJuz();
    juzDropdown.querySelectorAll('.juz-item').forEach(item => {
        const juz = parseInt(item.getAttribute('data-juz'));
        item.classList.toggle('current', juz === currentJuz);
    });
}

function getCurrentJuz() {
    for (let i = JUZ_PAGES.length - 1; i >= 0; i--) {
        if (currentPage >= JUZ_PAGES[i]) return i + 1;
    }
    return 1;
}

// ─── Keyboard Shortcuts ────────────────────────────────────
function handleKeyboard(e) {
    // Don't trigger shortcuts if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowRight':
            e.preventDefault();
            navigatePages(1);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            navigatePages(-1);
            break;
        case ' ':
            e.preventDefault();
            toggleAudioPlay();
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            openDrawer('surah');
            break;
        case 'b':
        case 'B':
            e.preventDefault();
            openDrawer('bookmarks');
            break;
        case 'd':
        case 'D':
            // Dark mode removed
            break;
        case 'Escape':
            closeBottomSheet();
            closeDrawer();
            break;
    }
}

// ─── Swipe Gestures (Mobile) ───────────────────────────────
function setupSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipe = 60;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;

        // Don't swipe if drawer/sheet is open
        if (surahDrawer.classList.contains('active') ||
            bookmarksDrawer.classList.contains('active') ||
            verseBottomSheet.classList.contains('active')) return;

        if (Math.abs(diff) > minSwipe) {
            if (diff > 0) {
                // Swipe left → previous page (RTL: forward)
                changePage(currentPage - 1);
            } else {
                // Swipe right → next page (RTL: backward)
                changePage(currentPage + 1);
            }
        }
    }, { passive: true });
}

// ─── Start App ─────────────────────────────────────────────
init();
