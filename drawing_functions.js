// Drawing List Management Functions
// These functions handle the rendering and searching of drawing lists

// Global variables for drawing filters
let drawingFilters = {
  'assembly-pdf': { block: '', mod: '', sht: '' },
  'fabrication-pdf': { block: '', mod: '', sht: '' },
  'assembly-cad': { block: '', mod: '', sht: '' }
};

let drawingListTable = null; // Fix: Missing global declaration

// Format drawing title: BLOCK-MODNO-SHEET_R2 (e.g., B1-SA01-002_R2)
// Sheet number is extracted from filename (3-digit number between hyphens)
function formatDrawingTitle(item) {
  const block = item.BLOCK || '';
  const mod = item['MOD. NO'] || '';
  // Extract 3-digit sheet number from filename (e.g., -002- from BA21-OS-TOPS-ST-706406-002-EN_01)
  const filename = item.FILENAME || '';
  const match = filename.match(/-(\d{3})-/); // Find 3-digit number between hyphens
  const sheet = match ? match[1] : '000'; // Get the 3-digit number

  return `${block}-${mod}-${sheet}_R2`;
}

// Render drawing list for a specific view type
function renderDrawingList(viewType) {
  let containerSuffix, fileType, basePath, iconName, iconColor, label;

  if (viewType === 'assembly-pdf') {
    containerSuffix = 'assembly-pdf';
    fileType = 'pdf';
    basePath = 'f:/!!!진행프로젝트/유일/LOADOUT-BEAM_최종파일/1. 조립도/260116_R2/!DOSA송부용';
    iconName = 'picture_as_pdf';
    iconColor = 'text-red-500';
    label = '조립도 PDF';
  } else if (viewType === 'fabrication-pdf') {
    containerSuffix = 'fabrication-pdf';
    fileType = 'pdf';
    basePath = 'f:/!!!진행프로젝트/유일/LOADOUT-BEAM_최종파일/2. 가공도/3. PDF/최종';
    iconName = 'construction';
    iconColor = 'text-emerald-500';
    label = '가공도 PDF';
  } else if (viewType === 'assembly-cad') {
    containerSuffix = 'assembly-cad';
    fileType = 'dwg';
    basePath = 'f:/!!!진행프로젝트/유일/LOADOUT-BEAM_최종파일/1. 조립도/260116_R2/CAD_R2_260116';
    iconName = 'view_in_ar';
    iconColor = 'text-blue-500';
    label = '조립도 CAD';
  }

  const container = document.getElementById(`${containerSuffix}-container`);
  if (!container) return;

  container.innerHTML = '';

  // Get drawings based on viewType
  let drawings = [];
  if (viewType === 'fabrication-pdf') {
    // Use fabrication list for fabrication PDF
    drawings = window.FABRICATION_LIST || [];
  } else {
    // Use allData for assembly drawings
    const uniqueMap = new Map();
    const data = window.allData || [];
    data.forEach(item => {
      if (item.FILENAME && !uniqueMap.has(item.FILENAME)) {
        uniqueMap.set(item.FILENAME, item);
      }
    });
    drawings = Array.from(uniqueMap.values());
  }

  // Apply filters
  const filters = drawingFilters[viewType];
  if (filters.block || filters.mod || filters.sht) {
    drawings = drawings.filter(item => {
      if (filters.block && !String(item.BLOCK || '').toLowerCase().includes(filters.block.toLowerCase())) return false;
      if (filters.mod && !String(item.MOD_NO || '').toLowerCase().includes(filters.mod.toLowerCase())) return false;
      if (filters.sht && !String(item.DWG_Title || '').toLowerCase().includes(filters.sht.toLowerCase())) return false;
      return true;
    });
  }

  // Sort by Block
  drawings.sort((a, b) => String(a.BLOCK || '').localeCompare(String(b.BLOCK || '')));

  let lastBlock = null;

  drawings.forEach(item => {
    const currentBlock = item.BLOCK || 'Unassigned';

    // Block header
    if (currentBlock !== lastBlock) {
      const header = document.createElement('div');
      header.className = 'block-header';
      header.innerHTML = `<span class="material-symbols-outlined">folder_open</span> ${currentBlock}`;
      container.appendChild(header);
      lastBlock = currentBlock;
    }

    // Build file path
    const filename = item.FILENAME || 'Unknown';
    const targetFilename = filename.replace('_01', '_02');
    let filePath;

    if (viewType === 'assembly-pdf') {
      filePath = `file:///${basePath}/${currentBlock}/${targetFilename}.pdf`;
    } else if (viewType === 'fabrication-pdf') {
      // For fabrication PDF, use NESTING_DWG pattern
      const nestingDwg = item.NESTING_DWG || '';
      const fabricationPattern = nestingDwg.match(/^([A-Z0-9\-]+)/)?.[1] || '';
      if (!fabricationPattern) return; // Skip if no pattern
      filePath = `file:///${basePath}/${fabricationPattern}.pdf`;
    } else if (viewType === 'assembly-cad') {
      const cadFolders = {
        'A1': 'A1-28ea', 'A2': 'A2-28ea', 'B1': 'B1-23ea', 'B2': 'B2-23ea',
        'C1': 'C1-21ea', 'C2': 'C2-21ea', 'D1': 'D1-29ea', 'D2': 'D2-29ea',
        'E1': 'E1-6ea', 'E2': 'E2-6ea'
      };
      const cadSubFolder = cadFolders[currentBlock] || currentBlock;
      filePath = `file:///${basePath}/${cadSubFolder}/${targetFilename}.dwg`;
    }

    // Create card
    const card = document.createElement('div');
    card.className = 'drawing-card';

    const displayTitle = formatDrawingTitle(item);

    card.innerHTML = `
      <div class="flex items-center gap-4 cursor-pointer" onclick="openDrawing('${filePath}')">
        <div class="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
          <span class="material-symbols-outlined ${iconColor} text-3xl">${iconName}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-bold text-white truncate" title="${displayTitle}">${displayTitle}</h3>
          <p class="text-[10px] text-slate-500 font-medium uppercase mt-1 tracking-wider">${label}</p>
        </div>
        <span class="material-symbols-outlined text-slate-600">open_in_new</span>
      </div>
    `;
    container.appendChild(card);
  });

  // Show count
  const countMsg = `${drawings.length}개 도면`;
  console.log(`${viewType}: ${countMsg}`);
}

