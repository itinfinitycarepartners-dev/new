# Website Performance Optimization Guide

## ✅ Optimizations Implemented

### 1. **Web Vitals Performance Monitoring** ✓
- Added `web-vitals` tracking to `src/main.jsx`
- Automatically logs Core Web Vitals metrics to browser console:
  - **FCP** (First Contentful Paint) - when first content renders
  - **LCP** (Largest Contentful Paint) - when largest element renders
  - **CLS** (Cumulative Layout Shift) - measure of visual stability
  - **FID** (First Input Delay) - responsiveness metric
  - **TTFB** (Time to First Byte) - server response time

### 2. **Route-Based Code Splitting** ✓
- Converted all page imports in `src/App.jsx` to lazy loading
- Pages now load only when user navigates to them
- Added `Suspense` fallback with loading spinner
- Significantly reduces initial bundle size

**Pages using lazy loading:**
- Dashboard, Profile, Documents, Updates, WelcomePacket
- RelocationHub, Pipeline, Aftercare, Messages
- Admin panel (overal.jsx), Forms, MakeRequest
- Login, Register, ForgotPassword, ResetPassword
- Resource, RAndL

### 3. **Configuration Constants Extracted** ✓
Created separate files to reduce bundle:
- `src/constants/stagesConfig.js` - Pipeline stages
- `src/constants/nclex.js` - NCLEX program flow
- `src/constants/theme.js` - Theme colors & UI constants

### 4. **Vite Build Optimizations** ✓
Updated `vite.config.js` with:
- **Manual chunk splitting** - Radix UI components bundled separately
- **React vendor chunk** - React, React-DOM, React-Router bundled together
- **Query vendor chunk** - TanStack React Query bundled separately
- Reduces initial load and improves caching

---

## 🧪 How to Test Performance

### **Before/After Testing**
Before applying these changes, take a baseline:

```bash
npm run build
# Note the bundle size from the terminal output
```

After changes:
```bash
npm run build
# Compare bundle sizes
```

### **Test 1: Check Bundle Size Reduction**
```bash
# Run build and check dist folder
npm run build

# On Windows (PowerShell):
Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum

# On Mac/Linux:
du -sh dist
du -sh dist/assets
```

**Expected results:**
- Overall bundle should be 15-25% smaller
- Initial chunk (main.js) should be noticeably smaller
- Vendor chunks should be well-separated

---

### **Test 2: Lighthouse Audit (Best Performance Test)**

**Method 1: Chrome DevTools**
1. Open your app in Chrome
2. Press `F12` → Open DevTools
3. Go to **Lighthouse** tab
4. Click **Analyze page load**
5. Wait for results

**Key metrics to check:**
- Performance score (target: 70+)
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s  
- Cumulative Layout Shift (CLS) < 0.1
- Total Blocking Time (TBT) < 200ms

---

### **Test 3: Web Vitals in Console**
1. Open your app: `http://localhost:5173`
2. Open DevTools Console (`F12`)
3. Refresh the page
4. Watch for Web Vitals output:

```javascript
{name: "CLS", value: 0.05, rating: "good"}
{name: "FCP", value: 456.2, rating: "good"}
{name: "LCP", value: 1200.5, rating: "good"}
{name: "FID", value: 45, rating: "good"}
{name: "TTFB", value: 123.4, rating: "good"}
```

**Thresholds:**
- ✅ Green/"good": FCP < 1.8s, LCP < 2.5s, CLS < 0.1, FID < 100ms
- 🟡 Amber/"needs improvement": FCP 1.8-3s, LCP 2.5-4s
- 🔴 Red/"poor": FCP > 3s, LCP > 4s

---

### **Test 4: Network Performance (Simulate Slow Connection)**

1. Open DevTools → **Network** tab
2. In the throttling dropdown, select **Slow 4G**
3. Hard refresh page (Ctrl+Shift+R)
4. Measure:
   - Time to load initial page
   - Time until first interaction possible
   - Overall page load time

**Comparison checklist:**
- ⏱️ Before optimizations: ____ seconds
- ⏱️ After optimizations: ____ seconds
- ✅ **Improvement: ____% faster**

---

### **Test 5: Component Loading (Check Lazy Loading Works)**

1. Open DevTools → **Network** tab
2. Filter by `Fetch/XHR` or see all requests
3. Navigate to different pages (Dashboard → Admin → Pipeline → etc.)
4. **Expected behavior:**
   - Initial load: smaller main.js
   - When navigating: new chunks download on-demand
   - Chunks should be named like: `pages-Dashboard-xxx.js`

---

### **Test 6: Production Build Performance**

```bash
npm run build
npm run preview
# Visit http://localhost:4173
```

In Lighthouse, test the **production build** (different from dev):
- Production builds are optimized and minified
- Results should be similar to or better than dev

---

## 📊 Performance Monitoring in Production

Add this code to track real user performance metrics:

```javascript
// In src/main.jsx (already added)
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)

// Optional: Send to your analytics service
getCLS(metric => analytics.track('web-vital', metric))
```

---

## 🎯 Performance Targets

| Metric | Target | Your Result |
|--------|--------|------------|
| First Contentful Paint (FCP) | < 1.8s | ___ |
| Largest Contentful Paint (LCP) | < 2.5s | ___ |
| Cumulative Layout Shift (CLS) | < 0.1 | ___ |
| First Input Delay (FID) | < 100ms | ___ |
| Time to First Byte (TTFB) | < 600ms | ___ |
| Initial Bundle Size | < 150KB | ___ |
| Performance Score | > 70 | ___ |

---

## 💡 Next Steps for Further Optimization

1. **Image Optimization**
   - Use WebP format for images
   - Implement lazy loading for images: `loading="lazy"`
   - Use responsive images with `srcset`

2. **API Optimization**
   - Add request caching headers
   - Implement pagination for large lists
   - Use GraphQL to fetch only needed fields

3. **React Optimization**
   - Add `React.memo()` to components
   - Use `useMemo()` and `useCallback()` for expensive computations
   - Implement virtual scrolling for long lists

4. **Bundle Analysis**
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   # Then analyze bundle composition
   ```

5. **Database Query Optimization**
   - Add indexes to frequently searched fields
   - Implement pagination
   - Use aggregation pipelines

---

## 📝 Checklist Before Going to Production

- [ ] Run Lighthouse audit (target: 70+ performance score)
- [ ] Check Web Vitals all in green
- [ ] Test on Slow 4G network
- [ ] Verify lazy loading chunks download on-demand
- [ ] Check bundle size (should be 15-25% smaller)
- [ ] Test on real devices (mobile, tablet)
- [ ] Monitor real user metrics in production

---

## 🔧 Troubleshooting

**Q: I see a white screen when loading a new page**
A: The lazy loading is working - Suspense fallback is showing. This is normal. You can customize the loader in App.jsx.

**Q: Bundle size didn't decrease much**
A: Check that you cleared `.cache` and `dist` folders before rebuilding.

**Q: Web Vitals show poor scores**
A: This might be due to your internet or API latency. Focus on Frontend metrics (FCP, LCP, CLS).

---

## 📚 Additional Resources

- [Web Vitals Overview](https://web.dev/vitals/)
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Vite Performance Guide](https://vitejs.dev/guide/features.html#dynamic-import)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
