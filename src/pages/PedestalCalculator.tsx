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
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const getBoards = (quality: string) => [
  { id: "plpb", name: "PLPB", costPerSqFt: quality === "affordable" ? 34 : 49 },
  { id: "mdf", name: "MDF", costPerSqFt: quality === "affordable" ? 38 : 61 },
  {
    id: "hdhmr",
    name: "HDHMR",
    costPerSqFt: quality === "affordable" ? 99 : 74,
  },
  {
    id: "ply_laminate",
    name: "PLY LAMINATE",
    costPerSqFt: quality === "affordable" ? 55 : 130,
  },
  {
    id: "ply_century_one_mm_laminate",
    name: "PLY CENTURY ONE MM LAMINATE",
    costPerSqFt: 230,
  },
];

export const getAvailableThicknesses = (
  boardId: string,
  quality: string,
): number[] => {
  if (quality === "affordable") {
    switch (boardId) {
      case "plpb":
        return [11, 17, 18, 25];
      case "mdf":
        return [17, 18, 25, 35];
      case "hdhmr":
        return [16.75, 18, 25];
      case "ply_laminate":
      case "ply_century_one_mm_laminate":
        return [6, 9, 12, 15, 16, 18];
      default:
        return [18];
    }
  } else {
    switch (boardId) {
      case "plpb":
        return [18, 25, 36];
      case "hdhmr":
        return [18, 25];
      case "mdf":
        return [18, 25, 36];
      case "ply_century_one_mm_laminate":
      case "ply_laminate":
        return [18, 25];
      default:
        return [18];
    }
  }
};

export const getBoardRate = (
  boardId: string,
  baseRate: number,
  thickness: number,
  quality: string,
): number => {
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
    // Standard quality logic
    if (boardId === "plpb") {
      if (thickness === 18) return 49;
      if (thickness === 25) return 63;
      if (thickness === 36) return 98;
    }
    if (boardId === "hdhmr") {
      if (thickness === 25) return 108;
    }
    if (boardId === "mdf") {
      if (thickness === 18) return 61;
      if (thickness === 25) return 83;
      if (thickness === 36) return 122;
    }
  }
  return baseRate * (thickness / 18);
};

const HARDWARE_CHANNEL_COST = 235;
const HARDWARE_HANDLE_COST = 50;
const HARDWARE_LOCK_COST = 120;
const HARDWARE_CENTRAL_LOCK_COST = 220;
const HARDWARE_SHUTTER_HINGE_COST = 62.5; // 125 per pair
const HARDWARE_CASTOR_COST = 180; // per set of 4
const LABOR_COST = 500;
const PACKING_COST = 300;
const TOOLING_COST = 100;
const PROFIT_PERCENTAGE = 0.25;

const PEDESTAL_TYPES = [
  {
    id: "1_drawer_1_shutter",
    name: "1 Drawer + 1 Shutter",
    drawers: 1,
    shutters: 1,
  },
  { id: "1_shutter", name: "1 Shutter", drawers: 0, shutters: 1 },
  { id: "2_shutter", name: "2 Shutters", drawers: 0, shutters: 2 },
  { id: "3_drawer", name: "3 Drawers", drawers: 3, shutters: 0 },
  { id: "2_drawer", name: "2 Drawers", drawers: 2, shutters: 0 },
  { id: "1_drawer_open", name: "1 Drawer + Open", drawers: 1, shutters: 0 },
];