// Apply drawing search
function applyDrawingSearch(viewType) {
  const blockInput = document.getElementById(`search-${viewType}-block`);
  const modInput = document.getElementById(`search-${viewType}-mod`);
  const shtInput = document.getElementById(`search-${viewType}-sht`);

  drawingFilters[viewType] = {
    block: blockInput ? blockInput.value : '',
    mod: modInput ? modInput.value : '',
    sht: shtInput ? shtInput.value : ''
  };

  renderDrawingList(viewType);
}

// Clear drawing search
function clearDrawingSearch(viewType) {
  const blockInput = document.getElementById(`search-${viewType}-block`);
  const modInput = document.getElementById(`search-${viewType}-mod`);
  const shtInput = document.getElementById(`search-${viewType}-sht`);

  if (blockInput) blockInput.value = '';
  if (modInput) modInput.value = '';
  if (shtInput) shtInput.value = '';

  drawingFilters[viewType] = { block: '', mod: '', sht: '' };
  renderDrawingList(viewType);
}

// Drawing List Table Management
let drawingTypeFilter = 'assembly';
let blockFilter = 'all';
let modFilter = 'all';

function setDrawingTypeFilter(type) {
  drawingTypeFilter = type;
  document.querySelectorAll('.drawing-sub-tab').forEach(el => el.classList.remove('active'));
  const subtab = document.getElementById(`subtab-${type}`);
  if (subtab) subtab.classList.add('active');
  applyDrawingListFilters();
}

function renderBlockButtons() {
  const container = document.getElementById('block-filter-container');
  if (!container) return;
  const blocks = [...new Set((window.DRAWING_LIST || []).map(item => String(item.BLOCK || '').trim()).filter(b => b))].sort();
  let html = `<button onclick="setDrawingBlockFilter('all')" class="block-filter-btn ${blockFilter === 'all' ? 'active' : ''}" id="blockbtn-all">ALL BLOCK</button>`;
  blocks.forEach(block => {
    html += `<button onclick="setDrawingBlockFilter('${block}')" class="block-filter-btn ${blockFilter === block ? 'active' : ''}" id="blockbtn-${block}">${block}</button>`;
  });
  container.innerHTML = html;
}

