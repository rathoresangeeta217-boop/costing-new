import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { Plus, Download, FileSpreadsheet, Package, Trash2, Edit2, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const { projects, deleteItemFromProject, updateItemInProject } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(1);

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found.</p>
        <Link to="/" className="text-indigo-600 hover:underline mt-4 inline-block">Return to Home</Link>
      </div>
    );
  }

  const handleDownloadItemBOM = (item: any) => {
    const wb = XLSX.utils.book_new();
    const qty = item.quantity || 1;

    const summaryData = [
      { "Property": "Item Name", "Value": item.name },
      { "Property": "Product Type", "Value": item.productType },
      { "Property": "Quantity", "Value": qty },
      { "Property": "Total Cost (Rs)", "Value": (item.costSummary.totalCost || 0) * qty }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Summary");

    const boards = item.costSummary.boardDetails || item.costSummary.boardPiecesDetails || item.costSummary.pieces || [];
    const boardData = boards.filter((b: any) => !b.label?.includes('Edge Banding')).map((b: any) => ({
      "Description": b.label || '',
      "Area/Qty": Number((b.areaSqFt || b.totalSqFt || (b.w && b.l ? (b.w * b.l * (b.qty || 1) / 90000) : b.qty || 0)) * qty).toFixed(2),
      "Cost (Rs)": Number(((b.cost || 0) * qty).toFixed(2))
    }));
    if (boardData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(boardData), "Board Details");
    }

    const ebData = boards.filter((b: any) => b.label?.includes('Edge Banding')).map((b: any) => ({
      "Description": b.label || '',
      "Length (Meters)": Number((b.meters || b.qty || (b.cost / 13) || 0) * qty).toFixed(2),
      "Cost (Rs)": Number(((b.cost || 0) * qty).toFixed(2))
    }));
    
    const hw = item.costSummary.hardwareDetails || item.costSummary.hardware || [];
    hw.filter((h: any) => h.label?.includes('Edge Banding')).forEach((h: any) => {
      ebData.push({
        "Description": h.label || '',
        "Length (Meters)": Number((h.qty || 0) * qty).toFixed(2),
        "Cost (Rs)": Number(((h.cost || (h.qty * (h.unitPrice || h.rate || 0))) * qty).toFixed(2))
      });
    });
    if (ebData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ebData), "Edge Banding");
    }

    const hwData = hw.filter((h: any) => !h.label?.includes('Edge Banding')).map((h: any) => ({
      "Description": h.label || '',
      "Quantity": h.qty * qty,
      "Unit": h.unitLabel || h.unit || 'pcs',
      "Unit Price (Rs)": h.unitPrice || h.rate || 0,
      "Cost (Rs)": Number(((h.cost || (h.qty * (h.unitPrice || h.rate || 0))) * qty).toFixed(2))
    }));
    if (hwData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hwData), "Hardware Details");
    }

    const labor = item.costSummary.laborDetails || [];
    const laborData = labor.map((l: any) => ({
      "Description": l.label || '',
      "Cost (Rs)": Number(((l.cost || 0) * qty).toFixed(2))
    }));
    if (laborData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(laborData), "Labor Details");
    }

    XLSX.writeFile(wb, `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}_BOM.xlsx`);
  };

  const handleDownloadBOM = () => {
    const wb = XLSX.utils.book_new();

    // 1. Overall Summary
    const summaryData = project.items.map((item, index) => ({
      "Sr No": index + 1,
      "Item Name": item.name,
      "Product Type": item.productType,
      "Quantity": item.quantity || 1,
      "Cost (Rs)": (item.costSummary.totalCost || 0) * (item.quantity || 1),
    }));
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Project Summary");

    // 2. Raw Material Aggregation
    const boardAggregation: Record<string, { sqft: number, cost: number }> = {};
    const edgeBandingAggregation: Record<string, { meters: number, cost: number }> = {};
    const hardwareAggregation: Record<string, { qty: number, unitPrice: number, totalCost: number, unitLabel?: string }> = {};

    project.items.forEach(item => {
      // Try to extract board ID from item name e.g., "Workstation 900x600 (18mm_particle_board)"
      let defaultThickness = '18mm';
      let defaultMaterial = 'Board';
      const nameMatch = item.name.match(/\(([\w_]+)\)/);
      if (nameMatch) {
        const boardId = nameMatch[1];
        if (boardId.includes('25mm')) defaultThickness = '25mm';
        else if (boardId.includes('12mm')) defaultThickness = '12mm';
        else if (boardId.includes('9mm')) defaultThickness = '9mm';
        else if (boardId.includes('6mm')) defaultThickness = '6mm';
        else if (boardId.includes('18mm')) defaultThickness = '18mm';

        if (boardId.includes('particle')) defaultMaterial = 'Particle Board';
        else if (boardId.includes('mdf')) defaultMaterial = 'MDF';
        else if (boardId.includes('plywood')) defaultMaterial = 'Plywood';
        else if (boardId.includes('hdhmr')) defaultMaterial = 'HDHMR';
      }

      // Aggregate Boards if available
      const qty = item.quantity || 1;
      if (item.costSummary.boardDetails || item.costSummary.boardPiecesDetails || item.costSummary.pieces) {
         const boards = item.costSummary.boardDetails || item.costSummary.boardPiecesDetails || item.costSummary.pieces || [];
         boards.forEach((b: any) => {
           const label = b.label || '';
           
           if (label.includes('Edge Banding')) {
             const mMatch = label.match(/([\d.]+)\s*m\)/);
             const tMatch = label.match(/\(([\d.]+mm)/);
             if (mMatch) {
               const meters = parseFloat(mMatch[1]);
               const thickness = tMatch ? tMatch[1] : '0.8mm';
               const key = `${thickness} Edge Banding`;
               if (!edgeBandingAggregation[key]) edgeBandingAggregation[key] = { meters: 0, cost: 0 };
               edgeBandingAggregation[key].meters += meters * qty;
               edgeBandingAggregation[key].cost += (b.cost || 0) * qty;
             }
           } else {
             let area = b.totalSqFt || b.areaSqFt || (b.w && b.l ? (b.w * b.l * (b.qty || 1) / 90000) : 0);
             
             if (area === 0 && label) {
               const match = label.match(/\(([\d.]+)\s*sq\.ft\)/);
               if (match) {
                 area = parseFloat(match[1]);
               }
             }
             
             let thickness = defaultThickness;
             const tMatch = label.match(/(\d+)mm/);
             if (tMatch) {
               thickness = `${tMatch[1]}mm`;
             }
             
             let material = defaultMaterial;
             if (label.toLowerCase().includes('particle board')) material = 'Particle Board';
             else if (label.toLowerCase().includes('mdf')) material = 'MDF';
             else if (label.toLowerCase().includes('plywood')) material = 'Plywood';
             else if (label.toLowerCase().includes('hdhmr')) material = 'HDHMR';
             
             let mica = '';
             if (label.includes('with Mica')) {
               const micaMatch = label.match(/with Mica \(([^)]+)\)/);
               mica = micaMatch ? ` with Mica (${micaMatch[1]})` : ` with Mica`;
             }
             
             const key = `${thickness} ${material}${mica}`;
             if (!boardAggregation[key]) boardAggregation[key] = { sqft: 0, cost: 0 };
             boardAggregation[key].sqft += area * qty;
             boardAggregation[key].cost += (b.cost || 0) * qty;
           }
         });
      }

      // Aggregate Hardware if available
      if (item.costSummary.hardwareDetails || item.costSummary.hardware) {
         const hw = item.costSummary.hardwareDetails || item.costSummary.hardware || [];
         hw.forEach((h: any) => {
           const label = h.label || '';
           if (label.includes('Edge Banding')) {
             let thickness = '0.8mm';
             const tMatch = label.match(/([\d.]+mm)/);
             if (tMatch) {
               thickness = tMatch[1];
             }
             const key = `${thickness} Edge Banding`;
             if (!edgeBandingAggregation[key]) edgeBandingAggregation[key] = { meters: 0, cost: 0 };
             edgeBandingAggregation[key].meters += h.qty * qty;
             edgeBandingAggregation[key].cost += (h.cost || (h.qty * (h.unitPrice || h.rate || 0))) * qty;
           } else {
             const key = label;
             if (!hardwareAggregation[key]) {
               hardwareAggregation[key] = { qty: 0, unitPrice: h.unitPrice || h.rate || 0, totalCost: 0, unitLabel: h.unitLabel || 'pcs' };
             }
             hardwareAggregation[key].qty += h.qty * qty;
             hardwareAggregation[key].totalCost += (h.qty * (h.unitPrice || h.rate || 0)) * qty;
           }
         });
      }
    });

    const boardData = Object.entries(boardAggregation).map(([name, data]) => ({
      "Material Name & Spec": name,
      "Total Area (Sq.Ft)": Number(data.sqft.toFixed(2)),
      "Total Cost (Rs)": Number(data.cost.toFixed(2))
    }));
    
    if(boardData.length > 0) {
        const wsBoards = XLSX.utils.json_to_sheet(boardData);
        XLSX.utils.book_append_sheet(wb, wsBoards, "Board Requirements");
    }

    const ebData = Object.entries(edgeBandingAggregation).map(([name, data]) => ({
      "Material Name & Spec": name,
      "Total Length (Meters)": Number(data.meters.toFixed(2)),
      "Total Cost (Rs)": Number(data.cost.toFixed(2))
    }));

    if(ebData.length > 0) {
        const wsEB = XLSX.utils.json_to_sheet(ebData);
        XLSX.utils.book_append_sheet(wb, wsEB, "Edge Banding Requirements");
    }

    const hwData = Object.entries(hardwareAggregation).map(([name, data]) => ({
      "Hardware Name": name,
      "Total Quantity": data.qty,
      "Unit": data.unitLabel,
      "Unit Price (Rs)": data.unitPrice,
      "Total Cost (Rs)": data.totalCost
    }));

    if(hwData.length > 0) {
        const wsHW = XLSX.utils.json_to_sheet(hwData);
        XLSX.utils.book_append_sheet(wb, wsHW, "Hardware Requirements");
    }

    // Append individual item sheets
    project.items.forEach((item, index) => {
      const qty = item.quantity || 1;
      const itemData: any[] = [];
      itemData.push({ "Description": "--- Item Details ---", "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": "" });
      itemData.push({ "Description": `Name: ${item.name}`, "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": (item.costSummary.totalCost || 0) * qty });
      itemData.push({ "Description": `Product Type: ${item.productType}`, "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": "" });
      itemData.push({ "Description": `Quantity: ${qty}`, "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": "" });
      
      const boards = item.costSummary.boardDetails || item.costSummary.boardPiecesDetails || item.costSummary.pieces || [];
      const itemBoards = boards.filter((b: any) => !b.label?.includes('Edge Banding'));
      if (itemBoards.length > 0) {
        itemData.push({ "Description": "--- Boards ---", "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": "" });
        itemBoards.forEach((b: any) => {
          itemData.push({
            "Description": b.label || '',
            "Quantity/Area/Length": Number((b.areaSqFt || b.totalSqFt || (b.w && b.l ? (b.w * b.l * (b.qty || 1) / 90000) : b.qty || 0)) * qty).toFixed(2) + ' sq.ft',
            "Unit Price (Rs)": "",
            "Total Cost (Rs)": Number(((b.cost || 0) * qty).toFixed(2))
          });
        });
      }

      const itemEB = boards.filter((b: any) => b.label?.includes('Edge Banding')).map((b: any) => ({
        "Description": b.label || '',
        "Quantity/Area/Length": Number((b.meters || b.qty || (b.cost / 13) || 0) * qty).toFixed(2) + ' m',
        "Unit Price (Rs)": "",
        "Total Cost (Rs)": Number(((b.cost || 0) * qty).toFixed(2))
      }));
      const hw = item.costSummary.hardwareDetails || item.costSummary.hardware || [];
      hw.filter((h: any) => h.label?.includes('Edge Banding')).forEach((h: any) => {
        itemEB.push({
          "Description": h.label || '',
          "Quantity/Area/Length": Number((h.qty || 0) * qty).toFixed(2) + ' m',
          "Unit Price (Rs)": h.unitPrice || h.rate || 0,
          "Total Cost (Rs)": Number(((h.cost || (h.qty * (h.unitPrice || h.rate || 0))) * qty).toFixed(2))
        });
      });
      if (itemEB.length > 0) {
        itemData.push({ "Description": "--- Edge Banding ---", "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": "" });
        itemData.push(...itemEB);
      }

      const itemHW = hw.filter((h: any) => !h.label?.includes('Edge Banding'));
      if (itemHW.length > 0) {
        itemData.push({ "Description": "--- Hardware ---", "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": "" });
        itemHW.forEach((h: any) => {
          itemData.push({
            "Description": h.label || '',
            "Quantity/Area/Length": `${h.qty * qty} ${h.unitLabel || h.unit || 'pcs'}`,
            "Unit Price (Rs)": h.unitPrice || h.rate || 0,
            "Total Cost (Rs)": Number(((h.cost || (h.qty * (h.unitPrice || h.rate || 0))) * qty).toFixed(2))
          });
        });
      }
      
      const itemLabor = item.costSummary.laborDetails || [];
      if (itemLabor.length > 0) {
        itemData.push({ "Description": "--- Labor ---", "Quantity/Area/Length": "", "Unit Price (Rs)": "", "Total Cost (Rs)": "" });
        itemLabor.forEach((l: any) => {
          itemData.push({
            "Description": l.label || '',
            "Quantity/Area/Length": "",
            "Unit Price (Rs)": "",
            "Total Cost (Rs)": Number(((l.cost || 0) * qty).toFixed(2))
          });
        });
      }

      let sheetName = `${index + 1}. ${item.name.substring(0, 20)}`;
      // Ensure unique valid sheet name
      sheetName = sheetName.replace(/[\\/?*\[\]]/g, '').substring(0, 31);
      
      const wsItem = XLSX.utils.json_to_sheet(itemData);
      XLSX.utils.book_append_sheet(wb, wsItem, sheetName);
    });

    XLSX.writeFile(wb, `${project.name.replace(/\s+/g, '_')}_BOM.xlsx`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/" className="text-sm text-indigo-600 hover:underline mb-2 inline-block">&larr; Back to Projects</Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleDownloadBOM}
            disabled={project.items.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download BOM
          </button>
          <Link
            to={`/project/${project.id}/products`}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {project.items.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No items in this project yet.</p>
            <Link
              to={`/project/${project.id}/products`}
              className="text-indigo-600 hover:underline text-sm mt-2 inline-block"
            >
              Add your first item
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {project.items.map((item, index) => {
              const isEditing = editingItemId === item.id;
              
              return (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{index + 1}</span>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="font-semibold text-lg text-gray-900 border border-gray-300 rounded px-2 py-1 flex-1 min-w-[200px]"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{item.productType.replace(/-/g, ' ')}</p>
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Qty:</p>
                    {isEditing ? (
                      <input 
                        type="number" 
                        min="1"
                        value={editQty}
                        onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-center font-medium"
                      />
                    ) : (
                      <p className="font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-700">{item.quantity || 1}</p>
                    )}
                  </div>
                  
                  <div className="text-right min-w-[100px]">
                    <p className="text-xs text-gray-500 mb-0.5">Total Cost</p>
                    <p className="font-bold text-gray-900">Rs. {((item.costSummary.totalCost || 0) * (item.quantity || 1)).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            updateItemInProject(project.id, item.id, { ...item, name: editName, quantity: editQty });
                            setEditingItemId(null);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditName(item.name);
                            setEditQty(item.quantity || 1);
                            setEditingItemId(item.id);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Rename / Change Qty"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadItemBOM(item)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Download Item BOM"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteItemFromProject(project.id, item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link 
                          to={`/project/${project.id}/calculator/${item.productType}?edit=${item.id}`}
                          className="text-sm text-indigo-600 font-medium hover:underline ml-2"
                        >
                          Edit Config
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
