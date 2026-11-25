// ==UserScript==
// @name         Free Kinopoisk 
// @namespace    https://github.com/accidettrauma/kinobox-kinopoisk-button
// @version      2.0
// @description  Смотрите фильмы бесплатно
// @author       accidenttrauma
// @match        https://www.kinopoisk.ru/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @icon         https://raw.githubusercontent.com/accidenttrauma/kinobox-kinopoisk-button/main/icon.png
// ==/UserScript==

(function () {
    'use strict';

    const MODE_KEY    = 'kinobox_mode';
    const THEME_KEY   = 'kinobox_theme';
    const ACCENT_KEY  = 'kinobox_accent';
    const POS_KEY     = 'kinobox_floating_pos';

    const DEFAULT_MODE   = 'inline';
    const DEFAULT_THEME  = 'light';
    const DEFAULT_ACCENT = '#ff5500';

    let currentMode   = GM_getValue(MODE_KEY, DEFAULT_MODE);
    let currentTheme  = GM_getValue(THEME_KEY, DEFAULT_THEME);
    let currentAccent = GM_getValue(ACCENT_KEY, DEFAULT_ACCENT);
    let floatingPos   = GM_getValue(POS_KEY, { left: 25, top: 45 });

    // ===== Меню =====
    GM_registerMenuCommand('Режим → Кнопка рядом', () => {
        GM_setValue(MODE_KEY, 'inline'); currentMode = 'inline'; cleanup(); init();
    });
    GM_registerMenuCommand('Режим → Плавающая кнопка', () => {
        GM_setValue(MODE_KEY, 'floating'); currentMode = 'floating'; cleanup(); init();
    });
    GM_registerMenuCommand('Режим → Флажок', () => {
        GM_setValue(MODE_KEY, 'flag'); currentMode = 'flag'; cleanup(); init();
    });

    GM_registerMenuCommand('Тема → Светлая', () => {
        GM_setValue(THEME_KEY, 'light'); currentTheme = 'light'; cleanup(); init();
    });
    GM_registerMenuCommand('Тема → Тёмная', () => {
        GM_setValue(THEME_KEY, 'dark'); currentTheme = 'dark'; cleanup(); init();
    });
    GM_registerMenuCommand('Тема → Авто', () => {
        GM_setValue(THEME_KEY, 'auto'); currentTheme = 'auto'; cleanup(); init();
    });

    GM_registerMenuCommand('Акцент → Оранжевый (#ff5500)', () => setAccent('#ff5500'));
    GM_registerMenuCommand('Акцент → Красный (#e53935)', () => setAccent('#e53935'));
    GM_registerMenuCommand('Акцент → Синий (#1e88e5)', () => setAccent('#1e88e5'));
    GM_registerMenuCommand('Акцент → Чёрный (#111111)', () => setAccent('#111111'));
    GM_registerMenuCommand('Акцент → Бирюзовый (#45edbb)', () => setAccent('#45edbb'));

    function setAccent(color) {
        currentAccent = color;
        GM_setValue(ACCENT_KEY, color);
        cleanup();
        init();
    }

    // ===== Тема =====
    function isDarkTheme() {
        if (currentTheme === 'light') return false;
        if (currentTheme === 'dark')  return true;

        const candidates = [
            document.querySelector('[class*="styles_root"]'),
            document.querySelector('[class*="media-player"]'),
            document.querySelector('main'),
            document.querySelector('#__next'),
            document.body
        ];

        for (const el of candidates) {
            if (!el) continue;
            const bg = getComputedStyle(el).backgroundColor;
            const m = bg.match(/\d+/g);
            if (m && m.length >= 3) {
                const brightness = (m[0]*299 + m[1]*587 + m[2]*114) / 1000;
                if (brightness < 60) return true;
                if (brightness > 200) return false;
            }
        }

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            const content = meta.getAttribute('content') || '';
            if (content.includes('#000') || content.includes('#111') || content.includes('#1a')) return true;
        }

        return false;
    }

    function getColors() {
        const dark = isDarkTheme();
        return {
            dark,
            bg:     dark ? '#2c2c2c' : '#f2f2f2',
            border: dark ? '#555555' : '#cccccc',
            text:   dark ? '#eeeeee' : '#222222',
            accent: currentAccent
        };
    }

    function cleanup() {
        document.getElementById('kinobox-inline-btn')?.remove();
        document.getElementById('kinobox-floating-btn')?.remove();
        document.getElementById('kinobox-flag')?.remove();
    }

    function getFilmId() {
        return location.pathname.match(/\/(film|series)\/(\d+)/)?.[2] || null;
    }

    function openKinobox(filmId, background = false) {
        if (!filmId) return;
        const url = `https://kinobox.in/movie/${filmId}/`;
        if (background) {
            // Средняя кнопка мыши обычно открывает в фоне
            window.open(url, '_blank');
        } else {
            window.open(url, '_blank');
        }
    }

    // ===== INLINE =====
    function createInlineButton(filmId, container) {
        if (document.getElementById('kinobox-inline-btn')) return;

        const c = getColors();
        const btn = document.createElement('button');
        btn.id = 'kinobox-inline-btn';

        btn.style.cssText = `
            width: 52px !important; height: 52px !important; min-width: 52px !important;
            padding: 0 !important; margin-left: 6px !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
            border-radius: 50% !important;
            background: ${c.bg} !important;
            border: 1px solid ${c.border} !important;
            cursor: pointer !important;
            transition: all 0.25s ease !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.18) !important;
            color: ${c.text} !important;
        `;

        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8"/></svg>`;
        const svg = btn.querySelector('svg');

        btn.onmouseenter = () => {
            btn.style.background = c.accent;
            btn.style.color = '#fff';
            btn.style.transform = 'scale(1.08)';
            btn.style.boxShadow = `0 0 18px ${c.accent}88, 0 4px 12px rgba(0,0,0,0.25)`;
            svg.style.transform = 'scale(1.12)';
        };
        btn.onmouseleave = () => {
            btn.style.background = c.bg;
            btn.style.color = c.text;
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';
            svg.style.transform = 'scale(1)';
        };

        btn.title = 'Смотреть на Kinobox (Alt+Q)\nКолёсико — в фоне';
        btn.onclick = (e) => {
            e.stopImmediatePropagation();
            openKinobox(filmId);
        };

        // Средняя кнопка мыши
        btn.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                e.stopImmediatePropagation();
                openKinobox(filmId, true);
            }
        });

        container.appendChild(btn);
    }

    // ===== FLOATING + Drag&Drop + Glow =====
    function createFloatingButton(filmId) {
        if (document.getElementById('kinobox-floating-btn')) return;

        const c = getColors();
        const btn = document.createElement('div');
        btn.id = 'kinobox-floating-btn';

        const left = floatingPos.left ?? 25;
        const top  = floatingPos.top  ?? 45;

        btn.style.cssText = `
            position: fixed;
            left: ${left}px;
            top: ${top}%;
            transform: translateY(-50%);
            width: 62px; height: 62px;
            background: ${c.bg};
            border: 3px solid ${c.border};
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: grab;
            z-index: 999999;
            box-shadow: 0 8px 25px rgba(0,0,0,0.35);
            transition: background 0.25s, border-color 0.25s, transform 0.2s, box-shadow 0.25s;
            user-select: none;
        `;

        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><path fill="${c.text}" d="m10 16.5l6-4.5l-6-4.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8"/></svg>`;
        const path = btn.querySelector('path');

        btn.onmouseenter = () => {
            if (isDragging) return;
            btn.style.background = c.accent;
            btn.style.borderColor = c.accent;
            btn.style.boxShadow = `0 0 22px ${c.accent}aa, 0 8px 25px rgba(0,0,0,0.4)`;
            path.setAttribute('fill', '#ffffff');
        };
        btn.onmouseleave = () => {
            if (isDragging) return;
            btn.style.background = c.bg;
            btn.style.borderColor = c.border;
            btn.style.boxShadow = '0 8px 25px rgba(0,0,0,0.35)';
            path.setAttribute('fill', c.text);
        };

        let moved = false;
        btn.onclick = (e) => {
            e.stopImmediatePropagation();
            if (!moved) openKinobox(filmId);
        };

        // Колёсико
        btn.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                e.stopImmediatePropagation();
                openKinobox(filmId, true);
            }
        });

        // Drag & Drop
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            moved = false;
            btn.style.cursor = 'grabbing';
            btn.style.transition = 'none';
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(btn.style.left);
            startTop  = parseFloat(btn.style.top);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            moved = true;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newLeft = startLeft + dx;
            let newTop  = startTop + (dy / window.innerHeight * 100);
            newLeft = Math.max(5, Math.min(window.innerWidth - 70, newLeft));
            newTop  = Math.max(5, Math.min(95, newTop));
            btn.style.left = newLeft + 'px';
            btn.style.top  = newTop + '%';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            btn.style.cursor = 'grab';
            btn.style.transition = 'background 0.25s, border-color 0.25s, transform 0.2s, box-shadow 0.25s';
            floatingPos = {
                left: parseFloat(btn.style.left),
                top:  parseFloat(btn.style.top)
            };
            GM_setValue(POS_KEY, floatingPos);
        });

        document.body.appendChild(btn);
    }

    // ===== FLAG =====
    function createFlag(filmId) {
        if (document.getElementById('kinobox-flag')) return;

        const flag = document.createElement('div');
        flag.id = 'kinobox-flag';
        flag.innerHTML = `
            <svg width="34" height="150" viewBox="0 0 128 512" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path d="M128 0H0V512L64 480L128 512Z" fill="#000000"/>
                <path d="M40 358 L100 390 L40 423 Z" fill="#ffffff"/>
            </svg>`;
        flag.style.cssText = `
            position: fixed; left: 8px; top: -48px;
            width: 32px; height: 128px;
            z-index: 2147483647; cursor: pointer;
            transition: transform 0.35s ease;
            transform: translateY(0);
        `;
        flag.onmouseenter = () => flag.style.transform = 'translateY(12px)';
        flag.onmouseleave = () => flag.style.transform = 'translateY(0)';
        flag.title = 'Открыть на Kinobox (Alt+Q)';
        flag.onclick = (e) => { e.stopImmediatePropagation(); openKinobox(filmId); };

        flag.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                openKinobox(filmId, true);
            }
        });

        document.body.appendChild(flag);
    }

    // ===== Логика + умный observer =====
    function tryCreate() {
        const filmId = getFilmId();
        if (!filmId) {
            cleanup();
            return false;
        }

        if (currentMode === 'inline') {
            const container = document.querySelector('div[class*="buttonsContainer"]');
            if (container) {
                createInlineButton(filmId, container);
                return true;
            }
            return false;
        }
        if (currentMode === 'floating') {
            createFloatingButton(filmId);
            return true;
        }
        if (currentMode === 'flag') {
            createFlag(filmId);
            return true;
        }
        return false;
    }

    let observer = null;

    function startWideObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(() => {
            if (tryCreate()) {
                // Кнопка создана — переключаемся на узкий observer (если inline)
                if (currentMode === 'inline') {
                    const container = document.querySelector('div[class*="buttonsContainer"]');
                    if (container) {
                        observer.disconnect();
                        observer = new MutationObserver(() => {
                            if (!document.getElementById('kinobox-inline-btn')) {
                                tryCreate();
                            }
                        });
                        observer.observe(container, { childList: true, subtree: true });
                    }
                } else {
                    // Для floating/flag можно вообще отключить observer
                    observer.disconnect();
                    observer = null;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
        cleanup();
        if (!tryCreate()) {
            startWideObserver();
        } else if (currentMode === 'inline') {
            const container = document.querySelector('div[class*="buttonsContainer"]');
            if (container) {
                if (observer) observer.disconnect();
                observer = new MutationObserver(() => {
                    if (!document.getElementById('kinobox-inline-btn')) tryCreate();
                });
                observer.observe(container, { childList: true, subtree: true });
            }
        }
    }

    // Горячая клавиша Alt+Q
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === 'KeyQ' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
            e.preventDefault();
            openKinobox(getFilmId());
        }
    }, true);

    // SPA
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(init, 600);
        }
    }).observe(document, { subtree: true, childList: true });

    if (window.navigation) {
        window.navigation.addEventListener('navigate', () => setTimeout(init, 600));
    }
    window.addEventListener('popstate', () => setTimeout(init, 600));

    init();
})();