function renderModButtons() {
  const container = document.getElementById('mod-filter-container');
  if (!container) return;
  const mods = [...new Set((window.DRAWING_LIST || []).map(item => String(item.MOD_NO || '').trim()).filter(m => m))].sort();
  let html = `<button onclick="setDrawingModFilter('all')" class="mod-filter-btn ${modFilter === 'all' ? 'active' : ''}" id="modbtn-all">ALL MOD</button>`;
  mods.forEach(mod => {
    html += `<button onclick="setDrawingModFilter('${mod}')" class="mod-filter-btn ${modFilter === mod ? 'active' : ''}" id="modbtn-${mod}">${mod}</button>`;
  });
  container.innerHTML = html;
}

// Update buildPath to use more logical patterns
window.buildPath = function (type, block, filename) {
  const base = `file:///f:/!!!진행프로젝트/유일/LOADOUT-BEAM_최종파일`;
  // Standardize filename for links (often links to _02 or just the base)
  let cleanFn = filename.replace(/\.(pdf|dwg)$/i, '');

  // Auto-normalize to _02 for assembly if needed
  if (type === 'assembly-pdf' || type === 'assembly-cad') {
    if (!cleanFn.endsWith('_01') && !cleanFn.endsWith('_02')) {
      cleanFn += '_02';
    } else if (cleanFn.endsWith('_01')) {
      cleanFn = cleanFn.replace('_01', '_02');
    }
  }

  if (type === 'assembly-pdf') {
    return `${base}/1. 조립도/260116_R2/PDF_R2_260116/!DOSA송부용/${block}/${cleanFn}.pdf`;
  } else if (type === 'fabrication-pdf') {
    return `${base}/2. 가공도/3. PDF/최종/${cleanFn}.pdf`;
  } else if (type === 'assembly-cad') {
    const cadFolders = {
      'A1': 'A1-28ea', 'A2': 'A2-28ea', 'B1': 'B1-23ea', 'B2': 'B2-23ea',
      'C1': 'C1-21ea', 'C2': 'C2-21ea', 'D1': 'D1-29ea', 'D2': 'D2-29ea',
      'E1': 'E1-6ea', 'E2': 'E2-6ea'
    };
    const folder = cadFolders[block] || block;
    return `${base}/1. 조립도/260116_R2/CAD_R2_260116/${folder}/${cleanFn}.dwg`;
  }
  return '';
}

