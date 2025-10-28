const INVITE_URL = 'https://www.gtohfmmy.com/join/52900164';
// 环境检测：本地文件协议、非GitHub Pages域名或IP地址访问时启用
const IS_DEMO_MODE = typeof location !== 'undefined' && 
  (location.protocol === 'file:' || 
   !location.hostname.includes('github.io') || 
   /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\d+\.\d+\.\d+\.\d+)$/.test(location.hostname));

// 多CORS代理备选方案，提高稳定性
const CORS_PROXIES = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://cors-proxy.htmldriven.com/?url='
];

// 当前使用的代理索引
let currentProxyIndex = 0;

// 获取当前可用的CORS代理
function getCurrentCORSProxy() {
  return CORS_PROXIES[currentProxyIndex];
}

// 切换到下一个CORS代理
function switchToNextProxy() {
  currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
  console.log(`切换到备用CORS代理: ${getCurrentCORSProxy()}`);
}

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
  // 先初始化所有视觉组件
  initStarsBackground();
  embedBTCChart();
  embedTicker();
  loadNews();
  
  // 延迟加载加密货币数据，确保TradingView组件有足够时间加载
  setTimeout(() => {
    loadTrending();
    console.log('延迟加载加密货币数据，确保TradingView组件已初始化');
  }, 2000); // 2秒延迟
  // 每60秒刷新热门币（本地/线上均启用）
  setInterval(() => { loadTrending(); }, 60000);
  // 每10秒刷新热门币价格（本地/线上均启用）
  setInterval(() => { refreshTrendingPrices(); }, 10000);
});

// 尝试使用指定的代理获取数据
async function fetchWithProxy(apiUrl, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      // 检查是否在GitHub Pages环境或需要代理的环境
      const needsProxy = typeof location !== 'undefined' && 
        (location.hostname.includes('github.io') || 
         /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\d+\.\d+\.\d+\.\d+)$/.test(location.hostname));
      
      let url = apiUrl;
      if (needsProxy) {
        const proxy = getCurrentCORSProxy();
        url = proxy + encodeURIComponent(apiUrl);
        console.log(`使用代理${proxy}访问: ${apiUrl}`);
      } else {
        console.log(`直接访问: ${apiUrl}`);
      }
      
      // 设置合理的fetch选项，包含超时处理
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'omit', // 不发送凭证，减少跨域问题
        timeout: 10000 // 10秒超时
      };
      
      const res = await Promise.race([
        fetch(url, fetchOptions),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 10000))
      ]);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      return data;
    } catch (e) {
      retries++;
      console.warn(`尝试 ${retries} 失败:`, e.message);
      
      // 如果还有重试次数，切换到下一个代理
      if (retries < maxRetries) {
        switchToNextProxy();
        // 每次重试前等待一段时间，避免频繁请求
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      } else {
        // 所有重试都失败了
        throw e;
      }
    }
  }
}

