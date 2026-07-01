import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import {
  Calculator,
  LayoutGrid,
  Ruler,
  FileBox,
  IndianRupee,
  Download,
  FileSpreadsheet,
  X,
  Copy,
  Info,
  Layers,
  Plus,
  Minus,
  Settings,
  HelpCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Reusing identical material pricing structures
export const getBoards = (quality: string) => [
  { id: "plpb", name: "PLPB", costPerSqFt: quality === "affordable" ? 34 : 49 },
  { id: "mdf", name: "MDF", costPerSqFt: quality === "affordable" ? 38 : 61 },
  { id: "hdhmr", name: "HDHMR", costPerSqFt: quality === "affordable" ? 99 : 74 },
  { id: "ply_laminate", name: "PLY LAMINATE", costPerSqFt: quality === "affordable" ? 55 : 130 },
  { id: "ply_century_one_mm_laminate", name: "PLY CENTURY ONE MM LAMINATE", costPerSqFt: 230 },
];

export const getAvailableThicknesses = (boardId: string, quality: string): number[] => {
  if (quality === "affordable") {
    switch (boardId) {
      case "plpb": return [11, 17, 18, 25];
      case "mdf": return [17, 18, 25, 35];
      case "hdhmr": return [16.75, 18, 25];
      case "ply_laminate":
      case "ply_century_one_mm_laminate":
        return [6, 9, 12, 15, 16, 18];
      default: return [18];
    }
  } else {
    switch (boardId) {
      case "plpb": return [18, 25, 36];
      case "hdhmr": return [18, 25];
      case "mdf": return [18, 25, 36];
      case "ply_century_one_mm_laminate":
      case "ply_laminate":
        return [18, 25];
      default: return [18];
    }
  }
};

export const getBoardRate = (boardId: string, baseRate: number, thickness: number, quality: string): number => {
  if (quality === "affordable") {
    if (boardId === "plpb") {
      if (thickness === 11) return 27;
      if (thickness === 17) return 29;
      if (thickness === 18) return 34;
      if (thickness === 25) return 42;
    }
    if (boardId === "hdhmr") {
      if (Math.abs(thickness - 16.75) < 0.1) return 88;
      if (thickness === 18) return 99;
      if (thickness === 25) return 135;
    }
    if (boardId === "ply_laminate") {
      if (thickness === 6) return 22;
      if (thickness === 9) return 35;
      if (thickness === 12) return 38;
      if (thickness === 15) return 46;
      if (thickness === 16) return 46;
      if (thickness === 18) return 55;
    }
    if (boardId === "mdf") {
      if (thickness === 17) return 55;
      if (thickness === 18) return 60;
      if (thickness === 25) return 80;
      if (thickness === 35) return 112;
    }
  } else {
    if (boardId === "plpb") {
      if (thickness === 18) return 49;
      if (thickness === 25) return 63;
      if (thickness === 36) return 98;
    }
    if (boardId === "hdhmr") {
      if (thickness === 18) return 74;
      if (thickness === 25) return 108;
    }
    if (boardId === "mdf") {
      if (thickness === 18) return 61;
      if (thickness === 25) return 83;
      if (thickness === 36) return 122;
    }
    if (boardId === "ply_laminate") {
      if (thickness === 18) return 130;
      if (thickness === 25) return 181;
    }
    if (boardId === "ply_century_one_mm_laminate") {
      if (thickness === 18) return 230;
      if (thickness === 25) return 319;
    }
  }
  return baseRate * (thickness / 18);
};

const HARDWARE_CHANNEL_COST = 235;
const HARDWARE_HANDLE_COST = 50;
const HARDWARE_LOCK_COST = 120;
const HARDWARE_CENTRAL_LOCK_COST = 220;
const HARDWARE_SHUTTER_HINGE_COST = 62.5; // Rs 125 per pair
const HARDWARE_LEVELLER_COST = 50; // Levelling legs
const BASE_LABOR_COST = 600;
const LABOR_PER_BAY_COST = 300;
const PACKING_COST = 400;
const TOOLING_COST = 150;
const PROFIT_PERCENTAGE = 0.25;

interface ColumnConfig {
  style: "open" | "shutter_solid" | "shutter_glass" | "shutters_double" | "3_drawers" | "2_drawers" | "1_drawer" | "1_drawer_open";
  shelves: number;
  lock: "none" | "individual" | "central";
  handle: boolean;
}

export default function CustomStorageCalculator() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const editItemId = searchParams.get("edit");
  const navigate = useNavigate();
  const { projects, addItemToProject, updateItemInProject } = useProjectStore();

  const [activeTab, setActiveTab] = useState<"storage" | "drawer">("storage");

  // Dimensions and properties
  const [width, setWidth] = useState<number>(1200); // mm
  const [depth, setDepth] = useState<number>(450); // mm
  const [height, setHeight] = useState<number>(750); // mm
  
  // Single Drawer dimensions
  const [drawerWidth, setDrawerWidth] = useState<number>(600);
  const [drawerDepth, setDrawerDepth] = useState<number>(450);
  const [drawerHeight, setDrawerHeight] = useState<number>(150);
  const [drawerLock, setDrawerLock] = useState<boolean>(false);
  const [drawerHandle, setDrawerHandle] = useState<boolean>(true);

  const [quality, setQuality] = useState<string>("standard");
  const [boardId, setBoardId] = useState<string>("plpb");
  const [boardThickness, setBoardThickness] = useState<number>(18);
  const [innerMica, setInnerMica] = useState<string>("none");
  const [outerMica, setOuterMica] = useState<string>("none");
  const [numBays, setNumBays] = useState<number>(3);
  const [supportLegsCount, setSupportLegsCount] = useState<number>(4);

  // Column arrangements
  const [bays, setBays] = useState<ColumnConfig[]>([
    { style: "shutter_solid", shelves: 1, lock: "individual", handle: true },
    { style: "open", shelves: 1, lock: "none", handle: false },
    { style: "3_drawers", shelves: 0, lock: "central", handle: true },
  ]);

  useEffect(() => {
    if (editItemId && projectId) {
      const project = projects.find(p => p.id === projectId);
      const item = project?.items.find(i => i.id === editItemId);
      if (item && item.config) {
        const c = item.config;
        if (c.activeTab !== undefined) setActiveTab(c.activeTab);
        if (c.width !== undefined) setWidth(c.width);
        if (c.depth !== undefined) setDepth(c.depth);
        if (c.height !== undefined) setHeight(c.height);
        if (c.drawerWidth !== undefined) setDrawerWidth(c.drawerWidth);
        if (c.drawerDepth !== undefined) setDrawerDepth(c.drawerDepth);
        if (c.drawerHeight !== undefined) setDrawerHeight(c.drawerHeight);
        if (c.drawerLock !== undefined) setDrawerLock(c.drawerLock);
        if (c.drawerHandle !== undefined) setDrawerHandle(c.drawerHandle);
        if (c.quality !== undefined) setQuality(c.quality);
        if (c.boardId !== undefined) setBoardId(c.boardId);
        if (c.boardThickness !== undefined) setBoardThickness(c.boardThickness);
        if (c.innerMica !== undefined) setInnerMica(c.innerMica);
        if (c.outerMica !== undefined) setOuterMica(c.outerMica);
        if (c.numBays !== undefined) setNumBays(c.numBays);
        if (c.supportLegsCount !== undefined) setSupportLegsCount(c.supportLegsCount);
        if (c.bays !== undefined) setBays(c.bays);
      }
    }
  }, [editItemId, projectId, projects]);

  // Sync bays array size with numBays
  useEffect(() => {
    if (bays.length < numBays) {
      const added: ColumnConfig[] = Array.from({ length: numBays - bays.length }, () => ({
        style: "open",
        shelves: 1,
        lock: "none",
        handle: true,
      }));
      setBays([...bays, ...added]);
    } else if (bays.length > numBays) {
      setBays(bays.slice(0, numBays));
    }

    // Set support legs count automatically based on width
    if (width >= 1800) {
      setSupportLegsCount(6);
    } else {
      setSupportLegsCount(4);
    }
  }, [numBays, width]);

  // Reset thickness when board or quality changes
  useEffect(() => {
    const available = getAvailableThicknesses(boardId, quality);
    if (!available.includes(boardThickness)) {
      setBoardThickness(available[0] || 18);
    }
  }, [boardId, quality]);

  // Handle column configuration updates
  const updateBay = (index: number, updates: Partial<ColumnConfig>) => {
    const updated = [...bays];
    updated[index] = { ...updated[index], ...updates };
    setBays(updated);
  };

  const boards = useMemo(() => getBoards(quality), [quality]);
  const activeBoard = useMemo(() => boards.find((b) => b.id === boardId) || boards[0], [boards, boardId]);
  const boardRate = useMemo(
    () => getBoardRate(boardId, activeBoard.costPerSqFt, boardThickness, quality),
    [boardId, activeBoard, boardThickness, quality]
  );

  const innerRate = innerMica === "0.8" ? 35 : innerMica === "1.0" ? 56 : 0;
  const outerRate = outerMica === "0.8" ? 35 : outerMica === "1.0" ? 56 : 0;
  const totalMicaRate = innerRate + outerRate;
  const rateToUse = boardRate + totalMicaRate;

  // Perform complete structural calculations
  const calcData = useMemo(() => {
    const thickness = boardThickness;
    const pieces: {
      label: string;
      w: number;
      l: number;
      qty: number;
      customCostPerSqFt?: number;
      ebMm?: number;
    }[] = [];

    // Outer shell
    // Top & Bottom Panels
    pieces.push({ label: "Top Panel", w: width, l: depth, qty: 1, ebMm: (width + depth) * 2 });
    pieces.push({ label: "Bottom Panel", w: width, l: depth, qty: 1, ebMm: width }); // Exposed front edge

    // Side Panels
    const sideH = Math.max(0, height - thickness * 2);
    pieces.push({ label: "Side Panels", w: depth, l: sideH, qty: 2, ebMm: (sideH * 2 + depth) * 2 });

    // Back Panel (Standard PLPB backing or matching ply/board, standard cost Rs 35/sqft)
    pieces.push({
      label: "Back Panel (9mm PLPB Backing)",
      w: width,
      l: height,
      qty: 1,
      customCostPerSqFt: 35,
      ebMm: 0,
    });

    // Dividers / Vertical Partitions
    const numPartitions = numBays - 1;
    if (numPartitions > 0) {
      pieces.push({
        label: "Vertical Partitions",
        w: depth - 20,
        l: sideH,
        qty: numPartitions,
        ebMm: sideH * numPartitions, // front edges
      });
    }

    // Inside dimensions for columns
    const innerWidth = Math.max(0, width - thickness * 2);
    const totalPartitionThickness = numPartitions * thickness;
    const bayWidth = Math.max(0, (innerWidth - totalPartitionThickness) / numBays);

    // Dynamic drawer components
    let totalDrawersCount = 0;
    let totalSolidShuttersCount = 0;
    let totalGlassShuttersCount = 0;
    let totalHingesCount = 0;
    let totalHandlesCount = 0;
    let totalIndividualLocksCount = 0;
    let totalCentralLocksCount = 0;
    let totalShelvesCount = 0;

    bays.forEach((bay, index) => {
      // Internal Shelves for this bay
      if (bay.shelves > 0) {
        totalShelvesCount += bay.shelves;
      }

      if (bay.style === "open") {
        // No doors or drawers
      } else if (bay.style === "shutter_solid") {
        totalSolidShuttersCount += 1;
        totalHingesCount += 2;
        if (bay.handle) totalHandlesCount += 1;
        if (bay.lock === "individual") totalIndividualLocksCount += 1;
      } else if (bay.style === "shutter_glass") {
        totalGlassShuttersCount += 1;
        totalHingesCount += 2;
        if (bay.handle) totalHandlesCount += 1;
        if (bay.lock === "individual") totalIndividualLocksCount += 1;
      } else if (bay.style === "shutters_double") {
        totalSolidShuttersCount += 2;
        totalHingesCount += 4;
        if (bay.handle) totalHandlesCount += 2;
        if (bay.lock === "individual") totalIndividualLocksCount += 1; // Locks the double door set
      } else if (bay.style === "3_drawers") {
        totalDrawersCount += 3;
        if (bay.handle) totalHandlesCount += 3;
        if (bay.lock === "central") {
          totalCentralLocksCount += 1;
        } else if (bay.lock === "individual") {
          totalIndividualLocksCount += 3;
        }
      } else if (bay.style === "2_drawers") {
        totalDrawersCount += 2;
        if (bay.handle) totalHandlesCount += 2;
        if (bay.lock === "central") {
          totalCentralLocksCount += 1; // Multi-lock for 2 drawers
        } else if (bay.lock === "individual") {
          totalIndividualLocksCount += 2;
        }
      } else if (bay.style === "1_drawer") {
        totalDrawersCount += 1;
        if (bay.handle) totalHandlesCount += 1;
        if (bay.lock === "individual") totalIndividualLocksCount += 1;
      } else if (bay.style === "1_drawer_open") {
        totalDrawersCount += 1;
        if (bay.handle) totalHandlesCount += 1;
        if (bay.lock === "individual") totalIndividualLocksCount += 1;
      }
    });

    // Add shelves pieces
    if (totalShelvesCount > 0) {
      const shelfW = bayWidth - 2;
      pieces.push({
        label: "Internal Adjustable Shelves",
        w: shelfW,
        l: depth - 20,
        qty: totalShelvesCount,
        ebMm: shelfW * totalShelvesCount, // Exposed front edges
      });
    }

    // Add Shutter faces
    bays.forEach((bay, index) => {
      const shH = Math.max(0, sideH - 4);
      if (bay.style === "shutter_solid") {
        const shW = Math.max(0, bayWidth - 4);
        pieces.push({
          label: `Shutter Door (Bay ${index + 1})`,
          w: shW,
          l: shH,
          qty: 1,
          ebMm: (shW + shH) * 2,
        });
      } else if (bay.style === "shutter_glass") {
        // Wooden or aluminum frame for glass door, plus glass area cost
        const shW = Math.max(0, bayWidth - 4);
        pieces.push({
          label: `Glass Shutter Door Frame (Bay ${index + 1})`,
          w: shW,
          l: shH,
          qty: 1,
          ebMm: (shW + shH) * 2,
        });
      } else if (bay.style === "shutters_double") {
        const shW = Math.max(0, (bayWidth - 6) / 2);
        pieces.push({
          label: `Double Shutter Door (Bay ${index + 1} - Left)`,
          w: shW,
          l: shH,
          qty: 1,
          ebMm: (shW + shH) * 2,
        });
        pieces.push({
          label: `Double Shutter Door (Bay ${index + 1} - Right)`,
          w: shW,
          l: shH,
          qty: 1,
          ebMm: (shW + shH) * 2,
        });
      } else if (bay.style === "3_drawers") {
        const faceH = Math.max(0, Math.round(sideH / 3) - 4);
        const faceW = Math.max(0, bayWidth - 4);
        pieces.push({
          label: `Drawer Faces (Bay ${index + 1})`,
          w: faceW,
          l: faceH,
          qty: 3,
          ebMm: (faceW + faceH) * 2 * 3,
        });
      } else if (bay.style === "2_drawers") {
        const faceH = Math.max(0, Math.round(sideH / 2) - 4);
        const faceW = Math.max(0, bayWidth - 4);
        pieces.push({
          label: `Drawer Faces (Bay ${index + 1})`,
          w: faceW,
          l: faceH,
          qty: 2,
          ebMm: (faceW + faceH) * 2 * 2,
        });
      } else if (bay.style === "1_drawer") {
        const faceH = Math.max(0, sideH - 4);
        const faceW = Math.max(0, bayWidth - 4);
        pieces.push({
          label: `Drawer Face (Bay ${index + 1})`,
          w: faceW,
          l: faceH,
          qty: 1,
          ebMm: (faceW + faceH) * 2,
        });
      } else if (bay.style === "1_drawer_open") {
        const faceH = Math.min(154, Math.max(0, Math.round(sideH / 3)));
        const faceW = Math.max(0, bayWidth - 4);
        pieces.push({
          label: `Drawer Face (Bay ${index + 1})`,
          w: faceW,
          l: faceH,
          qty: 1,
          ebMm: (faceW + faceH) * 2,
        });
      }
    });

    // Drawer inner construction components (if any drawers exist)
    if (totalDrawersCount > 0) {
      // We calculate drawer boxes matching the dimensions of the drawer columns
      bays.forEach((bay, index) => {
        let bayDrawers = 0;
        let dh = 120; // default height of drawer box
        if (bay.style === "3_drawers") {
          bayDrawers = 3;
          dh = Math.max(80, Math.round(sideH / 3) - 60);
        } else if (bay.style === "2_drawers") {
          bayDrawers = 2;
          dh = Math.max(100, Math.round(sideH / 2) - 60);
        } else if (bay.style === "1_drawer") {
          bayDrawers = 1;
          dh = Math.max(100, sideH - 60);
        } else if (bay.style === "1_drawer_open") {
          bayDrawers = 1;
          dh = 100;
        }

        if (bayDrawers > 0) {
          const dw = Math.max(0, bayWidth - 36);
          const dd = Math.max(0, depth - 36);

          // Drawer Bottoms (uses lightweight backing material for rate calculations)
          pieces.push({
            label: `Drawer Bottom Panels (Bay ${index + 1})`,
            w: dw,
            l: dd,
            qty: bayDrawers,
            customCostPerSqFt: 35,
            ebMm: 0,
          });

          // Drawer Sides
          pieces.push({
            label: `Drawer Side Panels (Bay ${index + 1})`,
            w: dd,
            l: dh,
            qty: bayDrawers * 2,
            ebMm: dd * bayDrawers * 2, // top edge of drawer box sides
          });

          // Drawer Back and Inner Front
          pieces.push({
            label: `Drawer Inner Front/Back (Bay ${index + 1})`,
            w: Math.max(0, dw - 36),
            l: dh,
            qty: bayDrawers * 2,
            ebMm: Math.max(0, dw - 36) * bayDrawers, // top edge of drawer backs
          });
        }
      });
    }

    // Cost calculations
    let boardsSqFt = 0;
    let materialCost = 0;
    let backingCost = 0;

    const boardDetails = pieces.map((p) => {
      const areaSqMm = p.w * p.l * p.qty;
      const areaSqFt = areaSqMm / 90000;
      const wasteSqFt = areaSqFt * 0.15; // 15% wastage markup
      const totalSqFt = areaSqFt + wasteSqFt;

      const itemRate = p.customCostPerSqFt ?? rateToUse;
      const itemCost = totalSqFt * itemRate;

      if (p.customCostPerSqFt) {
        backingCost += itemCost;
      } else {
        boardsSqFt += areaSqFt;
        materialCost += itemCost;
      }

      return {
        ...p,
        areaSqFt,
        wasteSqFt,
        totalSqFt,
        rate: itemRate,
        cost: itemCost,
      };
    });

    // Hardware Details
    const hardware: {
      label: string;
      qty: number;
      unitPrice: number;
      unit: string;
      cost: number;
    }[] = [];

    // Edge Banding
    let totalEbLengthMm = 0;
    pieces.forEach((p) => {
      if (p.ebMm) totalEbLengthMm += p.ebMm;
    });
    const edgeBandingMeters = (totalEbLengthMm / 1000) * 1.2;
    const edgeBandingCost = edgeBandingMeters * 13; // Rs 13/meter
    if (edgeBandingMeters > 0) {
      hardware.push({
        label: "PVC Edge Banding (0.8mm / 2mm)",
        qty: Number(edgeBandingMeters.toFixed(2)),
        unitPrice: 13,
        unit: "m",
        cost: edgeBandingCost,
      });
    }

    // Drawer channels
    if (totalDrawersCount > 0) {
      hardware.push({
        label: "Telescopic Drawer Runners (Set)",
        qty: totalDrawersCount,
        unitPrice: HARDWARE_CHANNEL_COST,
        unit: "set",
        cost: totalDrawersCount * HARDWARE_CHANNEL_COST,
      });
    }

    // Hinges
    if (totalHingesCount > 0) {
      hardware.push({
        label: "Auto-close Cabinet Hinges",
        qty: totalHingesCount,
        unitPrice: HARDWARE_SHUTTER_HINGE_COST,
        unit: "pcs",
        cost: totalHingesCount * HARDWARE_SHUTTER_HINGE_COST,
      });
    }

    // Handles
    if (totalHandlesCount > 0) {
      hardware.push({
        label: "Sleek Metal Drawer/Door Handles",
        qty: totalHandlesCount,
        unitPrice: HARDWARE_HANDLE_COST,
        unit: "pcs",
        cost: totalHandlesCount * HARDWARE_HANDLE_COST,
      });
    }

    // Individual Locks
    if (totalIndividualLocksCount > 0) {
      hardware.push({
        label: "Cabinet Key Locks (Individual)",
        qty: totalIndividualLocksCount,
        unitPrice: HARDWARE_LOCK_COST,
        unit: "pcs",
        cost: totalIndividualLocksCount * HARDWARE_LOCK_COST,
      });
    }

    // Central Locks
    if (totalCentralLocksCount > 0) {
      hardware.push({
        label: "Drawer Central Lock System",
        qty: totalCentralLocksCount,
        unitPrice: HARDWARE_CENTRAL_LOCK_COST,
        unit: "pcs",
        cost: totalCentralLocksCount * HARDWARE_CENTRAL_LOCK_COST,
      });
    }

    // Support legs
    hardware.push({
      label: "Adjustable Heavy Levelling Legs",
      qty: supportLegsCount,
      unitPrice: HARDWARE_LEVELLER_COST,
      unit: "pcs",
      cost: supportLegsCount * HARDWARE_LEVELLER_COST,
    });

    // Glass panel surcharge for glass shutter doors
    if (totalGlassShuttersCount > 0) {
      const singleGlassW = bayWidth - 60; // border frame
      const singleGlassH = sideH - 60;
      const totalGlassAreaSqFt = (singleGlassW * singleGlassH * totalGlassShuttersCount) / 90000;
      const glassSurcharge = totalGlassAreaSqFt * 200; // Rs 200 per sq ft for toughened glass
      hardware.push({
        label: `Toughened Glass Panels (Visible inside frame)`,
        qty: Number(totalGlassAreaSqFt.toFixed(2)),
        unitPrice: 200,
        unit: "sq.ft",
        cost: glassSurcharge,
      });
    }

    const hardwareCost = hardware.reduce((sum, h) => sum + h.cost, 0);

    // Assembly & Labor
    const laborCost = (materialCost + backingCost + hardwareCost) * 0.20;
    const packagingCost = PACKING_COST;
    const toolingCost = TOOLING_COST;
    const netManufacturingCost = materialCost + backingCost + hardwareCost + laborCost + packagingCost + toolingCost;

    // Financial Margins
    const profitMargin = netManufacturingCost * PROFIT_PERCENTAGE;
    const subtotal = netManufacturingCost + profitMargin;
    const grandTotal = subtotal;

    return {
      pieces: boardDetails,
      hardware,
      totals: {
        boardsSqFt,
        materialCost,
        backingCost,
        hardwareCost,
        laborCost,
        packagingCost,
        toolingCost,
        netManufacturingCost,
        profitMargin,
        subtotal,
        grandTotal,
      },
      bayWidth,
      sideH,
    };
  }, [width, depth, height, boardId, boardThickness, quality, innerMica, outerMica, numBays, bays, rateToUse, supportLegsCount]);

  // Single Drawer Calculations
  const drawerCalcData = useMemo(() => {
    const pieces: {
      label: string;
      w: number;
      l: number;
      qty: number;
      customCostPerSqFt?: number;
      ebMm?: number;
    }[] = [];

    // Drawer Face
    pieces.push({
      label: "Drawer Face",
      w: drawerWidth,
      l: drawerHeight,
      qty: 1,
      ebMm: (drawerWidth + drawerHeight) * 2,
    });

    const boxWidth = Math.max(0, drawerWidth - 36); 
    const boxDepth = Math.max(0, drawerDepth - 18); 
    const boxHeight = Math.max(0, drawerHeight - 30); 

    // Drawer Bottom
    pieces.push({
      label: "Drawer Bottom Panel",
      w: boxWidth,
      l: boxDepth,
      qty: 1,
      customCostPerSqFt: 35, // PLPB backing
      ebMm: 0,
    });

    // Drawer Sides
    pieces.push({
      label: "Drawer Side Panels",
      w: boxDepth,
      l: boxHeight,
      qty: 2,
      ebMm: boxDepth * 2,
    });

    // Drawer Back and Inner Front
    pieces.push({
      label: "Drawer Inner Front/Back",
      w: Math.max(0, boxWidth - 36),
      l: boxHeight,
      qty: 2,
      ebMm: Math.max(0, boxWidth - 36) * 2,
    });

    let materialCost = 0;
    let backingCost = 0;
    
    const boardDetails = pieces.map((p) => {
      const areaSqMm = p.w * p.l * p.qty;
      const areaSqFt = areaSqMm / 90000;
      const wasteSqFt = areaSqFt * 0.15;
      const totalSqFt = areaSqFt + wasteSqFt;

      const itemRate = p.customCostPerSqFt ?? rateToUse;
      const itemCost = totalSqFt * itemRate;

      if (p.customCostPerSqFt) {
        backingCost += itemCost;
      } else {
        materialCost += itemCost;
      }

      return {
        ...p,
        areaSqFt,
        wasteSqFt,
        totalSqFt,
        rate: itemRate,
        cost: itemCost,
      };
    });

    const hardware: {
      label: string;
      qty: number;
      unitPrice: number;
      unit: string;
      cost: number;
    }[] = [];

    // Edge Banding
    let totalEbLengthMm = 0;
    pieces.forEach((p) => {
      if (p.ebMm) totalEbLengthMm += p.ebMm;
    });
    const edgeBandingMeters = (totalEbLengthMm / 1000) * 1.2;
    if (edgeBandingMeters > 0) {
      hardware.push({
        label: "PVC Edge Banding (0.8mm / 2mm)",
        qty: Number(edgeBandingMeters.toFixed(2)),
        unitPrice: 13,
        unit: "m",
        cost: edgeBandingMeters * 13,
      });
    }

    hardware.push({
      label: "Telescopic Drawer Runners (Set)",
      qty: 1,
      unitPrice: HARDWARE_CHANNEL_COST,
      unit: "set",
      cost: HARDWARE_CHANNEL_COST,
    });

    if (drawerHandle) {
      hardware.push({
        label: "Drawer Handle",
        qty: 1,
        unitPrice: HARDWARE_HANDLE_COST,
        unit: "pcs",
        cost: HARDWARE_HANDLE_COST,
      });
    }

    if (drawerLock) {
      hardware.push({
        label: "Drawer Lock",
        qty: 1,
        unitPrice: HARDWARE_LOCK_COST,
        unit: "pcs",
        cost: HARDWARE_LOCK_COST,
      });
    }

    const hardwareCost = hardware.reduce((sum, h) => sum + h.cost, 0);

    const laborCost = (materialCost + backingCost + hardwareCost) * 0.20;
    const packagingCost = 80;
    const toolingCost = 40;
    const netManufacturingCost = materialCost + backingCost + hardwareCost + laborCost + packagingCost + toolingCost;

    const profitMargin = netManufacturingCost * PROFIT_PERCENTAGE;
    const subtotal = netManufacturingCost + profitMargin;
    const grandTotal = subtotal;

    return {
      pieces: boardDetails,
      hardware,
      totals: {
        materialCost,
        backingCost,
        hardwareCost,
        laborCost,
        packagingCost,
        toolingCost,
        netManufacturingCost,
        profitMargin,
        subtotal,
        grandTotal,
      },
    };
  }, [drawerWidth, drawerDepth, drawerHeight, drawerLock, drawerHandle, rateToUse]);

  // Copy Specifications Text
  const copySpecifications = () => {
    let text = `====================================\n`;
    text += `SRK MODULAR - CUSTOM STORAGE QUOTATION\n`;
    text += `====================================\n`;
    text += `Configuration: Custom Storage Cabinet\n`;
    text += `Overall Size: ${width} W x ${depth} D x ${height} H mm\n`;
    text += `Bays/Columns Count: ${numBays} Bays\n`;
    text += `Material Type: ${activeBoard.name} (${boardThickness}mm) - ${quality.toUpperCase()} Tier\n`;
    if (innerMica !== "none" || outerMica !== "none") {
      text += `Laminate Finishing: Inner: ${innerMica === "none" ? "None" : innerMica + "mm"}, Outer: ${outerMica === "none" ? "None" : outerMica + "mm"}\n`;
    }
    text += `------------------------------------\n`;
    text += `Column Config:\n`;
    bays.forEach((bay, i) => {
      let desc = "";
      if (bay.style === "open") desc = `${bay.shelves} open shelves`;
      else if (bay.style === "shutter_solid") desc = `Solid shutter door, ${bay.shelves} shelves, lock: ${bay.lock}`;
      else if (bay.style === "shutter_glass") desc = `Glass cabinet door, ${bay.shelves} shelves, lock: ${bay.lock}`;
      else if (bay.style === "shutters_double") desc = `Double shutter doors, ${bay.shelves} shelves, lock: ${bay.lock}`;
      else if (bay.style === "3_drawers") desc = `3 Drawer file stack, lock: ${bay.lock}`;
      else if (bay.style === "2_drawers") desc = `2 Drawer stack, lock: ${bay.lock}`;
      else if (bay.style === "1_drawer") desc = `1 Drawer (Full height), lock: ${bay.lock}`;
      else if (bay.style === "1_drawer_open") desc = `1 Drawer at top, open shelving below`;
      text += `  - Column ${i + 1}: ${desc}\n`;
    });
    text += `------------------------------------\n`;
    text += `PRICE SUMMARY:\n`;
    text += `  - Total Raw Materials: Rs. ${(calcData.totals.materialCost + calcData.totals.backingCost).toFixed(2)}\n`;
    text += `  - Hardware & Edge Banding: Rs. ${calcData.totals.hardwareCost.toFixed(2)}\n`;
    text += `  - Factory Crafting & Labor: Rs. ${calcData.totals.laborCost.toFixed(2)}\n`;
    text += `  - Packaging & Factory Overhead: Rs. ${(calcData.totals.packagingCost + calcData.totals.toolingCost).toFixed(2)}\n`;
    text += `  - Margin (Profit 25%): Rs. ${calcData.totals.profitMargin.toFixed(2)}\n`;
    text += `====================================\n`;
    text += `ESTIMATED CUSTOM PRICE: Rs. ${calcData.totals.grandTotal.toFixed(0)}\n`;
    text += `====================================\n`;

    navigator.clipboard.writeText(text);
    alert("Specifications copied to clipboard!");
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(63, 70, 229);
    doc.text("SRK MODULAR FURNITURE", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Premium Custom Drawers and Storage Pricing Quote", 14, 26);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

    // Specifications
    const specData = [
      ["Parameter", "Selected Configuration"],
      ["Overall Size", `${width}mm (W) x ${depth}mm (D) x ${height}mm (H)`],
      ["Number of Bays/Columns", `${numBays} Column compartments`],
      ["Primary Carcass Board", `${activeBoard.name} (${boardThickness}mm)`],
      ["Total Board Area (Sq.Ft)", `${calcData.totals.boardsSqFt.toFixed(2)} sq.ft`],
      ["Laminate/Mica Finish", `Inner: ${innerMica}mm, Outer: ${outerMica}mm`],
      ["Quality Tier", `${quality.toUpperCase()}`],
      ["Support Base Legs", `${supportLegsCount} pcs`],
    ];

    autoTable(doc, {
      head: [specData[0]],
      body: specData.slice(1),
      startY: 38,
      theme: "striped",
      headStyles: { fillColor: [63, 70, 229], textColor: 255 },
    });

    // Column description table
    const colTableBody = bays.map((bay, i) => {
      let desc = "";
      if (bay.style === "open") desc = `Plain cabinet with ${bay.shelves} adjustable open shelves.`;
      else if (bay.style === "shutter_solid") desc = `Single wood door shutter with handle, ${bay.shelves} inner shelves, lock style: ${bay.lock}.`;
      else if (bay.style === "shutter_glass") desc = `Glass front display shutter with border, ${bay.shelves} visible inner shelves.`;
      else if (bay.style === "shutters_double") desc = `Double wooden shutters split, ${bay.shelves} inner shelves, lock: ${bay.lock}.`;
      else if (bay.style === "3_drawers") desc = `3 stacked drawer units with channels, handle, central/indiv lock.`;
      else if (bay.style === "2_drawers") desc = `2 stacked heavy-duty drawer files, locks: ${bay.lock}.`;
      else if (bay.style === "1_drawer") desc = `1 full-height deep drawer, locks: ${bay.lock}.`;
      else if (bay.style === "1_drawer_open") desc = `1 utility drawer at top, open workspace/shelving space below.`;
      return [`Column ${i + 1}`, bay.style.toUpperCase().replace("_", " "), desc];
    });

    autoTable(doc, {
      head: [["Column Compartment", "Design Style", "Internal Shelving & Accessories Details"]],
      body: colTableBody,
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    // Parts list
    const partsBody = calcData.pieces.map((p) => [
      p.label,
      `${p.w} x ${p.l}`,
      p.qty,
      p.areaSqFt.toFixed(2),
      p.wasteSqFt.toFixed(2),
      `Rs. ${p.rate.toFixed(0)}`,
      `Rs. ${p.cost.toFixed(0)}`,
    ]);

    autoTable(doc, {
      head: [["Cutting Piece List", "Size (mm)", "Qty", "Area (Sq.Ft)", "Wastage", "Rate / Sq.Ft", "Total Cost"]],
      body: partsBody,
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "striped",
      headStyles: { fillColor: [100, 116, 139] },
    });

    // Final Pricing Summary
    const priceSummary = [
      ["Carcass Board Material Cost", `Rs. ${calcData.totals.materialCost.toFixed(2)}`],
      ["Backing PLPB Panel Cost", `Rs. ${calcData.totals.backingCost.toFixed(2)}`],
      ["Hardware & Edge Banding Cost", `Rs. ${calcData.totals.hardwareCost.toFixed(2)}`],
      ["Craftsmanship & Labor Charges", `Rs. ${calcData.totals.laborCost.toFixed(2)}`],
      ["Factory Overheads (Packing & Tooling)", `Rs. ${(calcData.totals.packagingCost + calcData.totals.toolingCost).toFixed(2)}`],
      ["Profit Margin (25%)", `Rs. ${calcData.totals.profitMargin.toFixed(2)}`],
      ["ESTIMATED CUSTOM QUOTE (GRAND TOTAL)", `Rs. ${calcData.totals.grandTotal.toFixed(0)}`],
    ];

    autoTable(doc, {
      head: [["Cost Category Component", "Valuation Amount (Rs)"]],
      body: priceSummary,
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        1: { fontStyle: "bold", textColor: [63, 70, 229] },
      },
    });

    doc.save(`SRK-Custom-Storage-${width}x${height}.pdf`);
  };

  // Export Excel
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const overviewData = [
      { Parameter: "Overall Width (mm)", Value: width },
      { Parameter: "Overall Depth (mm)", Value: depth },
      { Parameter: "Overall Height (mm)", Value: height },
      { Parameter: "Bays count", Value: numBays },
      { Parameter: "Board Material", Value: activeBoard.name },
      { Parameter: "Total Board Area (Sq.Ft)", Value: calcData.totals.boardsSqFt.toFixed(2) },
      { Parameter: "Board Thickness (mm)", Value: boardThickness },
      { Parameter: "Quality Tier", Value: quality.toUpperCase() },
      { Parameter: "Inner Mica", Value: innerMica },
      { Parameter: "Outer Mica", Value: outerMica },
    ];

    const cuttingPieces = calcData.pieces.map((p) => ({
      "Component Name": p.label,
      "Width (mm)": p.w,
      "Length (mm)": p.l,
      "Quantity": p.qty,
      "Area (Sq.Ft)": Number(p.areaSqFt.toFixed(3)),
      "Wastage (Sq.Ft)": Number(p.wasteSqFt.toFixed(3)),
      "Total Sq.Ft": Number(p.totalSqFt.toFixed(3)),
      "Rate (Rs/Sq.Ft)": p.rate,
      "Net Cost (Rs)": Number(p.cost.toFixed(0)),
    }));

    const hardwarePieces = calcData.hardware.map((h) => ({
      "Hardware Component": h.label,
      "Quantity": h.qty,
      "Unit": h.unit,
      "Unit Rate (Rs)": h.unitPrice,
      "Total Cost (Rs)": Number(h.cost.toFixed(0)),
    }));

    const pricingSummary = [
      { Category: "Carcass Materials Cost", Cost: Number(calcData.totals.materialCost.toFixed(2)) },
      { Category: "Backing PLPB Cost", Cost: Number(calcData.totals.backingCost.toFixed(2)) },
      { Category: "Accessories & Hinges Cost", Cost: Number(calcData.totals.hardwareCost.toFixed(2)) },
      { Category: "Assembly & Manufacturing Labor", Cost: Number(calcData.totals.laborCost.toFixed(2)) },
      { Category: "Overhead (Packing & Tooling)", Cost: Number((calcData.totals.packagingCost + calcData.totals.toolingCost).toFixed(2)) },
      { Category: "Profit Margin (25%)", Cost: Number(calcData.totals.profitMargin.toFixed(2)) },
      { Category: "GRAND TOTAL CUSTOM PRICE", Cost: Number(calcData.totals.grandTotal.toFixed(0)) },
    ];

    const wsOverview = XLSX.utils.json_to_sheet(overviewData);
    const wsCutting = XLSX.utils.json_to_sheet(cuttingPieces);
    const wsHardware = XLSX.utils.json_to_sheet(hardwarePieces);
    const wsPrice = XLSX.utils.json_to_sheet(pricingSummary);

    XLSX.utils.book_append_sheet(wb, wsOverview, "Specs Overview");
    XLSX.utils.book_append_sheet(wb, wsPrice, "Price Analysis");
    XLSX.utils.book_append_sheet(wb, wsCutting, "Cutting List");
    XLSX.utils.book_append_sheet(wb, wsHardware, "Hardware Details");

    XLSX.writeFile(wb, `SRK-Custom-Storage-${width}x${height}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Calculator className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              SRK Furniture Calculator Suite
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Custom Drawers & Storage Builder
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Design highly tailored cabinets, credenzas, and drawer bays. Adjust column partition layout, drawers count, and door hinges in real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {projectId ? (
            <button
              onClick={() => {
                const itemName = `Storage ${width}x${depth}x${height} (${activeBoard.id})`;
                const itemData = {
                  productType: 'custom-storage' as const,
                  name: itemName,
                  config: {
                    activeTab, width, depth, height, drawerWidth, drawerDepth,
                    drawerHeight, drawerLock, drawerHandle, quality, boardId,
                    boardThickness, innerMica, outerMica, numBays, supportLegsCount,
                    bays
                  },
                  costSummary: {
                    totalCost: calcData.totals.grandTotal,
                    totalSqFt: calcData.totals.boardsSqFt,
                    boardDetails: calcData.pieces,
                    hardwareDetails: calcData.hardware,
                  }
                };

                if (editItemId) {
                  updateItemInProject(projectId, editItemId, itemData);
                  alert("Project item updated successfully!");
                } else {
                  addItemToProject(projectId, itemData);
                  alert("Added to Project successfully!");
                }
                navigate(`/project/${projectId}`);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100/80 transition-all shadow-sm"
            >
              {editItemId ? "Save Changes" : "Save to Project"}
            </button>
          ) : null}
          <button
            onClick={copySpecifications}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <Copy className="w-4 h-4 text-gray-500" />
            Copy Quote
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100/80 hover:border-emerald-200 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100/80 hover:border-rose-200 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-rose-600" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl w-full max-w-md">
        <button
          onClick={() => setActiveTab("storage")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === "storage"
              ? "bg-white text-indigo-600 shadow-sm border border-gray-200/60"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          Storage Builder
        </button>
        <button
          onClick={() => setActiveTab("drawer")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === "drawer"
              ? "bg-white text-indigo-600 shadow-sm border border-gray-200/60"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          Single Drawer Calculator
        </button>
      </div>

      {activeTab === "storage" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Side: Parameters and configuration */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Section 1: Dimensions & Boards */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Ruler className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                1. Dimensions & Material Base
              </h2>
            </div>

            {/* Quality Tier Selection */}
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Quality Tier Selection
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setQuality("standard")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    quality === "standard"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium shadow-sm shadow-indigo-100/55"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-xs font-bold">Standard Quality</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">High durability office tier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuality("affordable")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    quality === "affordable"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium shadow-sm shadow-indigo-100/55"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-xs font-bold">Affordable Quality</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Cost-optimized home/office tier</span>
                </button>
              </div>
            </div>

            {/* 3 Sliders for W x D x H */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Width */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex justify-between">
                  <span>Width (W)</span>
                  <span className="font-semibold text-indigo-600 font-mono">{width} mm</span>
                </label>
                <input
                  type="range"
                  min="600"
                  max="2400"
                  step="50"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>600 mm</span>
                  <span>2400 mm</span>
                </div>
              </div>

              {/* Depth */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex justify-between">
                  <span>Depth (D)</span>
                  <span className="font-semibold text-indigo-600 font-mono">{depth} mm</span>
                </label>
                <input
                  type="range"
                  min="300"
                  max="900"
                  step="50"
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>300 mm</span>
                  <span>900 mm</span>
                </div>
              </div>

              {/* Height */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex justify-between">
                  <span>Height (H)</span>
                  <span className="font-semibold text-indigo-600 font-mono">{height} mm</span>
                </label>
                <input
                  type="range"
                  min="600"
                  max="2100"
                  step="50"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>600 mm</span>
                  <span>2100 mm</span>
                </div>
              </div>
            </div>

            {/* Board Material and Thickness Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Carcass Board Material
                </label>
                <select
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Base Rate: Rs {b.costPerSqFt}/sq.ft)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Board Thickness
                </label>
                <select
                  value={boardThickness}
                  onChange={(e) => setBoardThickness(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                >
                  {getAvailableThicknesses(boardId, quality).map((t) => (
                    <option key={t} value={t}>
                      {t} mm
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mica/Laminate Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Inner Laminate/Mica Finish
                </label>
                <select
                  value={innerMica}
                  onChange={(e) => setInnerMica(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="none">Raw Finish (No Inner Mica)</option>
                  <option value="0.8">0.8 mm Laminate (+Rs 35/sq.ft)</option>
                  <option value="1.0">1.0 mm Laminate (+Rs 56/sq.ft)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Outer Laminate/Mica Finish
                </label>
                <select
                  value={outerMica}
                  onChange={(e) => setOuterMica(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="none">Raw Finish (No Outer Mica)</option>
                  <option value="0.8">0.8 mm Laminate (+Rs 35/sq.ft)</option>
                  <option value="1.0">1.0 mm Laminate (+Rs 56/sq.ft)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Section 2: Columns Partition Builder */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                  2. Columns & Front configuration
                </h2>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setNumBays(Math.max(1, numBays - 1))}
                  disabled={numBays <= 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-gray-900 text-sm font-mono">{numBays} Bays</span>
                <button
                  type="button"
                  onClick={() => setNumBays(Math.min(5, numBays + 1))}
                  disabled={numBays >= 5}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Individual Bay configurator cards */}
            <div className="space-y-4">
              {bays.map((bay, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-gray-150 bg-gray-50/55 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group hover:border-indigo-200 hover:bg-white transition-all"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                  
                  {/* Bay Details */}
                  <div className="space-y-1.5 md:w-1/3">
                    <span className="text-xs font-bold text-gray-400 font-mono">Compartment #{idx + 1}</span>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      Bay Width: <span className="text-indigo-600 font-mono">{Math.round(calcData.bayWidth)} mm</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Calculated from width of outer shell minus vertical dividers
                    </p>
                  </div>

                  {/* Config options */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {/* Style select */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Display Layout Style
                      </label>
                      <select
                        value={bay.style}
                        onChange={(e) => updateBay(idx, { style: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:border-indigo-500 outline-none"
                      >
                        <option value="open">Open Shelves</option>
                        <option value="shutter_solid">Solid Single Shutter</option>
                        <option value="shutter_glass">Glass Cabinet Shutter</option>
                        <option value="shutters_double">Double Shutters (Split)</option>
                        <option value="3_drawers">3 drawers stack</option>
                        <option value="2_drawers">2 drawers file stack</option>
                        <option value="1_drawer">1 single drawer (full height)</option>
                        <option value="1_drawer_open">1 drawer at top + Open Shelves</option>
                      </select>
                    </div>

                    {/* Dynamic suboptions */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Internal shelf slider for shutter types */}
                      {["open", "shutter_solid", "shutter_glass", "shutters_double", "1_drawer_open"].includes(bay.style) ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Inner Shelves
                          </label>
                          <select
                            value={bay.shelves}
                            onChange={(e) => updateBay(idx, { shelves: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono outline-none"
                          >
                            <option value={0}>0 Shelves</option>
                            <option value={1}>1 Shelf</option>
                            <option value={2}>2 Shelves</option>
                            <option value={3}>3 Shelves</option>
                          </select>
                        </div>
                      ) : (
                        <div className="opacity-40 select-none">
                          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Inner Shelves
                          </label>
                          <div className="px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-mono text-gray-500">
                            N/A (Drawer)
                          </div>
                        </div>
                      )}

                      {/* Hardware selection (Lock / Handle) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Security Lock
                        </label>
                        {["open"].includes(bay.style) ? (
                          <div className="px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-mono text-gray-500 opacity-40">
                            None
                          </div>
                        ) : (
                          <select
                            value={bay.lock}
                            onChange={(e) => updateBay(idx, { lock: e.target.value as any })}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                          >
                            <option value="none">No Locks</option>
                            <option value="individual">Key Lock</option>
                            {["3_drawers", "2_drawers"].includes(bay.style) && (
                              <option value="central">Central Lock</option>
                            )}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Handle settings */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {bay.style !== "open" && (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={bay.handle}
                          onChange={(e) => updateBay(idx, { handle: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs font-medium text-gray-500">Handles</span>
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Section 3: Detailed Cutting piece specifications list */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                  3. Board cutting list & Panels breakdown
                </h2>
              </div>
              <span className="text-xs font-bold text-indigo-600 font-mono bg-indigo-50 px-2.5 py-1 rounded-lg">
                {calcData.pieces.length} unique pieces
              </span>
            </div>

            <div className="overflow-x-auto max-h-[350px] overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 font-semibold sticky top-0">
                    <th className="p-3">Panel Description</th>
                    <th className="p-3 text-right">Size (mm)</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Total Area (Sq.Ft)</th>
                    <th className="p-3 text-right">Rate Used</th>
                    <th className="p-3 text-right">Cost (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700 font-mono">
                  {calcData.pieces.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50/55 transition-colors">
                      <td className="p-3 font-sans font-medium text-gray-900">{p.label}</td>
                      <td className="p-3 text-right">{p.w} x {p.l}</td>
                      <td className="p-3 text-center font-bold">{p.qty}</td>
                      <td className="p-3 text-right">{(p.totalSqFt).toFixed(2)} <span className="text-[10px] text-gray-400">inc. 15%</span></td>
                      <td className="p-3 text-right">Rs {p.rate.toFixed(0)}</td>
                      <td className="p-3 text-right font-bold text-gray-900">Rs {p.cost.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 leading-relaxed font-sans">
              <strong>* Cost formulation logic:</strong> Board sq.ft rate calculated with dynamic density waste adjustments (+15% allowance). Mica overlays (Inner + Outer) are layered on top of core board rates if active. Backing panels (9mm PLPB) are estimated at standard factory cost.
            </div>
          </div>

        </div>

        {/* Right Side: Interactive vector 2D preview & cost sum card */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Section 4: Live 2D Front View Vector Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                  Live 2D Interactive Draft (Front View)
                </h2>
              </div>
              <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                Scaling active
              </span>
            </div>

            {/* SVG drawing canvas container */}
            <div className="aspect-[4/3] bg-slate-900 rounded-xl flex items-center justify-center p-6 border border-slate-800 shadow-inner relative overflow-hidden">
              <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-500 text-right">
                W: {width}mm <br />
                H: {height}mm <br />
                D: {depth}mm
              </div>

              {/* Dynamic SVG Drawing */}
              <svg
                viewBox="0 0 500 350"
                className="w-full h-full drop-shadow-2xl"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Defs for hatches or shadows */}
                <defs>
                  <pattern id="wood" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M0,10 Q20,15 40,10 M0,30 Q20,25 40,30" stroke="#334155" strokeWidth="0.5" fill="none" opacity="0.35" />
                  </pattern>
                  <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="40%" stopColor="#0284c7" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Draw main outer storage body frame */}
                {/* Left/Right Offset to center inside viewport */}
                {(() => {
                  const paddingX = 40;
                  const paddingY = 40;
                  const drawW = 420;
                  const drawH = 240;

                  // Outer Rect (Main cabinet body)
                  return (
                    <g>
                      {/* Carcass outer box */}
                      <rect
                        x={paddingX}
                        y={paddingY}
                        width={drawW}
                        height={drawH}
                        fill="#1e293b"
                        stroke="#475569"
                        strokeWidth="3.5"
                        rx="4"
                      />
                      
                      {/* Carcass texture hatch */}
                      <rect
                        x={paddingX + 6}
                        y={paddingY + 6}
                        width={drawW - 12}
                        height={drawH - 12}
                        fill="url(#wood)"
                        pointerEvents="none"
                      />

                      {/* Inner carcass border representing board thickness */}
                      <rect
                        x={paddingX + 8}
                        y={paddingY + 8}
                        width={drawW - 16}
                        height={drawH - 16}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeDasharray="2,2"
                      />

                      {/* Support Base legs at bottom */}
                      {/* Left Leg */}
                      <rect
                        x={paddingX + 16}
                        y={paddingY + drawH}
                        width="14"
                        height="18"
                        fill="#64748b"
                        stroke="#475569"
                        strokeWidth="1.5"
                        rx="2"
                      />
                      {/* Right Leg */}
                      <rect
                        x={paddingX + drawW - 30}
                        y={paddingY + drawH}
                        width="14"
                        height="18"
                        fill="#64748b"
                        stroke="#475569"
                        strokeWidth="1.5"
                        rx="2"
                      />
                      {/* Center Leg for long units */}
                      {supportLegsCount === 6 && (
                        <rect
                          x={paddingX + drawW / 2 - 7}
                          y={paddingY + drawH}
                          width="14"
                          height="18"
                          fill="#64748b"
                          stroke="#475569"
                          strokeWidth="1.5"
                          rx="2"
                        />
                      )}

                      {/* Draw column dividers and styles */}
                      {bays.map((bay, idx) => {
                        const bayW = (drawW - 16) / numBays;
                        const bayX = paddingX + 8 + idx * bayW;
                        const bayY = paddingY + 8;
                        const bayH = drawH - 16;

                        return (
                          <g key={idx}>
                            {/* Vertical divider lines between bays */}
                            {idx > 0 && (
                              <line
                                x1={bayX}
                                y1={bayY}
                                x2={bayX}
                                y2={bayY + bayH}
                                stroke="#475569"
                                strokeWidth="2.5"
                              />
                            )}

                            {/* Render different cabinet styles inside columns */}
                            {bay.style === "open" && (
                              <g>
                                {/* Draw horizontal open shelves */}
                                {Array.from({ length: bay.shelves }).map((_, sIdx) => {
                                  const sY = bayY + ((sIdx + 1) * bayH) / (bay.shelves + 1);
                                  return (
                                    <line
                                      key={sIdx}
                                      x1={bayX + 2}
                                      y1={sY}
                                      x2={bayX + bayW - 2}
                                      y2={sY}
                                      stroke="#475569"
                                      strokeWidth="2"
                                    />
                                  );
                                })}
                              </g>
                            )}

                            {bay.style === "shutter_solid" && (
                              <g>
                                {/* Shutter face panel */}
                                <rect
                                  x={bayX + 2}
                                  y={bayY + 2}
                                  width={bayW - 4}
                                  height={bayH - 4}
                                  fill="#334155"
                                  stroke="#475569"
                                  strokeWidth="1"
                                  rx="2"
                                />
                                {/* Handle indicator (vertical bar) */}
                                {bay.handle && (
                                  <rect
                                    x={bayX + bayW - 8}
                                    y={bayY + bayH / 2 - 20}
                                    width="2.5"
                                    height="40"
                                    fill="#94a3b8"
                                    rx="1"
                                  />
                                )}
                                {/* Lock circle keyhole */}
                                {bay.lock === "individual" && (
                                  <circle cx={bayX + bayW - 14} cy={bayY + bayH / 2} r="2" fill="#e2e8f0" />
                                )}
                                {/* Wood grain hatch within shutter */}
                                <rect
                                  x={bayX + 4}
                                  y={bayY + 4}
                                  width={bayW - 8}
                                  height={bayH - 8}
                                  fill="url(#wood)"
                                  opacity="0.2"
                                  pointerEvents="none"
                                />
                              </g>
                            )}

                            {bay.style === "shutter_glass" && (
                              <g>
                                {/* Outer frame of shutter */}
                                <rect
                                  x={bayX + 2}
                                  y={bayY + 2}
                                  width={bayW - 4}
                                  height={bayH - 4}
                                  fill="#1e293b"
                                  stroke="#475569"
                                  strokeWidth="2.5"
                                  rx="2"
                                />
                                {/* Glass center pane */}
                                <rect
                                  x={bayX + 12}
                                  y={bayY + 12}
                                  width={bayW - 24}
                                  height={bayH - 24}
                                  fill="url(#glass)"
                                  stroke="#0284c7"
                                  strokeWidth="0.75"
                                  rx="1"
                                />
                                {/* Diagonal glass reflection lines */}
                                <line x1={bayX + 16} y1={bayY + 20} x2={bayX + bayW - 20} y2={bayY + bayH - 20} stroke="#bae6fd" strokeWidth="0.5" opacity="0.4" />
                                <line x1={bayX + 24} y1={bayY + 20} x2={bayX + bayW - 28} y2={bayY + bayH - 40} stroke="#bae6fd" strokeWidth="0.5" opacity="0.4" />
                                
                                {/* Visible shelves inside glass */}
                                {Array.from({ length: bay.shelves }).map((_, sIdx) => {
                                  const sY = bayY + ((sIdx + 1) * bayH) / (bay.shelves + 1);
                                  return (
                                    <line
                                      key={sIdx}
                                      x1={bayX + 12}
                                      y1={sY}
                                      x2={bayX + bayW - 12}
                                      y2={sY}
                                      stroke="#475569"
                                      strokeWidth="1.5"
                                      strokeDasharray="2,2"
                                    />
                                  );
                                })}

                                {/* Handle */}
                                {bay.handle && (
                                  <rect
                                    x={bayX + bayW - 11}
                                    y={bayY + bayH / 2 - 15}
                                    width="2"
                                    height="30"
                                    fill="#f1f5f9"
                                  />
                                )}
                              </g>
                            )}

                            {bay.style === "shutters_double" && (
                              <g>
                                {/* Left Door shutter */}
                                <rect
                                  x={bayX + 2}
                                  y={bayY + 2}
                                  width={bayW / 2 - 3}
                                  height={bayH - 4}
                                  fill="#334155"
                                  stroke="#475569"
                                  strokeWidth="1"
                                  rx="2"
                                />
                                {/* Right Door shutter */}
                                <rect
                                  x={bayX + bayW / 2 + 1}
                                  y={bayY + 2}
                                  width={bayW / 2 - 3}
                                  height={bayH - 4}
                                  fill="#334155"
                                  stroke="#475569"
                                  strokeWidth="1"
                                  rx="2"
                                />
                                {/* Center split gap line */}
                                <line x1={bayX + bayW / 2} y1={bayY + 2} x2={bayX + bayW / 2} y2={bayY + bayH - 2} stroke="#1e293b" strokeWidth="1" />
                                
                                {/* 2 Handles adjacent to the center split */}
                                {bay.handle && (
                                  <g>
                                    <rect x={bayX + bayW / 2 - 5} y={bayY + bayH / 2 - 15} width="2" height="30" fill="#94a3b8" />
                                    <rect x={bayX + bayW / 2 + 3} y={bayY + bayH / 2 - 15} width="2" height="30" fill="#94a3b8" />
                                  </g>
                                )}

                                {/* Lock keyhole */}
                                {bay.lock === "individual" && (
                                  <circle cx={bayX + bayW / 2 + 10} cy={bayY + bayH / 2} r="2" fill="#e2e8f0" />
                                )}
                              </g>
                            )}

                            {bay.style === "3_drawers" && (
                              <g>
                                {Array.from({ length: 3 }).map((_, dIdx) => {
                                  const dH = bayH / 3;
                                  const dY = bayY + dIdx * dH;
                                  return (
                                    <g key={dIdx}>
                                      {/* Drawer front rectangular panel */}
                                      <rect
                                        x={bayX + 2}
                                        y={dY + 2}
                                        width={bayW - 4}
                                        height={dH - 4}
                                        fill="#475569"
                                        stroke="#334155"
                                        strokeWidth="1"
                                        rx="2"
                                      />
                                      {/* Drawer handle indicator (centered horizontal profile) */}
                                      {bay.handle && (
                                        <rect
                                          x={bayX + bayW / 2 - 25}
                                          y={dY + dH / 2 - 2}
                                          width="50"
                                          height="4"
                                          fill="#94a3b8"
                                          rx="1"
                                        />
                                      )}
                                      {/* Individual key lock on each or central lock on top */}
                                      {((bay.lock === "central" && dIdx === 0) || (bay.lock === "individual")) && (
                                        <circle cx={bayX + bayW - 12} cy={dY + 10} r="1.5" fill="#e2e8f0" />
                                      )}
                                    </g>
                                  );
                                })}
                              </g>
                            )}

                            {bay.style === "2_drawers" && (
                              <g>
                                {Array.from({ length: 2 }).map((_, dIdx) => {
                                  const dH = bayH / 2;
                                  const dY = bayY + dIdx * dH;
                                  return (
                                    <g key={dIdx}>
                                      {/* Drawer front rectangular panel */}
                                      <rect
                                        x={bayX + 2}
                                        y={dY + 2}
                                        width={bayW - 4}
                                        height={dH - 4}
                                        fill="#475569"
                                        stroke="#334155"
                                        strokeWidth="1"
                                        rx="2"
                                      />
                                      {/* Drawer handle indicator */}
                                      {bay.handle && (
                                        <rect
                                          x={bayX + bayW / 2 - 30}
                                          y={dY + dH / 2 - 2.5}
                                          width="60"
                                          height="5"
                                          fill="#94a3b8"
                                          rx="1"
                                        />
                                      )}
                                      {/* Lock keyhole */}
                                      {((bay.lock === "central" && dIdx === 0) || (bay.lock === "individual")) && (
                                        <circle cx={bayX + bayW - 12} cy={dY + 12} r="1.5" fill="#e2e8f0" />
                                      )}
                                    </g>
                                  );
                                })}
                              </g>
                            )}

                            {bay.style === "1_drawer" && (
                              <g>
                                <rect
                                  x={bayX + 2}
                                  y={bayY + 2}
                                  width={bayW - 4}
                                  height={bayH - 4}
                                  fill="#475569"
                                  stroke="#334155"
                                  strokeWidth="1"
                                  rx="2"
                                />
                                {/* Drawer handle indicator */}
                                {bay.handle && (
                                  <rect
                                    x={bayX + bayW / 2 - 30}
                                    y={bayY + bayH / 2 - 2.5}
                                    width="60"
                                    height="5"
                                    fill="#94a3b8"
                                    rx="1"
                                  />
                                )}
                                {/* Lock keyhole */}
                                {bay.lock === "individual" && (
                                  <circle cx={bayX + bayW - 12} cy={bayY + 12} r="1.5" fill="#e2e8f0" />
                                )}
                              </g>
                            )}

                            {bay.style === "1_drawer_open" && (
                              <g>
                                {/* Drawer box panel at the top */}
                                {(() => {
                                  const dH = Math.min(65, bayH / 3);
                                  const dY = bayY;
                                  return (
                                    <g>
                                      <rect
                                        x={bayX + 2}
                                        y={dY + 2}
                                        width={bayW - 4}
                                        height={dH - 4}
                                        fill="#475569"
                                        stroke="#334155"
                                        strokeWidth="1"
                                        rx="2"
                                      />
                                      {bay.handle && (
                                        <rect
                                          x={bayX + bayW / 2 - 25}
                                          y={dY + dH / 2 - 2}
                                          width="50"
                                          height="4"
                                          fill="#94a3b8"
                                          rx="1"
                                        />
                                      )}
                                      {bay.lock === "individual" && (
                                        <circle cx={bayX + bayW - 12} cy={dY + 10} r="1.5" fill="#e2e8f0" />
                                      )}

                                      {/* Divider shelf line below drawer */}
                                      <line
                                        x1={bayX + 1}
                                        y1={dY + dH}
                                        x2={bayX + bayW - 1}
                                        y2={dY + dH}
                                        stroke="#334155"
                                        strokeWidth="2"
                                      />

                                      {/* Render open adjustable shelves inside remaining space below drawer */}
                                      {Array.from({ length: bay.shelves }).map((_, sIdx) => {
                                        const remainingH = bayH - dH;
                                        const sY = dY + dH + ((sIdx + 1) * remainingH) / (bay.shelves + 1);
                                        return (
                                          <line
                                            key={sIdx}
                                            x1={bayX + 3}
                                            y1={sY}
                                            x2={bayX + bayW - 3}
                                            y2={sY}
                                            stroke="#475569"
                                            strokeWidth="1.5"
                                          />
                                        );
                                      })}
                                    </g>
                                  );
                                })()}
                              </g>
                            )}

                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Section 5: Estimated Custom Quote Pricing breakdown card */}
          <div className="bg-slate-900 rounded-2xl shadow-lg p-6 text-white space-y-4 border border-slate-800">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <IndianRupee className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-300">
                Cost & Factory Quote breakdown
              </h2>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Carcass Board Material:</span>
                <span>Rs {calcData.totals.materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Backing PLPB (9mm Panel):</span>
                <span>Rs {calcData.totals.backingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Total Hardware & Edge Banding:</span>
                <span>Rs {calcData.totals.hardwareCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Factory Crafting Labor:</span>
                <span>Rs {calcData.totals.laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Factory Overheads (Packing/Overhead):</span>
                <span>Rs {(calcData.totals.packagingCost + calcData.totals.toolingCost).toFixed(2)}</span>
              </div>
              
              <div className="border-t border-slate-800 my-2 pt-2.5 flex justify-between font-medium text-slate-300">
                <span>Net Manufacturing Cost:</span>
                <span className="font-mono">Rs {calcData.totals.netManufacturingCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-400 font-mono">
                <span>Factory Markup / Profit (25%):</span>
                <span>Rs {calcData.totals.profitMargin.toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-dashed border-slate-800 my-2.5 pt-4 flex justify-between items-baseline">
                <span className="font-bold text-base text-slate-200">GRAND TOTAL PRICE:</span>
                <span className="font-mono text-2xl font-bold text-indigo-400">
                  Rs {calcData.totals.grandTotal.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Quick specifications breakdown taglines */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-1.5 font-mono">
              <div className="text-slate-500 font-semibold uppercase tracking-wider mb-1 text-[10px]">
                Product DNA Summary
              </div>
              <div>• Shell Size: {width} x {depth} x {height} mm</div>
              <div>• Columns Configured: {numBays} partitions</div>
              <div>• Core Board Wood: {activeBoard.name}</div>
              <div>• Outer Mica overlay: {outerMica === "none" ? "None" : `${outerMica}mm overlay`}</div>
            </div>
          </div>

          {/* Hardware list breakdown card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Layers className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                Hardware Fittings Breakdown
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100 text-xs font-mono">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 font-semibold font-sans">
                    <th className="p-2.5">Accessory Part</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Net Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {calcData.hardware.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50/40">
                      <td className="p-2.5 font-sans font-medium text-gray-900">{h.label}</td>
                      <td className="p-2.5 text-right font-bold">{h.qty} <span className="text-[10px] text-gray-400">{h.unit}</span></td>
                      <td className="p-2.5 text-right">Rs {h.unitPrice}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">Rs {h.cost.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
      )}

      {activeTab === "drawer" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Side: Parameters */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Ruler className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                  Single Drawer Dimensions
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Drawer Width */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 flex justify-between">
                    <span>Width (W)</span>
                    <span className="font-semibold text-indigo-600 font-mono">{drawerWidth} mm</span>
                  </label>
                  <input
                    type="range"
                    min="300"
                    max="1200"
                    step="50"
                    value={drawerWidth}
                    onChange={(e) => setDrawerWidth(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>300 mm</span>
                    <span>1200 mm</span>
                  </div>
                </div>

                {/* Drawer Depth */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 flex justify-between">
                    <span>Depth (D)</span>
                    <span className="font-semibold text-indigo-600 font-mono">{drawerDepth} mm</span>
                  </label>
                  <input
                    type="range"
                    min="300"
                    max="600"
                    step="50"
                    value={drawerDepth}
                    onChange={(e) => setDrawerDepth(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>300 mm</span>
                    <span>600 mm</span>
                  </div>
                </div>

                {/* Drawer Height */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 flex justify-between">
                    <span>Face Height (H)</span>
                    <span className="font-semibold text-indigo-600 font-mono">{drawerHeight} mm</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="400"
                    step="20"
                    value={drawerHeight}
                    onChange={(e) => setDrawerHeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>100 mm</span>
                    <span>400 mm</span>
                  </div>
                </div>
              </div>

              {/* Drawer Hardware Options */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={drawerHandle}
                    onChange={(e) => setDrawerHandle(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Handle</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={drawerLock}
                    onChange={(e) => setDrawerLock(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Key Lock</span>
                </label>
              </div>

            </div>

            {/* Detailed Cutting piece specifications list */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                    Drawer Parts List
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 font-semibold font-mono">
                      <th className="p-3">Part Name</th>
                      <th className="p-3">W × L (mm)</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Sq.Ft</th>
                      <th className="p-3 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    {drawerCalcData.pieces.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="p-3 font-medium text-gray-900 font-sans">{p.label}</td>
                        <td className="p-3 font-mono">{p.w.toFixed(0)} × {p.l.toFixed(0)}</td>
                        <td className="p-3 text-center font-bold">{p.qty}</td>
                        <td className="p-3 text-right font-mono">{p.areaSqFt.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold font-mono">Rs {p.cost.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Side: Cost Overview */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white border border-slate-800 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Drawer Cost</h2>
                  <p className="text-xs text-slate-400 font-mono">Net Valuation</p>
                </div>
              </div>

              <div className="space-y-4 text-sm flex-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Carcass Material Cost:</span>
                  <span className="font-mono font-medium">Rs {drawerCalcData.totals.materialCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Backing PLPB Cost:</span>
                  <span className="font-mono font-medium">Rs {drawerCalcData.totals.backingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Hardware & Channels:</span>
                  <span className="font-mono font-medium">Rs {drawerCalcData.totals.hardwareCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Assembly Labor:</span>
                  <span className="font-mono font-medium">Rs {drawerCalcData.totals.laborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Factory Overheads:</span>
                  <span className="font-mono font-medium">Rs {(drawerCalcData.totals.packagingCost + drawerCalcData.totals.toolingCost).toFixed(2)}</span>
                </div>
                
                <div className="my-4 border-t border-slate-700/60 pt-4" />

                <div className="flex justify-between font-bold text-slate-100">
                  <span>Manufacturing Cost:</span>
                  <span className="font-mono">Rs {drawerCalcData.totals.netManufacturingCost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Profit Margin (25%):</span>
                  <span>Rs {drawerCalcData.totals.profitMargin.toFixed(2)}</span>
                </div>

                <div className="border-t-2 border-dashed border-slate-800 my-2.5 pt-4 flex justify-between items-baseline">
                  <span className="font-bold text-base text-slate-200">TOTAL PRICE:</span>
                  <span className="font-mono text-2xl font-bold text-indigo-400">
                    Rs {drawerCalcData.totals.grandTotal.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Hardware list breakdown card */}
              <div className="mt-6 border-t border-slate-700 pt-4">
                <h3 className="text-xs font-semibold uppercase text-slate-400 mb-3 tracking-wider">Hardware Breakdown</h3>
                <div className="space-y-2">
                  {drawerCalcData.hardware.map((h, i) => (
                    <div key={i} className="flex justify-between text-xs items-center">
                      <span className="text-slate-300 font-sans">{h.qty}x {h.label}</span>
                      <span className="font-mono text-slate-400">Rs {h.cost.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