function showLinkedBomData(drawingFilename) {
  if (!drawingFilename) return;

  // Create Modal if not exists
  let modal = document.getElementById('linked-bom-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'linked-bom-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">link</span>
              <span id="linked-bom-title">Linked BOM View</span>
            </h2>
            <p class="text-xs text-slate-400 mt-1" id="linked-bom-subtitle"></p>
          </div>
          <button onclick="document.getElementById('linked-bom-modal').classList.add('hidden')" 
            class="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="flex-1 p-4 overflow-hidden bg-slate-900/50">
          <div id="linked-bom-table" class="rounded-xl overflow-hidden border border-slate-800"></div>
        </div>
        <div class="p-3 border-t border-slate-700 bg-slate-800/30 flex justify-end gap-3">
            <button onclick="exportLinkedBomToExcel()" class="px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-600/30 rounded text-xs font-bold hover:bg-green-600/40 transition-all flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">download</span> Excel Export
            </button>
            <button onclick="document.getElementById('linked-bom-modal').classList.add('hidden')" class="px-4 py-1.5 bg-slate-700 text-white rounded text-xs font-bold hover:bg-slate-600 transition-all">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.classList.remove('hidden');
  }

  // Improved Pattern Matching for Linked BOM
  const matchedData = (window.allData || []).filter(d => {
    const dfn = (d.FILENAME || '').toUpperCase().replace(/(_\d{2})?(\.(pdf|dwg))?$/i, '');
    const target = drawingFilename.toUpperCase().replace(/(_\d{2})?(\.(pdf|dwg))?$/i, '');

    // Core Pattern Match: Must match BLOCK and SHEET exactly
    const extractCore = (str) => {
      const m = str.match(/([A-Z0-9]+)-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-(\d{3,6})-(\d{3})-[A-Z]{2}/);
      return m ? { blockPrefix: m[1], blockNo: m[2], sheet: m[3] } : null;
    };

    const dCore = extractCore(dfn);
    const tCore = extractCore(target);

    if (dCore && tCore) {
      return dCore.blockPrefix === tCore.blockPrefix && dCore.blockNo === tCore.blockNo && dCore.sheet === tCore.sheet;
    }
    return dfn === target || dfn.includes(target) || target.includes(dfn);
  });

  document.getElementById('linked-bom-title').innerText = drawingFilename;
  document.getElementById('linked-bom-subtitle').innerText = `Total ${matchedData.length} items linked in this drawing`;

  // Init Table
  const columns = [
    { title: "WELD ID", field: "WELD_UNIQUE_ID", width: 150, headerHozAlign: "center" },
    { title: "MATNO", field: "MATNO", width: 150, headerHozAlign: "center" },
    { title: "STEEL NO", field: "STEEL_NO", width: 150, headerHozAlign: "center" },
    { title: "DETAIL VIEW", field: "DETAIL_VIEW", width: 150, headerHozAlign: "center" },
    { title: "T", field: "T", width: 60, headerHozAlign: "center", hozAlign: "center" },
    { title: "B", field: "B", width: 60, headerHozAlign: "center", hozAlign: "center" },
    { title: "L(OD)", field: "LOD", width: 80, headerHozAlign: "center", hozAlign: "center" },
    { title: "WEIGHT", field: "WEIGHT", width: 100, headerHozAlign: "center", hozAlign: "right" }
  ];

  if (window.linkedBomTable) window.linkedBomTable.destroy();

  window.linkedBomTable = new Tabulator("#linked-bom-table", {
    data: matchedData,
    layout: "fitColumns",
    height: "500px",
    columns: columns,
    placeholder: "No BOM Data Linked to this Drawing",
    rowHeight: 30,
    headerHeight: 35
  });
}

window.exportLinkedBomToExcel = function () {
  if (!window.linkedBomTable) return;
  const data = window.linkedBomTable.getData();
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Linked BOM");
  XLSX.writeFile(wb, `Linked_BOM_${document.getElementById('linked-bom-title').innerText}.xlsx`);
}

function applyDrawingListFilters() {
  if (!drawingListTable) return;
  const filters = [];

  if (drawingTypeFilter !== 'all') {
    filters.push({ field: "CATEGORY", type: "=", value: drawingTypeFilter });
  }

  if (blockFilter !== 'all') filters.push({ field: "BLOCK", type: "=", value: blockFilter });
  if (modFilter !== 'all') filters.push({ field: "MOD_NO", type: "=", value: modFilter });

  const searchInput = document.getElementById('drawing-list-search');
  const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
  if (searchVal) {
    filters.push([{ field: "FILENAME", type: "like", value: searchVal }, { field: "TITLE", type: "like", value: searchVal }]);
  }

  drawingListTable.setFilter(filters);
  const activeData = drawingListTable.getData("active");
  const countEl = document.getElementById('drawing-list-count');
  if (countEl) countEl.textContent = activeData.length.toLocaleString();
  updateDrawingFilterButtonStates(activeData);
}

function updateDrawingFilterButtonStates(activeData) {
  // Use DRAWING_LIST to ensure buttons reflect potential matches regardless of current filters
  const baseData = window.DRAWING_LIST || [];

  document.querySelectorAll('.block-filter-btn').forEach(btn => {
    if (btn.id === 'blockbtn-all') return;
    const val = btn.id.replace('blockbtn-', '');
    const exists = baseData.some(d => {
      if (d.BLOCK !== val) return false;
      if (drawingTypeFilter !== 'all' && d.CATEGORY !== drawingTypeFilter) return false;
      if (modFilter !== 'all' && d.MOD_NO !== modFilter) return false;
      return true;
    });
    btn.disabled = !exists;
    btn.style.opacity = exists ? '1' : '0.3';
    btn.style.pointerEvents = exists ? 'auto' : 'none';
  });

  document.querySelectorAll('.mod-filter-btn').forEach(btn => {
    if (btn.id === 'modbtn-all') return;
    const val = btn.id.replace('modbtn-', '');
    const exists = baseData.some(d => {
      if (d.MOD_NO !== val) return false;
      if (blockFilter !== 'all' && d.BLOCK !== blockFilter) return false;
      if (drawingTypeFilter !== 'all' && d.CATEGORY !== drawingTypeFilter) return false;
      return true;
    });
    btn.disabled = !exists;
    btn.style.opacity = exists ? '1' : '0.3';
    btn.style.pointerEvents = exists ? 'auto' : 'none';
  });
}

