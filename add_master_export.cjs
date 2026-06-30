const fs = require('fs');

const content = fs.readFileSync('src/pages/PedestalCalculator.tsx', 'utf-8');

const masterExportCode = `
  const downloadMasterPriceList = () => {
    const wb = XLSX.utils.book_new();

    const masterData = [];
    masterData.push([
      "Board Material",
      "Dimensions (WxHxD mm)",
      "Style / Configuration",
      "Cost Price (Rs)",
    ]);

    const widths = [400, 450, 500, 900];
    const heights = [550, 600, 720];
    const depths = [400, 450, 500];

    // Build the master data
    for (const board of BOARDS) {
      for (const w of widths) {
        for (const h of heights) {
          for (const d of depths) {
            
            if (w !== 900) {
              for (const t of PEDESTAL_TYPES) {
                const res = calculatePedestalCost({
                  width: w, height: h, depth: d, typeId: t.id, boardId: board.id,
                  wideStyle: "2_shelves", wideInternalConfig: "1_vert_1_horiz",
                  drawerLockType: t.drawers > 1 ? "central" : (t.drawers === 1 ? "individual" : "none"),
                  includeHandles: true, includeShutterLocks: true, includeShutterHandles: true, includeCastors: false
                });

                masterData.push([
                  board.name,
                  w + "x" + h + "x" + d,
                  t.name,
                  res.totalCost
                ]);
              }
            } else {
              for (const ws of ["2_shelves", "1_vertical_1_shelve", "2_drawer_1_shutter"]) {
                if (ws === "2_drawer_1_shutter") {
                  for (const wi of ["1_vert_1_horiz", "2_horiz"]) {
                    const res = calculatePedestalCost({
                      width: w, height: h, depth: d, typeId: "3_drawer", boardId: board.id,
                      wideStyle: ws, wideInternalConfig: wi,
                      drawerLockType: "individual",
                      includeHandles: true, includeShutterLocks: true, includeShutterHandles: true, includeCastors: false
                    });
                    const wsName = "2 Drawers + 1 Shutter (Wide, " + (wi === "1_vert_1_horiz" ? "1 Vert & 1 Horiz" : "2 Horiz") + ")";
                    masterData.push([
                      board.name,
                      w + "x" + h + "x" + d,
                      wsName,
                      res.totalCost
                    ]);
                  }
                } else {
                  const res = calculatePedestalCost({
                      width: w, height: h, depth: d, typeId: "3_drawer", boardId: board.id,
                      wideStyle: ws, wideInternalConfig: "1_vert_1_horiz",
                      drawerLockType: "none",
                      includeHandles: true, includeShutterLocks: true, includeShutterHandles: true, includeCastors: false
                  });
                  const wsName = ws === "2_shelves" ? "2 Shelves (Wide)" : "1 Vertical + 1 Shelf (Wide)";
                  masterData.push([
                    board.name,
                    w + "x" + h + "x" + d,
                    wsName,
                    res.totalCost
                  ]);
                }
              }
            }
          }
        }
      }
    }

    const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
    const colWidths = [
      { wch: 15 },
      { wch: 20 },
      { wch: 45 },
      { wch: 15 },
    ];
    wsMaster["!cols"] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, wsMaster, "Master Price List");
    XLSX.writeFile(wb, "pedestal-master-price-list.xlsx");
  };
`;

const returnIndex = content.indexOf('  return (\n');
let modifiedContent = content.substring(0, returnIndex) + masterExportCode + '\n' + content.substring(returnIndex);

const targetButtonBlock = '                <button\n                  onClick={downloadExcel}\n                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"\n                >\n                  <FileSpreadsheet className="w-4 h-4" />\n                  Download Excel Report\n                </button>';

const replacementButtonBlock = '                <button\n                  onClick={downloadExcel}\n                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"\n                >\n                  <FileSpreadsheet className="w-4 h-4" />\n                  Download Config Excel\n                </button>\n                <button\n                  onClick={downloadMasterPriceList}\n                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"\n                >\n                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />\n                  Export Master Price List\n                </button>';

modifiedContent = modifiedContent.replace(targetButtonBlock, replacementButtonBlock);

fs.writeFileSync('src/pages/PedestalCalculator.tsx', modifiedContent);
console.log("Master export added");
