const INVITE_URL = 'https://www.gtohfmmy.com/join/52900164';
const IS_DEMO_MODE = typeof location !== 'undefined' && (location.protocol === 'file:' || !location.hostname.includes('github.io')); // 直接打开或非GitHub Pages域名时启用
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'; // CORS代理服务，用于GitHub Pages环境

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const cta = document.getElementById('cta-register');
  if (cta) cta.href = INVITE_URL;

  // 将站内引导链接统一指向邀请链接，但保留资讯区域原始链接
  const allLinks = Array.from(document.querySelectorAll('a'));
  for (const a of allLinks) {
    const inNews = a.closest('#news') || a.closest('#news-list');
    // 保留资讯区域原始链接
    if (inNews) {
      continue;
    }
    // 非资讯区域链接改为跳邀请
    a.href = INVITE_URL;
    a.target = '_blank';
    a.rel = 'nofollow noopener';
  }

  if (IS_DEMO_MODE) {
    markDemoMode();
  }
  loadTrending();
  loadNews();
  initStarsBackground();
  embedBTCChart();
  embedTicker();
  // 每60秒刷新热门币（本地/线上均启用）
  setInterval(() => { loadTrending(); }, 60000);
  // 每10秒刷新热门币价格（本地/线上均启用）
  setInterval(() => { refreshTrendingPrices(); }, 10000);
});