function initDrawingListTable() {
  console.log("Initializing Drawing List Table...", { drawings: (window.DRAWING_LIST || []).length });
  if (drawingListTable) {
    drawingListTable.setData(window.DRAWING_LIST || []);
    applyDrawingListFilters();
    renderBlockButtons();
    renderModButtons();
    return;
  }
  const columns = [
    { title: "No.", field: "NO", width: 60, headerHozAlign: "center", hozAlign: "center" },
    { title: "FILENAME", field: "FILENAME", width: 300, headerHozAlign: "center", hozAlign: "left", headerFilter: "input" },
    { title: "BLOCK", field: "BLOCK", width: 80, headerHozAlign: "center", hozAlign: "center" },
    { title: "DWG. Title", field: "TITLE", width: 300, headerHozAlign: "center", hozAlign: "left", headerFilter: "input" },
    { title: "MOD. NO", field: "MOD_NO", width: 100, headerHozAlign: "center", hozAlign: "center" },
    { title: "REV.0", field: "REV0", width: 100, headerHozAlign: "center", hozAlign: "center" },
    { title: "REV.1", field: "REV1", width: 100, headerHozAlign: "center", hozAlign: "center" },
    { title: "REV.2", field: "REV2", width: 100, headerHozAlign: "center", hozAlign: "center" },
    { title: "REMARK", field: "REMARK", width: 200, headerHozAlign: "center", hozAlign: "left" },
    {
      title: "Actions", width: 120, headerHozAlign: "center", hozAlign: "center",
      formatter: function () {
        return `<div class="flex gap-1 justify-center">
          <button class="px-2 py-1 bg-red-600/20 text-red-500 text-[10px] rounded hover:bg-red-600/40 transition-colors font-black">PDF</button>
          <button class="px-2 py-1 bg-blue-600/20 text-blue-500 text-[10px] rounded hover:bg-blue-600/40 transition-colors font-black">CAD</button>
        </div>`;
      },
      cellClick: function (e, cell) {
        e.stopPropagation();
        const row = cell.getRow().getData();
        const filename = (row.FILENAME || '');
        const path = window.buildPath(e.target.innerText === 'PDF' ? 'assembly-pdf' : 'assembly-cad', row.BLOCK || '', filename);
        openDrawing(path);
      }
    }
  ];
  drawingListTable = new Tabulator("#drawing-list-table", {
    data: window.DRAWING_LIST || [],
    height: "calc(100vh - 300px)", // Synced with BOM Table
    layout: "fitDataFill",          // Synced with BOM Table
    columns: columns,
    placeholder: "No Drawings Found",
    rowHeight: 28,                 // Synced with BOM Table
    headerHeight: 32,              // Synced with BOM Table
    // Performance Optimization (Ported from BOM Engine)
    renderVertical: "virtual",
    progressiveRender: true,
    progressiveRenderSize: 50,
    progressiveRenderMargin: 350,
    rowDblClick: function (e, row) {
      const fn = row.getData().FILENAME || '';
      showLinkedBomData(fn);
    }
  });

  drawingListTable.on("dataFiltered", function (filters, rows) {
    const countEl = document.getElementById('drawing-list-count');
    if (countEl) countEl.textContent = rows.length.toLocaleString();
  });
  renderBlockButtons();
  renderModButtons();
  applyDrawingListFilters();
  const searchEl = document.getElementById('drawing-list-search');
  if (searchEl) searchEl.addEventListener('input', applyDrawingListFilters);
}

window.downloadDrawingListExcel = function () {
  if (!drawingListTable) return;
  const ws = XLSX.utils.json_to_sheet(drawingListTable.getData("active"));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Drawing List");
  XLSX.writeFile(wb, `Drawing_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

