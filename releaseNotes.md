## 1.4.0
ADDED Many Features and cacheing didnt focus much on finer optimisation

## 1.5.0 (Upcoming Optimizations)
AIM TO MAKE THE BROWSER SMALLER AND FASTER
### 🚀 High-Impact Rocket Fuel (P1)
- [ ] **Optimize Browser Size**

### ⚡ Performance Boosters (P2)
- [ ] **TabState Modernization**  
  Refactor loops in `tabState/task.js`
- [ ] **Process Spawn Optimization**  
  Add `stdio: 'ignore'` to `util/process.js`
- [ ] **Optimize Database Queries**
  Improve performance of history and bookmark searches aand learn it

### 🧼 Cleanup Crew (P3)
- [ ] **Icon SVG Conversion**  
  Optimize `icons/source/` with SVGO or woff
- [ ] **Duplicate Code Merge**  
  Combine `tabState.js` + `tabState/task.js`
- [ ] **Update Deps to latest version with proper testing**  
- [ ] **Remove Errors**  
- fix visiblity of some icons


# 1.5.0

- Removed Bootstrap ,Daisy UI
- Made Localisation Optional
- Removed all telemetry to not pollute upstream stats
- Added Perfs 