async function loadTrending() {
  const list = document.getElementById('trending-list');
  if (!list) return;
  try {
    // 实时：固定四个主流币（BTC/ETH/SOL/BNB）
    const ids = ['bitcoin','ethereum','solana','binancecoin'];
    const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&per_page=4&page=1&price_change_percentage=24h`;
    // 检查是否在GitHub Pages环境，如果是则使用CORS代理
    const isGitHubPages = typeof location !== 'undefined' && location.hostname.includes('github.io');
    const url = isGitHubPages ? CORS_PROXY + apiUrl : apiUrl;
    
    // 设置合理的fetch选项，包含超时处理
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 10000 // 10秒超时
    };
    
    const res = await Promise.race([
      fetch(url, fetchOptions),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 10000))
    ]);
    const data = await res.json();
    list.innerHTML = data.map((item) => renderMarketCoin(item)).join('');
    // 渲染后统一将卡片内链接指向邀请
    for (const a of list.querySelectorAll('a')) {
      a.href = INVITE_URL;
      a.target = '_blank';
      a.rel = 'nofollow noopener';
    }
    // 在 li 上标注 coin id（从渲染出的 span 获取，避免索引错位）
    const lis = Array.from(list.querySelectorAll('li'));
    lis.forEach((li) => {
      const span = li.querySelector('.price-value');
      const id = span?.getAttribute('data-id');
      if (id) li.dataset.coinId = id;
    });
  } catch (e) {
    console.error('loadTrending failed:', e);
    const demo = getDemoTrending();
    list.innerHTML = demo.map(item => renderCoin(item)).join('');
    for (const a of list.querySelectorAll('a')) {
      a.href = INVITE_URL;
      a.target = '_blank';
      a.rel = 'nofollow noopener';
    }
  }
}

function renderCoin(item) {
  const price = item.data?.price || 0;
  const change24h = item.data?.price_change_percentage_24h?.usd ?? 0;
  const changeCls = change24h >= 0 ? 'up' : 'down';
  return `
    <li>
      <div class="coin">
        <div class="name">
          <img src="${item.large}" alt="${item.name}">
          <div>${item.name} <span style="color:#95a3c6">(${item.symbol?.toUpperCase?.() || ''})</span></div>
        </div>
        <div class="price ${changeCls}"><span class="price-value" data-id="${item.id || ''}">$${Number(price).toFixed(4)}</span></div>
      </div>
      <div class="chg ${changeCls}">24h: <span class="chg-value" data-id="${item.id || ''}">${Number(change24h).toFixed(2)}%</span></div>
      <div class="coin-actions">
        <a class="btn btn-primary" href="${INVITE_URL}" target="_blank" rel="nofollow noopener">查看</a>
      </div>
    </li>`;
}

function renderMarketCoin(m) {
  const price = m.current_price ?? 0;
  const change24h = m.price_change_percentage_24h ?? 0;
  const changeCls = change24h >= 0 ? 'up' : 'down';
  return `
    <li>
      <div class="coin">
        <div class="name">
          <img src="${m.image}" alt="${m.name}">
          <div>${m.name} <span style="color:#95a3c6">(${(m.symbol || '').toUpperCase()})</span></div>
        </div>
        <div class="price ${changeCls}"><span class="price-value" data-id="${m.id}">$${Number(price).toFixed(4)}</span></div>
      </div>
      <div class="chg ${changeCls}">24h: <span class="chg-value" data-id="${m.id}">${Number(change24h).toFixed(2)}%</span></div>
      <div class="coin-actions">
        <a class="btn btn-primary" href="${INVITE_URL}" target="_blank" rel="nofollow noopener">查看</a>
      </div>
    </li>`;
}

async function refreshTrendingPrices() {
  const list = document.getElementById('trending-list');
  if (!list) return;
  const ids = Array.from(list.querySelectorAll('li'))
    .map(li => li.dataset.coinId || li.querySelector('.price-value')?.getAttribute('data-id'))
    .filter(Boolean);
  if (ids.length === 0) return;
  const uniqIds = Array.from(new Set(ids));
  const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniqIds.join(','))}&vs_currencies=usd&include_24hr_change=true`;
    // 检查是否在GitHub Pages环境，如果是则使用CORS代理
    const isGitHubPages = typeof location !== 'undefined' && location.hostname.includes('github.io');
    const url = isGitHubPages ? CORS_PROXY + apiUrl : apiUrl;
  try {
    const res = await fetch(url);
    const data = await res.json();
    for (const id of uniqIds) {
      const priceEl = list.querySelector(`.price-value[data-id="${id}"]`);
      const chgEl = list.querySelector(`.chg-value[data-id="${id}"]`);
      const item = data[id];
      if (item && priceEl) priceEl.textContent = `$${Number(item.usd || 0).toFixed(4)}`;
      if (item && chgEl) {
        const val = Number(item.usd_24h_change || 0);
        chgEl.textContent = `${val.toFixed(2)}%`;
        const chgWrap = chgEl.closest('.chg');
        if (chgWrap) {
          chgWrap.classList.toggle('up', val >= 0);
          chgWrap.classList.toggle('down', val < 0);
        }
        const priceWrap = priceEl ? priceEl.closest('.price') : null;
        if (priceWrap) {
          priceWrap.classList.toggle('up', val >= 0);
          priceWrap.classList.toggle('down', val < 0);
          // 兜底：若样式仍未生效，为值本身加内联颜色（最后退路）
          priceEl.style.color = val >= 0 ? '#16c784' : '#ea3943';
          chgEl.style.color = val >= 0 ? '#16c784' : '#ea3943';
        }
      }
    }
  } catch (_) {
    // 忽略增量刷新失败，等待下次
  }
}

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;
  // 资讯源：仅使用 Cointelegraph RSS，通过 r.jina.ai 代理规避 CORS
  const sources = [
    'https://cointelegraph.com/rss'
  ];
  try {
    // 检查是否在GitHub Pages环境，如果是则使用CORS代理
    const isGitHubPages = typeof location !== 'undefined' && location.hostname.includes('github.io');
    const crosProxyUrl = isGitHubPages ? CORS_PROXY : '';
    
    const fetched = await Promise.allSettled(
      sources.map(src => {
        const fetchUrl = `${crosProxyUrl}https://r.jina.ai/${src}`;
        return fetch(fetchUrl, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
      })
    );
    const texts = await Promise.all(
      fetched.filter(x => x.status === 'fulfilled').map(x => x.value.text())
    );
    let items = texts.flatMap(t => parseRSSItems(t));
    if (!items || items.length === 0) {
      throw new Error('empty rss');
    }
    items = items.slice(0, 4); // 最多显示 4 个
    list.innerHTML = items.map(n => renderNewsCard({ ...n, link: INVITE_URL })).join('');
  } catch (e) {
    const demo = getDemoNews().slice(0, 4);
    list.innerHTML = demo.map(n => renderNewsCard({ ...n, link: INVITE_URL })).join('');
  }
}

function parseRSSItems(xmlText) {
  const items = [];
  // CDATA 标题，优先取 link，否则取 guid；尝试解析 enclosure/media 图片
  const cdata = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?(?:<link>(.*?)<\/link>|<guid.*?>(.*?)<\/guid>)[\s\S]*?<\/item>/g;
  let m;
  while ((m = cdata.exec(xmlText)) !== null) {
    const block = m[0];
    const title = m[1];
    const link = m[2] || m[3] || '#';
    const img = extractImg(block);
    items.push({ title, link, img });
  }
  // 非 CDATA 标题
  const plain = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?(?:<link>(.*?)<\/link>|<guid.*?>(.*?)<\/guid>)[\s\S]*?<\/item>/g;
  while ((m = plain.exec(xmlText)) !== null) {
    const block = m[0];
    const raw = m[1] || '';
    const title = raw.replace(/<[^>]+>/g, '');
    const link = m[2] || m[3] || '#';
    const img = extractImg(block);
    if (title) items.push({ title, link, img });
  }
  return items;
}

function extractImg(block) {
  // enclosure url
  const enc = /<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i.exec(block);
  if (enc && enc[1]) return enc[1];
  // media:content url
  const media = /<media:content[^>]*url=["']([^"']+)["'][^>]*>/i.exec(block);
  if (media && media[1]) return media[1];
  // img in description/content
  const img = /<img[^>]*src=["']([^"']+)["'][^>]*>/i.exec(block);
  if (img && img[1]) return img[1];
  return '';
}

function renderNewsCard(n) {
  const img = n.img || '';
  const safeTitle = (n.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <li class="news-card">
      <a href="${n.link || '#'}" target="_blank" rel="nofollow noopener" class="${img ? 'has-thumb' : ''}">
        ${img ? `<div class="news-thumb"><img src="${img}" alt="" loading="lazy"/></div>` : ''}
        <div class="news-content">${safeTitle}</div>
      </a>
    </li>
  `;
}

function embedBTCChart() {
  const chart = document.querySelector('.tv-chart');
  if (!chart) return;
  const s3 = document.createElement('script');
  s3.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  s3.async = true;
  s3.innerHTML = JSON.stringify({
    autosize: false,
    height: 760,
    width: '100%',
    symbol: 'BINANCE:BTCUSDT',
    interval: '60',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'zh_CN',
    allow_symbol_change: false,
    hide_top_toolbar: false,
    hide_legend: false
  });
  try { chart.appendChild(s3); } catch (_) { /* ignore */ }
}

function embedTicker() {
  const ticker = document.querySelector('.tv-ticker');
  if (!ticker) return;
  const s = document.createElement('script');
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
  s.async = true;
  s.innerHTML = JSON.stringify({
    symbols: [
      { proName: 'BINANCE:BTCUSDT', title: 'BTC/USDT' },
      { proName: 'BINANCE:ETHUSDT', title: 'ETH/USDT' },
      { proName: 'BINANCE:SOLUSDT', title: 'SOL/USDT' },
      { proName: 'BINANCE:BNBUSDT', title: 'BNB/USDT' }
    ],
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: true,
    displayMode: 'adaptive'
  });
  try { ticker.appendChild(s); } catch (_) { /* ignore */ }
}

// 星空连线背景（轻量，无依赖）
function initStarsBackground() {
  const canvas = document.getElementById('bg-stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  const stars = Array.from({ length: Math.min(120, Math.floor(width * height / 15000)) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.6 + 0.2
  }));
  function step() {
    ctx.clearRect(0, 0, width, height);
    // draw lines
    for (let i = 0; i < stars.length; i++) {
      const a = stars[i];
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 120*120) {
          ctx.strokeStyle = 'rgba(91,140,255,0.10)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    // draw points and move
    for (const s of stars) {
      ctx.fillStyle = 'rgba(230,236,255,0.9)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0 || s.x > width) s.vx *= -1;
      if (s.y < 0 || s.y > height) s.vy *= -1;
    }
    requestAnimationFrame(step);
  }
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
  step();
}

function markDemoMode() {
  const header = document.querySelector('.site-header .container');
  if (!header) return;
  const badge = document.createElement('span');
  badge.textContent = '演示模式';
  badge.style.marginLeft = '12px';
  badge.style.padding = '2px 8px';
  badge.style.border = '1px solid #1b2439';
  badge.style.borderRadius = '8px';
  badge.style.color = '#95a3c6';
  badge.style.fontSize = '12px';
  header.appendChild(badge);
}

function getDemoTrending() {
  return [
    { name: 'Bitcoin', symbol: 'BTC', large: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', data: { price: 68000, price_change_percentage_24h: { usd: 1.23 } } },
    { name: 'Ethereum', symbol: 'ETH', large: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', data: { price: 3500, price_change_percentage_24h: { usd: -0.85 } } },
    { name: 'Solana', symbol: 'SOL', large: 'https://assets.coingecko.com/coins/images/4128/large/Solana.png', data: { price: 160, price_change_percentage_24h: { usd: 2.5 } } },
    { name: 'BNB', symbol: 'BNB', large: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', data: { price: 600, price_change_percentage_24h: { usd: 0.4 } } }
  ].map(x => ({ id: x.symbol, ...x }));
}

function getDemoNews() {
  return [
    { title: '快讯：BTC 突破关键压力位，资金流入抬升', link: '#' },
    { title: '市场观察：ETH 链上活跃回升，Gas 费用回落', link: '#' },
    { title: '生态进展：SOL 生态新项目空投预告与交互指南', link: '#' },
    { title: '风控提示：谨防钓鱼空投与恶意合约授权', link: '#' },
    { title: '宏观视角：风险资产联动上行，关注利率预期变化', link: '#' },
    { title: '数据面：稳定币净流入扩大，交易所准备金稳定', link: '#' },
    { title: '项目周报：Layer2 活跃度提升，跨链桥资金回流', link: '#' },
    { title: '社区：热门叙事切换迹象，关注新赛道早期机会', link: '#' }
  ];
}


