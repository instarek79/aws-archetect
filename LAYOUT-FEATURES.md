# Layout & Context Menu Features - Complete Guide

## ✅ Changes Implemented

### 1. **Removed Auto AI Layout Trigger**
- **Before:** Creating a relationship automatically triggered AI layout
- **After:** Relationships are created without disrupting your manual layout
- **Benefit:** Full control over diagram positioning

### 2. **Manual Layout Controls**
Added comprehensive alignment and distribution tools accessible via right-click menu:

#### **Align Options** (Select 2+ nodes)
- **Align Left** - Align all selected nodes to the leftmost position
- **Align Right** - Align all selected nodes to the rightmost position
- **Align Top** - Align all selected nodes to the topmost position
- **Align Bottom** - Align all selected nodes to the bottommost position
- **Align Horizontal Center** - Align nodes to average Y position
- **Align Vertical Center** - Align nodes to average X position

#### **Distribute Options** (Select 3+ nodes)
- **Distribute Horizontally** - Evenly space nodes between leftmost and rightmost
- **Distribute Vertically** - Evenly space nodes between topmost and bottommost

### 3. **Hide/Show Functionality**
- **Hide Node:** Right-click any node → "Hide Node"
- **Show Node:** Right-click canvas → "Show All Hidden Nodes (X)"
- **Use Case:** Temporarily hide resources to focus on specific parts of architecture
- **Hidden nodes are NOT deleted** - just visually hidden

### 4. **Enhanced Context Menus**

#### **Right-Click on Node:**
```
✏️ Edit Resource
👁️ Hide/Show Node
━━━━━━━━━━━━━━━━━
ALIGN
⬅ Align Left
➡ Align Right
⬆ Align Top
⬇ Align Bottom
↔ Align Horizontal Center
↕ Align Vertical Center
━━━━━━━━━━━━━━━━━
DISTRIBUTE
⬌ Distribute Horizontally
⬍ Distribute Vertically
━━━━━━━━━━━━━━━━━
🗑️ Delete Resource
```

#### **Right-Click on Edge:**
```
✏️ Edit Relationship
🗑️ Delete Relationship
```

#### **Right-Click on Canvas:**
```
➕ Add Resource
━━━━━━━━━━━━━━━━━
LAYOUT
✨ AI Layout
🌐 ELK Layout
📊 AWS Layout
🔄 Undo Layout
━━━━━━━━━━━━━━━━━
VIEW
👁️ Show All Hidden Nodes (X)
🗺️ Toggle Legend
🗺️ Toggle Minimap
━━━━━━━━━━━━━━━━━
⚠️ Validate Diagram
📚 Template Library
```

---

## 🎯 How to Use

### **Align Resources**
1. **Select multiple nodes** (Ctrl+Click or Shift+Drag)
2. **Right-click** on any selected node
3. Choose alignment option (e.g., "Align Top")
4. All selected nodes snap to alignment

### **Distribute Resources**
1. **Select 3 or more nodes**
2. **Right-click** on any selected node
3. Choose "Distribute Horizontally" or "Distribute Vertically"
4. Nodes are evenly spaced

### **Hide Resources**
1. **Right-click** on any node
2. Select "Hide Node"
3. Node disappears from diagram (not deleted)
4. To show: Right-click canvas → "Show All Hidden Nodes"

### **Manual Positioning**
1. **Drag nodes** to desired positions
2. Positions are **automatically saved**
3. No auto-layout disruption
4. Use alignment tools for precision

---

## 📋 Workflow Examples

### **Example 1: Clean Up VPC Layout**
```
1. Select all EC2 instances in VPC
2. Right-click → Align Top
3. Right-click → Distribute Horizontally
4. Result: Clean horizontal row of instances
```

### **Example 2: Focus on Specific Services**
```
1. Right-click non-essential resources → Hide Node
2. Work on visible architecture
3. Right-click canvas → Show All Hidden Nodes
4. Result: Temporary focus without deletion
```

### **Example 3: Create Relationship Without Layout Change**
```
1. Drag from resource A to resource B
2. Fill relationship details
3. Save
4. Result: Relationship created, layout unchanged
```

### **Example 4: Organize by Tier**
```
1. Select all frontend resources
2. Right-click → Align Top
3. Select all backend resources
4. Right-click → Align Horizontal Center
5. Select all database resources
6. Right-click → Align Bottom
7. Result: 3-tier architecture layout
```

---

## 🔧 Technical Details

### **State Management**
- Hidden nodes stored in `Set<string>` (node IDs)
- Persists during session (not saved to backend)
- Refresh page to reset hidden nodes

### **Alignment Algorithm**
- Calculates min/max/average positions
- Updates node positions in-place
- Automatically saves to localStorage

### **Distribution Algorithm**
- Sorts nodes by position
- Calculates equal spacing
- Maintains first and last positions

### **Visibility Filtering**
- `visibleNodes = nodes.filter(n => !hiddenNodes.has(n.id))`
- Edges to/from hidden nodes still exist
- Hidden nodes can be unhidden anytime

---

## ⚡ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Multi-select | `Ctrl + Click` |
| Box select | `Shift + Drag` |
| Delete selected | `Delete` key |
| Pan diagram | `Scroll` or `Drag canvas` |
| Zoom | `Ctrl + Scroll` |

---

## 🎨 Best Practices

### **1. Use Alignment for Consistency**
- Align resources in the same tier
- Creates professional-looking diagrams
- Easier to understand data flow

### **2. Distribute for Even Spacing**
- Use after alignment
- Prevents overlapping
- Improves readability

### **3. Hide for Focus**
- Hide non-critical resources during presentations
- Focus on specific workflows
- Reduce visual clutter

### **4. Manual Layout First**
- Position resources manually
- Use alignment to fine-tune
- Apply auto-layout only when needed

### **5. Save Frequently**
- Positions auto-save on drag
- But relationships don't auto-save
- Use "Save Diagram" regularly

---

## 🐛 Troubleshooting

### **Alignment Not Working**
- **Issue:** "Please select at least 2 nodes"
- **Solution:** Select multiple nodes with Ctrl+Click

### **Distribution Not Working**
- **Issue:** "Please select at least 3 nodes"
- **Solution:** Select 3 or more nodes

### **Hidden Nodes Not Showing**
- **Issue:** Can't find hidden nodes
- **Solution:** Right-click canvas → "Show All Hidden Nodes (X)"
- **Note:** X shows count of hidden nodes

### **Context Menu Not Appearing**
- **Issue:** Right-click doesn't show menu
- **Solution:** Refresh browser (Ctrl+Shift+R)
- **Check:** Browser console for errors

### **Positions Not Saving**
- **Issue:** Positions reset on refresh
- **Solution:** Positions save to localStorage automatically
- **Check:** Drag a node and check console for "Saved positions for X nodes"

---

## 📊 Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| Create Relationship | Auto AI layout | No layout change ✅ |
| Align Resources | Manual only | Right-click align ✅ |
| Distribute Resources | Not available | Right-click distribute ✅ |
| Hide Resources | Delete only | Hide/Show ✅ |
| Context Menu | Basic | Comprehensive ✅ |
| Layout Control | Limited | Full control ✅ |

---

## 🚀 What's Next

Refresh your browser and try:

1. ✅ Create a relationship (no auto-layout!)
2. ✅ Select 3 nodes → Right-click → Distribute Horizontally
3. ✅ Right-click a node → Hide Node
4. ✅ Right-click canvas → Show All Hidden Nodes
5. ✅ Select 2 nodes → Right-click → Align Top

**All features are production-ready!**
