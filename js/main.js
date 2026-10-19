// 网站基础脚本
console.log("黎明杀机资料库加载完成");

document.addEventListener('DOMContentLoaded', function () {
    initBackToTop();
    initLightbox();
    initSearch();
    initFilter();
    initPerkFilter();
    initSmoothScroll();
});

// ========== 回到顶部按钮（所有页面自动创建） ==========
function initBackToTop() {
    let btn = document.getElementById('backToTop');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'backToTop';
        btn.className = 'back-to-top';
        btn.innerHTML = '↑';
        btn.setAttribute('aria-label', '回到顶部');
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(btn);
    }
    window.addEventListener('scroll', function () {
        if (window.scrollY > 300) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    });
}

// ========== 图片灯箱（点击卡片图片放大，所有页面自动生效） ==========
function initLightbox() {
    let lightbox = document.getElementById('lightbox');
    let img = document.getElementById('lightboxImg');
    let closeBtn = document.getElementById('lightboxClose');

    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';

        closeBtn = document.createElement('span');
        closeBtn.id = 'lightboxClose';
        closeBtn.className = 'lightbox-close';
        closeBtn.innerHTML = '&times;';

        img = document.createElement('img');
        img.id = 'lightboxImg';
        img.className = 'lightbox-img';
        img.alt = '图片预览';

        lightbox.appendChild(closeBtn);
        lightbox.appendChild(img);
        document.body.appendChild(lightbox);
    }

    function openLightbox(src, alt) {
        img.src = src;
        img.alt = alt || '图片预览';
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('show');
        document.body.style.overflow = '';
        img.src = '';
    }

    // 事件委托：点击任意卡片图片放大
    document.addEventListener('click', function (e) {
        const cardImg = e.target.closest('.card-img');
        if (cardImg) {
            openLightbox(cardImg.getAttribute('src'), cardImg.getAttribute('alt'));
        }
    });

    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox || e.target === closeBtn) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightbox.classList.contains('show')) {
            closeLightbox();
        }
    });
}

// ========== 全局搜索 ==========
let currentHighlight = [];

function initSearch() {
    const headerSearch = document.getElementById('headerSearch');
    const sideSearch = document.getElementById('searchInput');
    const headerResult = document.getElementById('headerSearchResult');
    const sideResult = document.getElementById('searchResult');

    if (headerSearch) {
        bindSearch(headerSearch, headerResult);
    }
    if (sideSearch) {
        bindSearch(sideSearch, sideResult);
    }
}

function bindSearch(input, resultEl) {
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            performSearch(this.value, resultEl);
        }
    });
    input.addEventListener('input', function () {
        if (this.value.trim() === '') {
            clearHighlight();
            if (resultEl) {
                resultEl.textContent = '';
                resultEl.classList.remove('show');
            }
        }
    });
}

function performSearch(rawKeyword, resultEl) {
    const keyword = rawKeyword.trim().toLowerCase();
    if (keyword === '') {
        clearHighlight();
        if (resultEl) {
            resultEl.textContent = '';
            resultEl.classList.remove('show');
        }
        return;
    }

    // 搜索前重置筛选，确保能找到全部内容
    resetAllFilters();

    // 1. 技能页：优先定位角色标题（h4）
    const headings = document.querySelectorAll('.perk-section h4');
    for (let h of headings) {
        if (h.textContent.toLowerCase().includes(keyword)) {
            scrollToElement(h);
            showResult(resultEl, '已定位到：' + h.textContent.trim());
            clearHighlight();
            // 高亮该角色下的技能卡片
            let next = h.nextElementSibling;
            while (next && next.classList.contains('card-grid')) {
                next.querySelectorAll('.card').forEach(c => {
                    c.classList.add('highlight');
                    currentHighlight.push(c);
                });
                next = next.nextElementSibling;
                if (next && next.tagName === 'H4') break;
            }
            return;
        }
    }

    // 2. 搜索卡片（技能/角色/地图/首页入口）
    const cards = document.querySelectorAll('.card, .entry-card');
    for (let card of cards) {
        const text = getSearchText(card);
        if (text.includes(keyword)) {
            scrollToElement(card);
            const titleEl = card.querySelector('h3') || card.querySelector('.card-content h3');
            const title = titleEl ? titleEl.textContent.trim() : '匹配内容';
            showResult(resultEl, '已定位到：' + title);
            clearHighlight();
            card.classList.add('highlight');
            currentHighlight.push(card);
            return;
        }
    }

    showResult(resultEl, '未找到匹配内容');
    clearHighlight();
}