async function loadTrending() {
  const list = document.getElementById('trending-list');
  if (!list) return;
  
  try {
    // 实时：固定四个主流币（BTC/ETH/SOL/BNB）
    const ids = ['bitcoin','ethereum','solana','binancecoin'];
    const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&per_page=4&page=1&price_change_percentage=24h`;
    
    // 尝试使用代理获取数据，最多重试3次
    const data = await fetchWithProxy(apiUrl);
    
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
    
    console.log('热门加密币数据加载成功');
  } catch (e) {
    console.error('loadTrending 所有尝试都失败:', e);
    
    // 如果在GitHub Pages环境下失败，提供更友好的模拟数据
    const isGitHubPages = typeof location !== 'undefined' && location.hostname.includes('github.io');
    if (isGitHubPages) {
      console.log('在GitHub Pages环境下使用本地缓存的模拟数据');
    }
    
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
  
  try {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniqIds.join(','))}&vs_currencies=usd&include_24hr_change=true`;
    
    // 尝试使用代理获取数据，但只重试1次以避免频繁请求
    const data = await fetchWithProxy(apiUrl, 1);
    
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

// 智能模拟数据生成器 - 基于TradingView数据或历史趋势
function getSmartDemoTrending() {
  // 基础价格（尽量接近市场水平）
  const basePrices = {
    btc: 68000,
    eth: 3500,
    sol: 160,
    bnb: 600
  };
  
  // 从TradingView ticker尝试提取数据
  // 添加延迟重试机制，确保有足够时间等待TradingView加载完成
  const tradingViewData = extractDataFromTradingViewWithRetry();
  
  // 如果从TradingView获取到数据，使用这些数据
  if (tradingViewData && Object.keys(tradingViewData).length > 0) {
    console.log('使用从TradingView提取的数据');
    return Object.entries(tradingViewData).map(([symbol, data]) => ({
      id: symbol.toLowerCase(),
      name: symbol === 'btc' ? 'Bitcoin' : symbol === 'eth' ? 'Ethereum' : symbol === 'sol' ? 'Solana' : 'BNB',
      symbol: symbol.toUpperCase(),
      large: `https://assets.coingecko.com/coins/images/${
        symbol === 'btc' ? '1' : symbol === 'eth' ? '279' : symbol === 'sol' ? '4128' : '825'
      }/large/${
        symbol === 'btc' ? 'bitcoin' : symbol === 'eth' ? 'ethereum' : symbol === 'sol' ? 'Solana' : 'bnb-icon2_2x'
      }.png`,
      data: {
        price: data.price,
        price_change_percentage_24h: { usd: data.change24h }
      }
    }));
  }
  
  // 否则生成智能模拟数据（基于基础价格和随机波动）
  console.log('所有TradingView数据提取尝试均失败，生成智能模拟数据');
  const timestamp = Date.now();
  // 使用时间戳作为种子，使价格在一定时间内相对稳定
  const seed = Math.floor(timestamp / 300000); // 每5分钟更新一次趋势
  
  return [
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      large: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      data: {
        // 使用正弦函数模拟价格波动趋势
        price: basePrices.btc * (1 + 0.02 * Math.sin(seed * 0.1)),
        price_change_percentage_24h: { usd: 2 * Math.sin(seed * 0.05) }
      }
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      large: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      data: {
        price: basePrices.eth * (1 + 0.03 * Math.sin(seed * 0.12)),
        price_change_percentage_24h: { usd: 2.5 * Math.sin(seed * 0.06) }
      }
    },
    {
      name: 'Solana',
      symbol: 'SOL',
      large: 'https://assets.coingecko.com/coins/images/4128/large/Solana.png',
      data: {
        price: basePrices.sol * (1 + 0.05 * Math.sin(seed * 0.15)),
        price_change_percentage_24h: { usd: 3 * Math.sin(seed * 0.08) }
      }
    },
    {
      name: 'BNB',
      symbol: 'BNB',
      large: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
      data: {
        price: basePrices.bnb * (1 + 0.02 * Math.sin(seed * 0.08)),
        price_change_percentage_24h: { usd: 1.5 * Math.sin(seed * 0.04) }
      }
    }
  ].map(x => ({ id: x.symbol, ...x }));
}

// 带重试机制的TradingView数据提取函数
function extractDataFromTradingViewWithRetry(maxAttempts = 3, retryDelay = 500) {
  let attempts = 0;
  let result = null;
  
  while (attempts < maxAttempts && !result) {
    attempts++;
    
    try {
      // 在控制台记录当前尝试
      if (attempts > 1) {
        console.log(`尝试从TradingView提取数据 (尝试 ${attempts}/${maxAttempts})`);
      }
      
      result = extractDataFromTradingView();
      
      // 如果成功提取到数据，返回结果
      if (result && Object.keys(result).length > 0) {
        return result;
      }
      
      // 如果未成功且还有尝试次数，等待一段时间
      if (attempts < maxAttempts) {
        // 使用同步方式等待（在非UI阻塞的情况下）
        const startTime = Date.now();
        while (Date.now() - startTime < retryDelay) {
          // 空循环等待，避免过多的异步操作
        }
      }
    } catch (e) {
      console.error(`从TradingView提取数据时出错（尝试 ${attempts}）:`, e);
    }
  }
  
  console.log(`TradingView数据提取失败（尝试了${attempts}次）`);
  return null;
}

// 尝试从TradingView的ticker组件提取数据 - 增强版
function extractDataFromTradingView() {
  try {
    // 策略1: 尝试从TradingView ticker组件直接提取
    let result = tryExtractFromTicker();
    if (result && Object.keys(result).length > 0) {
      console.log('策略1成功: 从TradingView ticker提取数据');
      return result;
    }
    
    // 策略2: 尝试从TradingView图表组件提取BTC价格
    result = tryExtractFromChart();
    if (result && Object.keys(result).length > 0) {
      console.log('策略2成功: 从TradingView图表提取数据');
      return result;
    }
    
    // 策略3: 尝试从页面上所有可能包含加密货币价格的元素中提取
    result = tryExtractFromAllElements();
    if (result && Object.keys(result).length > 0) {
      console.log('策略3成功: 从页面元素中提取数据');
      return result;
    }
    
    console.log('所有数据提取策略均失败');
  } catch (e) {
    console.error('从TradingView提取数据时发生异常:', e);
  }
  
  return null;
}

// 策略1: 尝试从TradingView ticker组件直接提取
function tryExtractFromTicker() {
  const result = {};
  
  // 定义多种可能的选择器模式
  const selectorPatterns = [
    { price: '[class*="ticker"][class*="item"] [class*="value"]', change: '[class*="ticker"][class*="item"] [class*="change"]' },
    { price: '[data-symbol*="BTC"] [class*="price"]', change: '[data-symbol*="BTC"] [class*="change"]' },
    { price: '.tv-ticker [class*="value"]', change: '.tv-ticker [class*="change"]' }
  ];
  
  for (const pattern of selectorPatterns) {
    const priceElements = document.querySelectorAll(pattern.price);
    const changeElements = document.querySelectorAll(pattern.change);
    
    if (priceElements.length >= 1 && changeElements.length >= 1) {
      // 提取找到的第一个BTC价格和变化率
      const priceText = priceElements[0]?.textContent || '';
      const changeText = changeElements[0]?.textContent || '';
      
      // 价格格式可能不同，尝试多种解析方式
      const price = parsePrice(priceText);
      const change = parseChange(changeText);
      
      if (price > 0) {
        // 如果找到了BTC价格，至少返回BTC数据
        result.btc = { price: price, change24h: change };
        // 尝试提取其他币种数据
        if (priceElements.length >= 2 && changeElements.length >= 2) {
          result.eth = { price: parsePrice(priceElements[1]?.textContent || ''), change24h: parseChange(changeElements[1]?.textContent || '') };
        }
        if (priceElements.length >= 3 && changeElements.length >= 3) {
          result.sol = { price: parsePrice(priceElements[2]?.textContent || ''), change24h: parseChange(changeElements[2]?.textContent || '') };
        }
        if (priceElements.length >= 4 && changeElements.length >= 4) {
          result.bnb = { price: parsePrice(priceElements[3]?.textContent || ''), change24h: parseChange(changeElements[3]?.textContent || '') };
        }
        
        // 过滤掉无效数据
        Object.keys(result).forEach(key => {
          if (result[key].price <= 0) {
            delete result[key];
          }
        });
        
        return result;
      }
    }
  }
  
  return null;
}

// 策略2: 尝试从TradingView图表组件提取BTC价格
function tryExtractFromChart() {
  const result = {};
  
  // 查找可能包含BTC价格的元素
  const chartContainers = document.querySelectorAll('.tv-chart, [class*="chart-container"]');
  if (chartContainers.length > 0) {
    for (const container of chartContainers) {
      // 查找容器内所有文本节点
      const allText = container.innerText;
      // 尝试匹配价格模式 (如: $68,000.00 或 68000.00 USD)
      const priceMatch = allText.match(/\$?\s*(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)\s*USD?/i);
      if (priceMatch && priceMatch[1]) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (price > 1000) { // BTC价格不太可能低于1000
          result.btc = { price: price, change24h: 0 };
          return result;
        }
      }
    }
  }
  
  return null;
}

