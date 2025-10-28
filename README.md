# oyix 静态网站

简洁的币圈资讯与实时行情落地页，包含：
- 英雄区 CTA（跳转你的邀请链接）
- 热门加密币（CoinGecko Trending）
- 行情组件（TradingView：行情条 + 市场筛选器）
- 资讯速览（CryptoPanic RSS 解析）
- 基础 SEO（robots.txt、sitemap.xml、OG meta）

## 目录结构
- `index.html` 主页
- `styles.css` 样式
- `script.js` 交互与数据源
- `robots.txt`、`sitemap.xml` SEO 文件
- `assets/` 存放图标、OG 图

## 设置邀请链接
编辑 `script.js`，将占位替换为你的邀请链接：
```js
const INVITE_URL = 'https://www.okx.com/join/<your-code>';
```

## 本地预览
```bash
# 任意静态服务器均可，以 Python 为例
python3 -m http.server 5173
# 浏览器访问 http://localhost:5173
```

## 部署
- Vercel：导入本仓库 → Framework 选择 `Other` → 部署
- Netlify：Drag & Drop 上传或连接仓库 → 部署
- Nginx：将仓库内容拷贝至站点根目录，示例：
```nginx
server {
  listen 80;
  server_name your-domain.example;
  root /var/www/oyix;
  index index.html;
  location / { try_files $uri $uri/ =404; }
}
```

## SEO 提示
- 将 `index.html` 中 `og:url`、`og:image` 和 `sitemap.xml`、`robots.txt` 的域名改为你的真实域名
- 提交站点地图至 Google Search Console / 百度搜索资源平台
- 避免使用“欧易官方”等措辞，保留“与任何交易所无直接关联”的声明

## 合规与风险
- 本站不提供投资建议；明确邀请链接为合作推广
- 注意第三方 API 变动；若被限流可更换数据源