function getSearchText(el) {
    let text = (el.innerText || '').toLowerCase();
    const img = el.querySelector('img');
    if (img && img.alt) {
        text += ' ' + img.alt.toLowerCase();
    }
    return text;
}

function showResult(resultEl, text) {
    if (!resultEl) return;
    resultEl.textContent = text;
    resultEl.classList.add('show');
    // 结果条几秒后自动隐藏
    clearTimeout(resultEl._hideTimer);
    resultEl._hideTimer = setTimeout(function () {
        resultEl.classList.remove('show');
    }, 4000);
}

function scrollToElement(el) {
    const offsetTop = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
}

function clearHighlight() {
    currentHighlight.forEach(el => el.classList.remove('highlight'));
    currentHighlight = [];
    document.querySelectorAll('.card.highlight, .entry-card.highlight').forEach(el => {
        el.classList.remove('highlight');
    });
}

// ========== 角色/技能筛选（逃生者、屠夫页） ==========
function initFilter() {
    const chips = document.querySelectorAll('.filter-chip[data-filter]');
    if (chips.length === 0) return;

    const state = { faction: '全部', role: '全部' };

    chips.forEach(chip => {
        chip.addEventListener('click', function () {
            const type = this.getAttribute('data-filter'); // faction / role
            const value = this.getAttribute('data-value');

            // 更新该组按钮的高亮
            document.querySelectorAll('.filter-chip[data-filter="' + type + '"]').forEach(c => {
                c.classList.remove('active');
            });
            this.classList.add('active');

            state[type] = value;
            applyFilter(state);
        });
    });
}

function applyFilter(state) {
    const cards = document.querySelectorAll('.card[data-faction]');
    let visibleCount = 0;
    cards.forEach(card => {
        const faction = card.getAttribute('data-faction');
        const role = card.getAttribute('data-role');
        const matchFaction = state.faction === '全部' || faction === state.faction;
        const matchRole = state.role === '全部' || role === state.role;
        if (matchFaction && matchRole) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    console.log('筛选结果：' + visibleCount + ' 个角色');
}

function resetAllFilters() {
    // 重置角色筛选
    document.querySelectorAll('.filter-chip[data-filter]').forEach(c => {
        const type = c.getAttribute('data-filter');
        if (c.getAttribute('data-value') === '全部') {
            c.classList.add('active');
        } else {
            c.classList.remove('active');
        }
    });
    document.querySelectorAll('.card[data-faction]').forEach(card => {
        card.style.display = '';
    });

    // 重置技能页分类筛选
    document.querySelectorAll('.filter-chip[data-perk-filter]').forEach(c => {
        if (c.getAttribute('data-perk-filter') === 'all') {
            c.classList.add('active');
        } else {
            c.classList.remove('active');
        }
    });
    const survivorSection = document.getElementById('survivor-perks');
    const killerSection = document.getElementById('killer-perks');
    if (survivorSection) survivorSection.style.display = '';
    if (killerSection) killerSection.style.display = '';
}

// ========== 技能页分类筛选（全部/逃生者/屠夫） ==========
function initPerkFilter() {
    const chips = document.querySelectorAll('.filter-chip[data-perk-filter]');
    if (chips.length === 0) return;

    const survivorSection = document.getElementById('survivor-perks');
    const killerSection = document.getElementById('killer-perks');

    chips.forEach(chip => {
        chip.addEventListener('click', function () {
            chips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');

            const value = this.getAttribute('data-perk-filter');
            if (survivorSection) survivorSection.style.display = (value === 'all' || value === 'survivor') ? '' : 'none';
            if (killerSection) killerSection.style.display = (value === 'all' || value === 'killer') ? '' : 'none';
        });
    });
}

// ========== 平滑滚动定位 ==========
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.length <= 1) return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                scrollToElement(target);
            }
        });
    });
}