// 策略3: 尝试从页面上所有可能包含加密货币价格的元素中提取
function tryExtractFromAllElements() {
  const result = {};
  
  // 查找所有包含BTC、ETH、SOL、BNB文本的元素
  const cryptoKeywords = ['BTC', 'ETH', 'SOL', 'BNB'];
  
  cryptoKeywords.forEach((keyword, index) => {
    const elements = document.querySelectorAll(`[class*="${keyword.toLowerCase()}"], [id*="${keyword.toLowerCase()}"], [data-symbol*="${keyword}"]`);
    
    for (const element of elements) {
      const text = element.innerText;
      // 尝试从相邻元素或父元素中查找价格
      const parentText = element.parentElement?.innerText || '';
      const siblingText = Array.from(element.parentElement?.children || [])
        .map(el => el.innerText)
        .join(' ');
      
      const combinedText = `${text} ${parentText} ${siblingText}`;
      const price = parsePrice(combinedText);
      const change = parseChange(combinedText);
      
      if (price > 0) {
        const symbol = keyword.toLowerCase();
        result[symbol] = { price: price, change24h: change };
        // 对于每个关键词，找到一个有效价格就足够了
        break;
      }
    }
  });
  
  return Object.keys(result).length > 0 ? result : null;
}

// 解析价格文本的辅助函数
function parsePrice(text) {
  if (!text) return 0;
  
  // 尝试多种价格格式: $68,000.00, 68000.00, 68k USD等
  const pricePatterns = [
    /\$?\s*(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)\s*USD?/i,  // $68,000.00 或 68000.00 USD
    /(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)\s*\$/i,          // 68,000.00 $
    /(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)\s*(?:usd)?\b/i,   // 68,000.00 或 68,000.00 usd
    /\b(\d{4,})\b/                                        // 至少4位数字（加密货币价格通常较高）
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0) {
        return price;
      }
    }
  }
  
  return 0;
}

// 解析24小时变化率的辅助函数
function parseChange(text) {
  if (!text) return 0;
  
  // 尝试多种变化率格式: +1.23%, -0.85%, 1.23%等
  const changePattern = /([+-]?\d+(?:\.\d{1,2})?)%/;
  const match = text.match(changePattern);
  
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  
  return 0;
}

// 保持向后兼容
function getDemoTrending() {
  return getSmartDemoTrending();
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