export function calculatePedestalCost({
  width,
  height,
  depth,
  typeId,
  boardId,
  boardThickness = 18,
  wideStyle,
  wideInternalConfig,
  drawerLockType,
  setDrawerLockType = () => {},
  includeHandles,
  includeShutterLocks,
  includeShutterHandles,
  includeCastors,
  numShelves,
  quality = "standard",
  innerMica = "none",
  outerMica = "none",
}: any) {
  let pType = PEDESTAL_TYPES.find((t) => t.id === typeId)!;
  const boards = getBoards(quality);
  let board = boards.find((b) => b.id === boardId)!;

  const boardRate = getBoardRate(boardId, board.costPerSqFt, boardThickness, quality);

  const innerRate = innerMica === "0.8" ? 35 : innerMica === "1.0" ? 56 : 0;
  const outerRate = outerMica === "0.8" ? 35 : outerMica === "1.0" ? 56 : 0;
  const totalMicaRate = innerRate + outerRate;
  let numDrawers = pType.drawers;
  let numShutters = pType.shutters;
  let partitions = 0;
  let shelves = numShelves ?? 0;

  if (width >= 900) {
    if (wideStyle === "2_shelves") {
      numDrawers = 0;
      numShutters = 2;
      shelves = numShelves ?? 2;
      partitions = 0;
    } else if (wideStyle === "1_vertical_1_shelve") {
      numDrawers = 0;
      numShutters = 2;
      partitions = 1;
      shelves = numShelves ?? 1;
    } else if (wideStyle === "2_drawer_2_shutter") {
      numDrawers = 2;
      numShutters = 2;
      if (wideInternalConfig === "1_vert_1_horiz") {
        partitions = 1;
        shelves = numShelves ?? 1;
      } else {
        partitions = 0;
        shelves = numShelves ?? 2;
      }
    }
  }

  if (numDrawers !== 3 && drawerLockType === "central") {
    // Defer this update so it doesn't cause a bad state update within useMemo
    setTimeout(() => setDrawerLockType("none"), 0);
  }

  // Drawer internal box dimensions (mm)
  let dw = Math.max(0, width - 36);
  if (width >= 900 && partitions > 0) {
    dw = Math.max(0, (width - 54) / 2 - 36);
  }
  const dd = Math.max(0, depth - 36);

  // Drawer height proportional to outer height
  let dh = 0;
  if (numDrawers > 0) {
    if (width >= 900 && wideStyle === "2_drawer_2_shutter") {
      dh = Math.max(0, Math.round((height - 88) / 2));
    } else if (typeId === "3_drawer") {
      dh = Math.max(0, Math.round((height - 88) / 3));
    } else if (typeId === "2_drawer") {
      dh = Math.max(0, Math.round((height - 88) / 2));
    } else {
      dh = 154;
    }
  }

  const pieces: {
    label: string;
    w: number;
    l: number;
    qty: number;
    customCostPerSqFt?: number;
    ebMm?: number;
  }[] = [
    {
      label: "Top Panel",
      w: width,
      l: depth,
      qty: 1,
      ebMm: (width + depth) * 2,
    },
    { label: "Bottom Panel", w: width, l: depth, qty: 1, ebMm: width },
    {
      label: "Side Panels",
      w: depth,
      l: height,
      qty: 2,
      ebMm: (height * 2 + depth) * 2,
    },
    {
      label: "Back Panel (9mm PLPB)",
      w: width,
      l: height,
      qty: 1,
      customCostPerSqFt: 35,
      ebMm: 0,
    },
  ];

  if (partitions > 0) {
    pieces.push({
      label: "Vertical Partition",
      w: depth - 20,
      l: height - 36,
      qty: partitions,
      ebMm: Math.max(depth - 20, height - 36) * partitions, // vertical : one side (the longest exposed side)
    });
  }

  if (shelves > 0) {
    const shelfW = partitions > 0 ? (width - 54) / 2 : width - 36;
    pieces.push({
      label: "Shelves",
      w: shelfW,
      l: depth - 20,
      qty: shelves,
      ebMm: Math.max(shelfW, depth - 20) * shelves, // self : one side long
    });
  }

  if (numDrawers > 0) {
    pieces.push({
      label: "Drawer Bottoms",
      w: dw,
      l: dd,
      qty: numDrawers,
      customCostPerSqFt: 35,
      ebMm: 0,
    });
    pieces.push({
      label: "Drawer Sides",
      w: dd,
      l: dh,
      qty: numDrawers * 2,
      ebMm: dd * 2 * (numDrawers * 2),
    });
    pieces.push({
      label: "Drawer Inner F/B",
      w: dw,
      l: dh,
      qty: numDrawers * 2,
      ebMm: dw * 2 * numDrawers, // Only drawer back gets 2 long sides, inner front gets 0.
    });

    let faceW = width;
    let faceH = 0;
    if (width >= 900 && wideStyle === "2_drawer_2_shutter") {
      if (partitions > 0) {
        faceW = Math.round((width - 6) / 2);
        faceH = Math.round((height - 6) / 2);
      } else {
        faceW = width - 6;
        faceH = 154; // standard height for stacked full-width drawers
      }
    } else {
      faceH =
        typeId === "1_drawer_1_shutter" || typeId === "1_drawer_open"
          ? 154
          : Math.round(height / numDrawers);
    }

    pieces.push({
      label: "Drawer Faces",
      w: faceW,
      l: faceH,
      qty: numDrawers,
      ebMm: (faceW + faceH) * 2 * numDrawers,
    });
  }

  if (numShutters > 0) {
    let shutterW = width;
    let shutterH =
      numDrawers > 0 ? Math.max(0, height - 154 * numDrawers) : height;

    if (width >= 900) {
      if (wideStyle === "2_drawer_2_shutter") {
        if (partitions > 0) {
          shutterW = Math.round((width - 6) / 2);
          shutterH = height - 6;
        } else {
          shutterW = width - 6;
          shutterH = Math.max(0, height - 154 * numDrawers - 6);
        }
      } else {
        shutterW = Math.round((width - 6) / 2);
        shutterH = height - 6;
      }
    } else if (numShutters === 2) {
      shutterW = Math.round(width / 2);
    }

    let sEbMm = (shutterW + shutterH) * 2 * numShutters;
    if (typeId === "2_shutter" && width !== 900) {
      sEbMm = 0;
    }

    pieces.push({
      label: "Shutter Faces",
      w: shutterW,
      l: shutterH,
      qty: numShutters,
      ebMm: sEbMm,
    });
  }

  let bCostTotal = 0;
  let wCostTotal = 0;
  let tSqFt = 0;

  const boardPiecesDetails = pieces.map((p) => {
    const areaSqMm = p.w * p.l * p.qty;
    const areaSqFt = areaSqMm / 90000;
    const wasteSqFt = areaSqFt * 0.15;
    const totalAreaSqFt = areaSqFt + wasteSqFt;

    const rate = p.customCostPerSqFt ?? (boardRate + totalMicaRate);
    const pCost = totalAreaSqFt * rate;

    bCostTotal += areaSqFt * rate;
    wCostTotal += wasteSqFt * rate;
    tSqFt += areaSqFt;

    const micaLabels = [];
    if (innerMica !== "none") micaLabels.push(`Inner ${innerMica}mm`);
    if (outerMica !== "none") micaLabels.push(`Outer ${outerMica}mm`);
    const micaSuffix = !p.customCostPerSqFt && micaLabels.length > 0 ? ` with Mica (${micaLabels.join(" + ")})` : "";

    return {
      ...p,
      label: `${p.label}${micaSuffix}`,
      areaSqFt,
      wasteSqFt,
      totalAreaSqFt,
      cost: pCost,
      rateUsed: rate,
    };
  });

  const hardwareDetails: {
    label: string;
    cost: number;
    qty: number;
    unitPrice: number;
    unitLabel: string;
  }[] = [];
  let hCost = 0;

  let totalEbCost = 0;
  let totalEbMeter = 0;

  pieces.forEach((p) => {
    if (p.ebMm && p.ebMm > 0) {
      const ebMeter = (p.ebMm / 1000) * 1.2;
      const pieceEbCost = ebMeter * 13;
      hCost += pieceEbCost;
      totalEbCost += pieceEbCost;
      totalEbMeter += ebMeter;
      hardwareDetails.push({
        label: `Edge Banding: ${p.label}`,
        qty: Number(ebMeter.toFixed(2)),
        unitPrice: 13,
        unitLabel: "m",
        cost: pieceEbCost,
      });
    }
  });

  if (numDrawers > 0) {
    const cCost = numDrawers * HARDWARE_CHANNEL_COST;
    hCost += cCost;
    hardwareDetails.push({
      label: `Channels`,
      qty: numDrawers,
      unitPrice: HARDWARE_CHANNEL_COST,
      unitLabel: "pair",
      cost: cCost,
    });

    if (includeHandles) {
      const hc = numDrawers * HARDWARE_HANDLE_COST;
      hCost += hc;
      hardwareDetails.push({
        label: `Drawer Handles`,
        qty: numDrawers,
        unitPrice: HARDWARE_HANDLE_COST,
        unitLabel: "pcs",
        cost: hc,
      });
    }
    if (drawerLockType === "individual") {
      const lc = numDrawers * HARDWARE_LOCK_COST;
      hCost += lc;
      hardwareDetails.push({
        label: `Drawer Locks`,
        qty: numDrawers,
        unitPrice: HARDWARE_LOCK_COST,
        unitLabel: "pcs",
        cost: lc,
      });
    } else if (drawerLockType === "central" && numDrawers === 3) {
      const lc = 1 * HARDWARE_CENTRAL_LOCK_COST;
      hCost += lc;
      hardwareDetails.push({
        label: `Central Drawer Lock`,
        qty: 1,
        unitPrice: HARDWARE_CENTRAL_LOCK_COST,
        unitLabel: "pcs",
        cost: lc,
      });
    }
  }

  if (numShutters > 0) {
    const hingeCount = numShutters * 2;
    const hingCost = hingeCount * HARDWARE_SHUTTER_HINGE_COST;
    hCost += hingCost;
    hardwareDetails.push({
      label: `Hinges`,
      qty: hingeCount,
      unitPrice: HARDWARE_SHUTTER_HINGE_COST,
      unitLabel: "pcs",
      cost: hingCost,
    });

    if (includeShutterHandles) {
      const hc = numShutters * HARDWARE_HANDLE_COST;
      hCost += hc;
      hardwareDetails.push({
        label: `Shutter Handles`,
        qty: numShutters,
        unitPrice: HARDWARE_HANDLE_COST,
        unitLabel: "pcs",
        cost: hc,
      });
    }
    if (includeShutterLocks) {
      const lockCount = numShutters === 2 ? 1 : numShutters;
      const lc = lockCount * HARDWARE_LOCK_COST;
      hCost += lc;
      hardwareDetails.push({
        label: `Shutter Locks`,
        qty: lockCount,
        unitPrice: HARDWARE_LOCK_COST,
        unitLabel: "pcs",
        cost: lc,
      });
    }
  }

  if (includeCastors) {
    hCost += HARDWARE_CASTOR_COST;
    hardwareDetails.push({
      label: `Castors (Set of 4)`,
      qty: 1,
      unitPrice: HARDWARE_CASTOR_COST,
      unitLabel: "set",
      cost: HARDWARE_CASTOR_COST,
    });
  }

  hCost += 15;
  hardwareDetails.push({
    label: "Skirting",
    qty: 1,
    unitPrice: 15,
    unitLabel: "pcs",
    cost: 15,
  });

  const lCost = Math.round((bCostTotal + wCostTotal + hCost) * 0.20);
  const pCost = PACKING_COST;

  // total material + labor + 15% waste is already captured in wCostTotal.
  // wait bCostTotal is base board, wCostTotal is waste cost.
  const directCost = bCostTotal + wCostTotal + hCost + lCost + pCost;
  const tCost = TOOLING_COST;
  const subTotal = directCost + tCost;
  const prof = subTotal * PROFIT_PERCENTAGE;

  const total = subTotal + prof;

  return {
    totalSqFt: Number(tSqFt.toFixed(2)),
    boardPiecesDetails,
    numDrawers,
    numShutters,
    boardCostTotal: Math.round(bCostTotal),
    wasteCostTotal: Math.round(wCostTotal),
    hardwareCost: hCost,
    hardwareDetails,
    laborCost: lCost,
    packingCost: pCost,
    toolingCost: tCost,
    profit: prof,
    totalCost: Math.round(total),
  };
}
export default function PedestalCalculator() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const editItemId = searchParams.get("edit");
  const navigate = useNavigate();
  const { projects, addItemToProject, updateItemInProject } = useProjectStore();
  
  const [isCustomSize, setIsCustomSize] = useState<boolean>(false);
  const [height, setHeight] = useState<number>(650); // mm
  const [width, setWidth] = useState<number>(400); // mm
  const [depth, setDepth] = useState<number>(450); // mm
  const [typeId, setTypeId] = useState<string>("3_drawer");
  const [boardId, setBoardId] = useState<string>("mdf");
  const [boardThickness, setBoardThickness] = useState<number>(18);
  const [drawerLockType, setDrawerLockType] = useState<string>("central"); // 'central', 'individual', 'none'
  const [includeHandles, setIncludeHandles] = useState<boolean>(true);
  const [includeShutterLocks, setIncludeShutterLocks] = useState<boolean>(true);
  const [includeShutterHandles, setIncludeShutterHandles] =
    useState<boolean>(true);
  const [includeCastors, setIncludeCastors] = useState<boolean>(false);

  const [wideStyle, setWideStyle] = useState<string>("2_shelves");
  const [wideInternalConfig, setWideInternalConfig] =
    useState<string>("1_vert_1_horiz");
  const [numShelves, setNumShelves] = useState<number>(1);
  const [quality, setQuality] = useState<string>("standard");

  const [innerMica, setInnerMica] = useState<string>("none");
  const [outerMica, setOuterMica] = useState<string>("none");

  useEffect(() => {
    if (editItemId && projectId) {
      const project = projects.find(p => p.id === projectId);
      const item = project?.items.find(i => i.id === editItemId);
      if (item && item.config) {
        const c = item.config;
        if (c.isCustomSize !== undefined) setIsCustomSize(c.isCustomSize);
        if (c.height !== undefined) setHeight(c.height);
        if (c.width !== undefined) setWidth(c.width);
        if (c.depth !== undefined) setDepth(c.depth);
        if (c.typeId !== undefined) setTypeId(c.typeId);
        if (c.boardId !== undefined) setBoardId(c.boardId);
        if (c.boardThickness !== undefined) setBoardThickness(c.boardThickness);
        if (c.drawerLockType !== undefined) setDrawerLockType(c.drawerLockType);
        if (c.includeHandles !== undefined) setIncludeHandles(c.includeHandles);
        if (c.includeShutterLocks !== undefined) setIncludeShutterLocks(c.includeShutterLocks);
        if (c.includeShutterHandles !== undefined) setIncludeShutterHandles(c.includeShutterHandles);
        if (c.includeCastors !== undefined) setIncludeCastors(c.includeCastors);
        if (c.wideStyle !== undefined) setWideStyle(c.wideStyle);
        if (c.wideInternalConfig !== undefined) setWideInternalConfig(c.wideInternalConfig);
        if (c.numShelves !== undefined) setNumShelves(c.numShelves);
        if (c.quality !== undefined) setQuality(c.quality);
        if (c.innerMica !== undefined) setInnerMica(c.innerMica);
        if (c.outerMica !== undefined) setOuterMica(c.outerMica);
      }
    }
  }, [editItemId, projectId, projects]);

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportMaterial, setExportMaterial] = useState<string>("all");
  const [exportQuality, setExportQuality] = useState<string>("standard");
  const [exportInnerMica, setExportInnerMica] = useState<string>("none");
  const [exportOuterMica, setExportOuterMica] = useState<string>("none");

  useEffect(() => {
    const available = getAvailableThicknesses(boardId, quality);
    if (!available.includes(boardThickness)) {
      setBoardThickness(available[0]);
    }
  }, [boardId, quality, boardThickness]);

  const {
    numDrawers,
    numShutters,
    boardPiecesDetails,
    boardCostTotal,
    wasteCostTotal,
    hardwareCost,
    hardwareDetails,
    laborCost,
    packingCost,
    toolingCost,
    profit,
    totalCost,
    totalSqFt,
  } = useMemo(() => {
    return calculatePedestalCost({
      width,
      height,
      depth,
      typeId,
      boardId,
      boardThickness,
      wideStyle,
      wideInternalConfig,
      drawerLockType,
      setDrawerLockType,
      includeHandles,
      includeShutterLocks,
      includeShutterHandles,
      includeCastors,
      numShelves,
      quality,
      innerMica,
      outerMica,
    });
  }, [
    height,
    width,
    depth,
    typeId,
    boardId,
    boardThickness,
    includeHandles,
    drawerLockType,
    includeShutterHandles,
    includeShutterLocks,
    includeCastors,
    wideStyle,
    wideInternalConfig,
    numShelves,
    quality,
    innerMica,
    outerMica,
  ]);

  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copyImagePrompt = () => {
    let topName = "";
    const topBoard = getBoards(quality).find((b) => b.id === boardId)?.name || "Board";
    topName = topBoard === "PLPB" || topBoard === "MDF" || topBoard === "HDHMR" ? topBoard + " wood" : topBoard;

    let typeStr = PEDESTAL_TYPES.find(t=>t.id === typeId)?.name || "Storage unit";
    if (typeId === "wide") {
      if (wideStyle === "2_shelves") typeStr = "Wide open storage with 2 shelves";
      if (wideStyle === "1_vertical_1_shelve") typeStr = "Wide storage with 1 vertical partition and 1 shelf";
      if (wideStyle === "2_drawer_2_shutter") typeStr = "Wide storage with 2 drawers and 2 lower shutters";
    }

    const lockDesc = drawerLockType !== "none" ? " includes locks," : "";
    const handleDesc = includeHandles ? " includes metal handles," : " handle-less design,";
    const castorDesc = includeCastors ? " mounted on castors/wheels." : " resting flat.";

    const prompt = `A highly realistic, professional product photography studio shot of a modern office drawer pedestal / storage unit. The unit is ${width}mm wide, ${depth}mm deep, and ${height}mm high. It is made of ${topName}. The configuration is: ${typeStr}. It${lockDesc}${handleDesc} and is${castorDesc} Clean, ultra-minimalist solid white background. Studio lighting, highly detailed, 8k resolution, photorealistic furniture photography.`;
    
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pType = PEDESTAL_TYPES.find((t) => t.id === typeId)!;
    const boards = getBoards(quality);
    const board = boards.find((b) => b.id === boardId)!;

    let typeName = pType.name;
    if (width >= 900) {
      if (wideStyle === "2_shelves") typeName = "2 Shelves (Wide)";
      if (wideStyle === "1_vertical_1_shelve")
        typeName = "1 Vertical + 1 Shelf (Wide)";
      if (wideStyle === "2_drawer_2_shutter")
        typeName = `2 Drawers + 2 Shutters (Wide, ${
          wideInternalConfig === "1_vert_1_horiz"
            ? "1 Vert & 1 Horiz"
            : "2 Horiz"
        })`;
    }

    doc.setFontSize(20);
    doc.text("Pedestal Cost Estimation Report", 14, 22);

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Specification", "Details"]],
      body: [
        ["Dimensions (W x H x D)", `${width} mm x ${height} mm x ${depth} mm`],
        ["Style", typeName],
        ["Board Material", `${board.name} (Rs. ${getBoardRate(boardId, board.costPerSqFt, boardThickness, quality)}/sq.ft)`],
        ["Total Board Area", `${totalSqFt} sq.ft`],
        ["Board Thickness", `${boardThickness} mm`],
        ["Inner Mica / Laminate", innerMica === "none" ? "None" : `${innerMica} mm (Rs. ${innerMica === "0.8" ? 35 : 56}/sq.ft)`],
        ["Outer Mica / Laminate", outerMica === "none" ? "None" : `${outerMica} mm (Rs. ${outerMica === "0.8" ? 35 : 56}/sq.ft)`],
        ["Drawers", numDrawers.toString()],
        ["Shutters", numShutters.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    const bdBody: string[][] = [];
    boardPiecesDetails.forEach((b) =>
      bdBody.push([
        `${b.label} (Qty: ${b.qty}, ${Math.floor(b.w)}x${Math.floor(b.l)} mm, ${b.areaSqFt.toFixed(2)} sq.ft${(b as any).rateUsed === 35 ? " @ Rs.35/sq.ft" : ""})`,
        `Rs. ${Math.round(b.cost).toLocaleString()}`,
      ]),
    );

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Detailed Board Cost", "Amount"]],
      body: bdBody,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    const hardwareBody = hardwareDetails.map((h) => [
      `${h.label} (Qty: ${h.qty} ${h.unitLabel} @ Rs. ${h.unitPrice})`,
      `Rs. ${Math.round(h.cost).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Detailed Hardware Included", "Cost"]],
      body:
        hardwareBody.length > 0
          ? hardwareBody
          : [["No hardware selected", "-"]],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    const costStartY = (doc as any).lastAutoTable.finalY + 10;
    const bodyArgs: string[][] = [
      ["Total Board Cost", `Rs. ${boardCostTotal.toLocaleString()}`],
      ["Material Waste (15%)", `Rs. ${wasteCostTotal.toLocaleString()}`],
      [
        "Hardware & Fittings Total",
        `Rs. ${Math.round(hardwareCost).toLocaleString()}`,
      ],
      ["Labor & Making", `Rs. ${laborCost.toLocaleString()}`],
      ["Packing", `Rs. ${packingCost.toLocaleString()}`],
      ["Tooling", `Rs. ${toolingCost.toLocaleString()}`],
      ["Profit (25%)", `Rs. ${Math.round(profit).toLocaleString()}`],
    ];

    autoTable(doc, {
      startY: costStartY,
      head: [["Overall Cost Summary", "Amount"]],
      body: bodyArgs,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    const totalStartY = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: totalStartY,
      head: [["Total Estimated Cost", `Rs. ${totalCost.toLocaleString()}`]],
      theme: "grid",
      headStyles: { fillColor: [17, 24, 39] },
    });

    doc.save("pedestal-cost-report.pdf");
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    const pType = PEDESTAL_TYPES.find((t) => t.id === typeId)!;
    const boards = getBoards(quality);
    const board = boards.find((b) => b.id === boardId)!;

    let typeName = pType.name;
    if (width >= 900) {
      if (wideStyle === "2_shelves") typeName = "2 Shelves (Wide)";
      if (wideStyle === "1_vertical_1_shelve")
        typeName = "1 Vertical + 1 Shelf (Wide)";
      if (wideStyle === "2_drawer_2_shutter")
        typeName = `2 Drawers + 2 Shutters (Wide, ${
          wideInternalConfig === "1_vert_1_horiz"
            ? "1 Vert & 1 Horiz"
            : "2 Horiz"
        })`;
    }

    // 1. Cover / Specs Sheet
    const specsData = [
      ["Pedestal Cost Estimation Report"],
      ["Date", new Date().toLocaleDateString()],
      [""],
      ["Specification", "Details"],
      ["Dimensions (W x H x D)", `${width} mm x ${height} mm x ${depth} mm`],
      ["Style", typeName],
      ["Board Material", `${board.name} (Rs. ${getBoardRate(boardId, board.costPerSqFt, boardThickness, quality)}/sq.ft)`],
      ["Total Board Area", `${totalSqFt} sq.ft`],
      ["Board Thickness", `${boardThickness} mm`],
      ["Inner Mica / Laminate", innerMica === "none" ? "None" : `${innerMica} mm (Rs. ${innerMica === "0.8" ? 35 : 56}/sq.ft)`],
      ["Outer Mica / Laminate", outerMica === "none" ? "None" : `${outerMica} mm (Rs. ${outerMica === "0.8" ? 35 : 56}/sq.ft)`],
      ["Drawers", numDrawers.toString()],
      ["Shutters", numShutters.toString()],
    ];
    const wsSpecs = XLSX.utils.aoa_to_sheet(specsData);
    XLSX.utils.book_append_sheet(wb, wsSpecs, "Specifications");

    // 2. Details Sheet
    const detailsData: any[][] = [];
    detailsData.push(["Detailed Board Cost", "Amount", "Calculation Concept"]);
    boardPiecesDetails.forEach((b) => {
      detailsData.push([
        `${b.label} (Qty: ${b.qty}, ${Math.floor(b.w)}x${Math.floor(b.l)} mm, ${b.areaSqFt.toFixed(2)} sq.ft${(b as any).rateUsed === 35 ? " @ Rs.35/sq.ft" : ""})`,
        Math.round(b.cost),
        "Board Surface Area (sq.ft) × Board Material Rate × Quantity",
      ]);
    });

    detailsData.push([""]);
    detailsData.push([
      "Detailed Hardware Included",
      "Qty",
      "Unit Price",
      "Total Cost",
      "Calculation Concept",
    ]);
    if (hardwareDetails.length > 0) {
      hardwareDetails.forEach((h) => {
        detailsData.push([
          h.label,
          h.qty,
          h.unitPrice,
          Math.round(h.cost),
          "Quantity × Unit Price",
        ]);
      });
    } else {
      detailsData.push(["No hardware selected", "", "", "", ""]);
    }

    detailsData.push([""]);
    detailsData.push([
      "Cost Summary (Overall Calculation)",
      "Amount",
      "Calculation Concept",
    ]);
    detailsData.push([
      "Total Board Cost",
      boardCostTotal,
      "Sum of all structural board cut-pieces (casing, drawer bottoms, shutters)",
    ]);
    detailsData.push([
      "Material Waste (15%)",
      wasteCostTotal,
      "15% of Total Board Cost (Board Cost × 0.15) for standard cutting wastage",
    ]);
    detailsData.push([
      "Hardware & Accessories",
      Math.round(hardwareCost),
      "Sum of all hardware items (slides, hinges, locks, handles, castors)",
    ]);
    detailsData.push([
      "Labor & Making",
      laborCost,
      "Standard fixed labor charges",
    ]);
    detailsData.push([
      "Packing",
      packingCost,
      "Standard fixed packing charges",
    ]);
    detailsData.push([
      "Tooling",
      toolingCost,
      "Fixed tolling cost with dimension based additions",
    ]);
    detailsData.push([
      "Profit (25%)",
      Math.round(profit),
      "25% of Subtotal (Direct Costs + Tooling)",
    ]);
    detailsData.push([""]);
    detailsData.push([
      "Total Estimated Cost",
      totalCost,
      "Sum of Subtotal + Profit",
    ]);

    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, wsDetails, "Cost Details");

    // 3. Formulas and Concepts Sheet
    const formulasData = [
      ["Metric", "Formula Used", "Description"],
      [
        "Area (sq.ft)",
        "(Width (mm) × Length (mm)) / 90000",
        "1 sq.ft = 90000 sq.mm. Panel dimensions are multiplied to get sq.mm, then divided by 90000.",
      ],
      [
        "Edge Banding",
        "Length (m) × Rate",
        "Perimeter or specific edge lengths requiring edge banding converted to meters (mm / 1000) multiplied by ₹13/m rate.",
      ],
      [
        "Board Cost",
        "Area (sq.ft) × Material Rate",
        "Calculated by multiplying the surface area in sq.ft by the selected board's per sq.ft rate (varies for 18mm vs 9mm).",
      ],
      [
        "Material Waste",
        "Total Board Cost × 15%",
        "Standard 15% waste margin added to account for cutting and offcuts.",
      ],
      [
        "Hardware Cost",
        "Qty × Unit Price",
        "Quantity of hardware (slides, locks, hinges, castors) multiplied by respective unit prices.",
      ],
      [
        "Labor & Making",
        "Fixed amount",
        "Standardized fixed labor charges for pedestal assembly.",
      ],
      [
        "Packing",
        "Fixed amount",
        "Standard fixed charges for packing the pedestal.",
      ],
      [
        "Tooling",
        "Fixed Tolling amount",
        "Machinery overhead, scales up with dimension.",
      ],
      [
        "Profit",
        "Subtotal × 25%",
        "25% profit margin applied to the subtotal before final pricing.",
      ],
      [
        "Total Estimated Cost",
        "Subtotal + Profit",
        "The final calculated estimated cost for the pedestal.",
      ],
    ];
    const wsFormulas = XLSX.utils.aoa_to_sheet(formulasData);
    XLSX.utils.book_append_sheet(wb, wsFormulas, "Calculation Formulas");

    XLSX.writeFile(wb, "pedestal-cost-report.xlsx");
  };

  const downloadMasterPriceList = () => {
    const wb = XLSX.utils.book_new();

    const masterData = [];
    masterData.push(["Pedestal Master Price List Report"]);
    masterData.push(["Generated On", new Date().toLocaleDateString()]);
    masterData.push(["Board Option", exportQuality.toUpperCase()]);
    masterData.push(["Inner Mica / Laminate", exportInnerMica === "none" ? "None" : `${exportInnerMica} mm`]);
    masterData.push(["Outer Mica / Laminate", exportOuterMica === "none" ? "None" : `${exportOuterMica} mm`]);
    masterData.push([]); // blank row
    masterData.push([
      "Board Material",
      "Dimensions (WxHxD mm)",
      "Style / Configuration",
      "Total Board Area (sq.ft)",
      "Cost Price (Rs)",
    ]);

    const widths = [400, 450, 500, 900];
    const heights = [550, 600, 720];
    const depths = [400, 450, 500];

    const boards = getBoards(exportQuality);
    const boardsToExport =
      exportMaterial === "all"
          ? boards
          : boards.filter((b) => b.id === exportMaterial);

    // Build the master data
    for (const board of boardsToExport) {
      for (const w of widths) {
        for (const h of heights) {
          for (const d of depths) {
            if (w < 900) {
              for (const t of PEDESTAL_TYPES) {
                const res = calculatePedestalCost({
                  width: w,
                  height: h,
                  depth: d,
                  typeId: t.id,
                  boardId: board.id,
                  wideStyle: "2_shelves",
                  wideInternalConfig: "1_vert_1_horiz",
                  drawerLockType:
                    t.drawers > 1
                      ? "central"
                      : t.drawers === 1
                        ? "individual"
                        : "none",
                  includeHandles: true,
                  includeShutterLocks: true,
                  includeShutterHandles: true,
                  includeCastors: false,
                  numShelves: 1,
                  quality: exportQuality,
                  innerMica: exportInnerMica,
                  outerMica: exportOuterMica,
                });

                masterData.push([
                  board.name,
                  w + "x" + h + "x" + d,
                  t.name,
                  res.totalSqFt,
                  res.totalCost,
                ]);
              }
            } else {
              for (const ws of [
                "2_shelves",
                "1_vertical_1_shelve",
                "2_drawer_2_shutter",
              ]) {
                if (ws === "2_drawer_2_shutter") {
                  for (const wi of ["1_vert_1_horiz", "2_horiz"]) {
                    const res = calculatePedestalCost({
                      width: w,
                      height: h,
                      depth: d,
                      typeId: "3_drawer",
                      boardId: board.id,
                      wideStyle: ws,
                      wideInternalConfig: wi,
                      drawerLockType: "individual",
                      includeHandles: true,
                      includeShutterLocks: true,
                      includeShutterHandles: true,
                      includeCastors: false,
                      numShelves: numShelves,
                      quality: exportQuality,
                      innerMica: exportInnerMica,
                      outerMica: exportOuterMica,
                    });
                    const wsName =
                      "2 Drawers + 2 Shutters (Wide, " +
                      (wi === "1_vert_1_horiz"
                        ? "1 Vert & 1 Horiz"
                        : "2 Horiz") +
                      ")";
                    masterData.push([
                      board.name,
                      w + "x" + h + "x" + d,
                      wsName,
                      res.totalSqFt,
                      res.totalCost,
                    ]);
                  }
                } else {
                  const res = calculatePedestalCost({
                    width: w,
                    height: h,
                    depth: d,
                    typeId: "3_drawer",
                    boardId: board.id,
                    wideStyle: ws,
                    wideInternalConfig: "1_vert_1_horiz",
                    drawerLockType: "none",
                    includeHandles: true,
                    includeShutterLocks: true,
                    includeShutterHandles: true,
                    includeCastors: false,
                    numShelves: numShelves,
                    quality: exportQuality,
                    innerMica: exportInnerMica,
                    outerMica: exportOuterMica,
                  });
                  const wsName =
                    ws === "2_shelves"
                      ? "2 Shelves (Wide)"
                      : "1 Vertical + 1 Shelf (Wide)";
                  masterData.push([
                    board.name,
                    w + "x" + h + "x" + d,
                    wsName,
                    res.totalSqFt,
                    res.totalCost,
                  ]);
                }
              }
            }
          }
        }
      }
    }

    const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
    const colWidths = [{ wch: 15 }, { wch: 20 }, { wch: 45 }, { wch: 15 }];
    wsMaster["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsMaster, "Master Price List");
    XLSX.writeFile(wb, "pedestal-master-price-list.xlsx");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Pedestal Cost Calculator
          </h1>
          <p className="text-gray-500 flex items-center gap-2 mt-1">
            Calculate accurate manufacturing and raw material costs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          {/* Dimensions Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex justify-between items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-gray-400" />
                Dimensions (mm)
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 font-normal cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCustomSize}
                  onChange={(e) => setIsCustomSize(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Custom Sizes
              </label>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                {isCustomSize ? (
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    min={0}
                    className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  />
                ) : (
                  <select
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  >
                    <option value={400}>400 mm</option>
                    <option value={450}>450 mm</option>
                    <option value={500}>500 mm</option>
                    <option value={900}>900 mm</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                {isCustomSize ? (
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min={0}
                    className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  />
                ) : (
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  >
                    <option value={550}>550 mm</option>
                    <option value={600}>600 mm</option>
                    <option value={720}>720 mm</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depth
                </label>
                {isCustomSize ? (
                  <input
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    min={0}
                    className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  />
                ) : (
                  <select
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  >
                    <option value={450}>450 mm</option>
                    <option value={500}>500 mm</option>
                    <option value={400}>400 mm</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Configurations Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex justify-between items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-gray-400" />
                Configuration
              </div>
            </h2>
            <div className="space-y-5">
              {width >= 900 ? (
                <div className="space-y-4">
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wide Storage Style
                    </label>
                    <select
                      value={wideStyle}
                      onChange={(e) => setWideStyle(e.target.value)}
                      className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                    >
                      <option value="2_shelves">2 Shelves (2 Shutters)</option>
                      <option value="1_vertical_1_shelve">
                        1 Vertical Partition + 1 Shelf (2 Shutters)
                      </option>
                      <option value="2_drawer_2_shutter">
                        2 Drawers + 2 Shutters
                      </option>
                    </select>
                  </div>
                  {wideStyle === "2_drawer_2_shutter" && (
                    <div className="animate-in fade-in slide-in-from-top-2 ml-4 border-l-2 border-indigo-100 pl-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Internal Layout
                      </label>
                      <select
                        value={wideInternalConfig}
                        onChange={(e) => setWideInternalConfig(e.target.value)}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                      >
                        <option value="1_vert_1_horiz">
                          1 Vertical & 1 Horizontal Panel
                        </option>
                        <option value="2_horiz">2 Horizontal Panels</option>
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pedestal Type
                  </label>
                  <select
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  >
                    {PEDESTAL_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board Quality
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                >
                  <option value="affordable">Affordable</option>
                  <option value="standard">Standard</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Board Type
                  </label>
                  <select
                    value={boardId}
                    onChange={(e) => setBoardId(e.target.value)}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  >
                    {getBoards(quality).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (₹{getBoardRate(b.id, b.costPerSqFt, boardThickness, quality)}/sq.ft)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Board Thickness
                  </label>
                  <select
                    value={boardThickness}
                    onChange={(e) => setBoardThickness(Number(e.target.value))}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                  >
                    {getAvailableThicknesses(boardId, quality).map((t) => (
                      <option key={t} value={t}>
                        {t} mm
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inner Mica / Laminate
                </label>
                <select
                  value={innerMica}
                  onChange={(e) => setInnerMica(e.target.value)}
                  className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                >
                  <option value="none">None (₹0/sq.ft)</option>
                  <option value="0.8">0.8 mm (₹35/sq.ft)</option>
                  <option value="1.0">1.0 mm (₹56/sq.ft)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outer Mica / Laminate
                </label>
                <select
                  value={outerMica}
                  onChange={(e) => setOuterMica(e.target.value)}
                  className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                >
                  <option value="none">None (₹0/sq.ft)</option>
                  <option value="0.8">0.8 mm (₹35/sq.ft)</option>
                  <option value="1.0">1.0 mm (₹56/sq.ft)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Shelves
                </label>
                <select
                  value={numShelves}
                  onChange={(e) => setNumShelves(Number(e.target.value))}
                  className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                >
                  <option value={0}>0 Shelves</option>
                  <option value={1}>1 Shelf</option>
                  <option value={2}>2 Shelves</option>
                  <option value={3}>3 Shelves</option>
                  <option value={4}>4 Shelves</option>
                  <option value={5}>5 Shelves</option>
                </select>
              </div>

              {numDrawers > 0 && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drawer Hardware
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeHandles}
                        onChange={(e) => setIncludeHandles(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                      />
                      <span className="text-sm text-gray-700">
                        Handles (₹{HARDWARE_HANDLE_COST}/ea)
                      </span>
                    </label>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Drawer Locks
                    </label>
                    <div className="flex gap-4">
                      {numDrawers === 3 && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="drawerLock"
                            value="central"
                            checked={drawerLockType === "central"}
                            onChange={(e) => setDrawerLockType(e.target.value)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-colors"
                          />
                          <span className="text-sm text-gray-700">
                            Central (1 Lock - ₹{HARDWARE_CENTRAL_LOCK_COST})
                          </span>
                        </label>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="drawerLock"
                          value="individual"
                          checked={drawerLockType === "individual"}
                          onChange={(e) => {
                            setDrawerLockType(e.target.value);
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-colors"
                        />
                        <span className="text-sm text-gray-700">
                          Drawer by Drawer (₹{HARDWARE_LOCK_COST}/ea)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="drawerLock"
                          value="none"
                          checked={
                            drawerLockType === "none" ||
                            (drawerLockType === "central" && numDrawers !== 3)
                          }
                          onChange={(e) => setDrawerLockType(e.target.value)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-colors"
                        />
                        <span className="text-sm text-gray-700">No Locks</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {numShutters > 0 && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shutter Hardware & Hinges
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Includes 2 hinges (₹125/pair) per shutter
                  </p>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeShutterHandles}
                        onChange={(e) =>
                          setIncludeShutterHandles(e.target.checked)
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                      />
                      <span className="text-sm text-gray-700">
                        Handles (₹{HARDWARE_HANDLE_COST}/ea)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeShutterLocks}
                        onChange={(e) =>
                          setIncludeShutterLocks(e.target.checked)
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                      />
                      <span className="text-sm text-gray-700">
                        Locks (₹{HARDWARE_LOCK_COST}/ea)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Options
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCastors}
                      onChange={(e) => setIncludeCastors(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                    />
                    <span className="text-sm text-gray-700">
                      Castors / Wheels (Set of 4 for ₹{HARDWARE_CASTOR_COST})
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Summary Sidebar */}
        <div className="xl:col-span-4">
          <div className="sticky top-24 bg-gray-900 rounded-2xl p-6 text-white overflow-hidden relative">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500 rounded-full opacity-10 blur-3xl mix-blend-screen pointer-events-none"></div>

            <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2 mb-2">
              <FileBox className="w-5 h-5 text-indigo-400" />
              Estimation
            </h2>
            <div className="text-xs text-gray-400 mb-6 pb-4 border-b border-gray-800">
              {getBoards(quality).find((b) => b.id === boardId)?.name} • {boardThickness}mm (₹{getBoardRate(boardId, getBoards(quality).find((b) => b.id === boardId)?.costPerSqFt ?? 0, boardThickness, quality)}/sq.ft)
            </div>

            <div className="space-y-4 mb-6 relative z-10">
              <div className="flex flex-col mb-1 border-gray-800/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Total Board Cost</span>
                  <span className="font-medium">
                    ₹{(boardCostTotal + wasteCostTotal).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 border-l border-gray-700 ml-1 pl-2">
                  {boardPiecesDetails.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start text-xs text-gray-400"
                    >
                      <div className="flex flex-col pr-2">
                        <span className="text-gray-300">{item.label}</span>
                        <span className="text-gray-500 text-[11px] mt-0.5">
                          {item.w}x{item.l}mm x{item.qty} ·{" "}
                          {item.areaSqFt.toFixed(2)} sq.ft
                          {(item as any).rateUsed === 35 ? " @ ₹35/sq.ft" : ""}
                        </span>
                      </div>
                      <span className="mt-0.5 whitespace-nowrap">
                        ₹{Math.round(item.cost).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-1 mt-1 border-t border-gray-700/50">
                    <span>Base Material</span>
                    <span>₹{boardCostTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Material Waste (15%)</span>
                    <span>₹{wasteCostTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col mb-1 pt-2 border-t border-gray-800/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Hardware & Fittings</span>
                  <span className="font-medium text-gray-100">
                    ₹{Math.round(hardwareCost).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 border-l border-gray-700 ml-1 pl-2">
                  {hardwareDetails.map((item, idx) => {
                    const isTotalEb = item.label === "Total Edge Banding";
                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-start text-xs ${isTotalEb ? "text-white font-semibold bg-white/10 p-1.5 -ml-1.5 rounded" : "text-gray-500"}`}
                      >
                        <span className="pr-2 leading-relaxed">
                          {item.label}{" "}
                          <span
                            className={
                              isTotalEb
                                ? "text-gray-300 font-normal"
                                : "text-gray-600"
                            }
                          >
                            (x{item.qty})
                          </span>
                        </span>
                        <span className="whitespace-nowrap mt-[1px]">
                          ₹{Math.round(item.cost).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-800/50">
                <span className="text-gray-400">Labor & Making</span>
                <span className="font-medium">
                  ₹{laborCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Packing</span>
                <span className="font-medium">
                  ₹{packingCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Tooling</span>
                <span className="font-medium">
                  ₹{toolingCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Profit (25%)</span>
                <span className="font-medium">₹{profit.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 relative z-10">
              <span className="text-sm text-gray-400 block mb-1">
                Estimated Total Cost
              </span>
              <div className="flex items-center text-3xl font-semibold text-white tracking-tight">
                <IndianRupee className="w-6 h-6 mr-1" />
                {totalCost.toLocaleString()}
              </div>
              <p className="text-xs text-indigo-300 mt-3 opacity-80 mb-6">
                Approximation based on {totalSqFt} sq.ft board volume including
                internals. Cost may vary by region.
              </p>

              <div className="flex flex-col gap-3">
                {projectId ? (
                  <button
                    onClick={() => {
                      const itemName = `Pedestal ${width}x${height}x${depth} (${boardId})`;
                      const itemData = {
                        productType: 'pedestal' as const,
                        name: itemName,
                        config: {
                          isCustomSize, height, width, depth, typeId, boardId, boardThickness,
                          drawerLockType, includeHandles, includeShutterLocks, includeShutterHandles,
                          includeCastors, wideStyle, wideInternalConfig, numShelves, quality,
                          innerMica, outerMica
                        },
                        costSummary: {
                          totalCost,
                          totalSqFt,
                          boardPiecesDetails,
                          hardwareDetails,
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
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                  >
                    {editItemId ? "Save Changes" : "Save to Project"}
                  </button>
                ) : null}
                <button
                  onClick={downloadPDF}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Report
                </button>
                <button
                  onClick={downloadExcel}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download Config Excel
                </button>
                <button
                  onClick={copyImagePrompt}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 py-2.5 px-4 rounded-lg font-medium border border-indigo-500/30 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copiedPrompt ? "Copied!" : "Copy Image Prompt"}
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Export Master Price List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Export Options</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-2 p-3 border rounded-lg">
                <label className="text-sm font-medium text-gray-900">
                  Board Option
                </label>
                <select
                  value={exportQuality}
                  onChange={(e) => setExportQuality(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none"
                >
                  <option value="standard">Standard</option>
                  <option value="affordable">Affordable</option>
                </select>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <label className="text-sm font-medium text-gray-900">
                  Board Material
                </label>
                <select
                  value={exportMaterial}
                  onChange={(e) => setExportMaterial(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none"
                >
                  <option value="all">All Materials</option>
                  {getBoards(exportQuality).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <label className="text-sm font-medium text-gray-900">
                  Export Inner Mica
                </label>
                <select
                  value={exportInnerMica}
                  onChange={(e) => setExportInnerMica(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none"
                >
                  <option value="none">None</option>
                  <option value="0.8">0.8 mm (Rs. 35/sq.ft)</option>
                  <option value="1.0">1.0 mm (Rs. 56/sq.ft)</option>
                </select>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <label className="text-sm font-medium text-gray-900">
                  Export Outer Mica
                </label>
                <select
                  value={exportOuterMica}
                  onChange={(e) => setExportOuterMica(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none"
                >
                  <option value="none">None</option>
                  <option value="0.8">0.8 mm (Rs. 35/sq.ft)</option>
                  <option value="1.0">1.0 mm (Rs. 56/sq.ft)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                downloadMasterPriceList();
                setShowExportModal(false);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Generate & Download Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
