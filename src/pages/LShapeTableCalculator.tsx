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
  { id: "hdhmr_laminate", name: "HDHMR LAMINATE", costPerSqFt: 130 },
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
        return [18, 25];
      default:
        return [18];
    }
  }
};

export const getTopRate = (
  boardId: string,
  baseRate: number,
  topThickness: number,
  quality: string,
) => {
  if (quality === "affordable") {
    if (boardId === "plpb") {
      if (topThickness === 11) return 27;
      if (topThickness === 17) return 29;
      if (topThickness === 18) return 34;
      if (topThickness === 25) return 42;
    }
    if (boardId === "hdhmr") {
      if (Math.abs(topThickness - 16.75) < 0.1) return 88;
      if (topThickness === 18) return 99;
      if (topThickness === 25) return 135;
    }
    if (boardId === "ply_laminate") {
      if (topThickness === 6) return 22;
      if (topThickness === 9) return 35;
      if (topThickness === 12) return 38;
      if (topThickness === 15) return 46;
      if (topThickness === 16) return 46;
      if (topThickness === 18) return 55;
    }
    if (boardId === "mdf") {
      if (topThickness === 17) return 55;
      if (topThickness === 18) return 60;
      if (topThickness === 25) return 80;
      if (topThickness === 35) return 112;
    }
  } else {
    // Standard quality logic
    if (boardId === "plpb") {
      if (topThickness === 18) return 49;
      if (topThickness === 25) return 63;
      if (topThickness === 36) return 98;
    }
    if (boardId === "hdhmr") {
      if (topThickness === 25) return 108;
    }
    if (boardId === "mdf") {
      if (topThickness === 18) return 61;
      if (topThickness === 25) return 83;
      if (topThickness === 36) return 122;
    }
  }
  return baseRate * (topThickness / 18);
};

const LEGS = [
  { id: "board", name: "Board/Wooden Legs", cost: 0 },
  { id: "metal_loop", name: "Metal Loop Legs", cost: 1500 },
  { id: "metal_c", name: "Metal C-Legs", cost: 1800 },
  { id: "metal_leg", name: "Metal Leg", cost: 0 },
];

const WIRE_MANAGER_COST = 450;
const GROMMET_COST = 100;

const LABOR_COST = 200; // Higher making charges for L-Shape
const PACKING_COST = 100;
const TOOLING_COST = 100;
const PROFIT_PERCENTAGE = 0.25;

const LPATTI_COST = 10;
const LPATTI_QTY = 8;
const BUFFER_COST = 5;
const BUFFER_QTY = 4;

const HARDWARE_CHANNEL_COST = 235; // per pair
const HARDWARE_HANDLE_COST = 50; // per piece
const HARDWARE_LOCK_COST = 90; // per piece

const CPU_TROLLEY_COST = 350;
const CPU_MOUNT_COST = 550;

export const MARBLE_TYPES = [
  { id: "onyx", name: "Onyx (14mm)", costPerSqFt: 1500, thickness: 14 },
];

export function calculateLShapeCost({
  mainWidth,
  mainDepth,
  returnWidth,
  returnDepth,
  height,
  returnHeight,
  topThickness,
  boardId,
  legId,
  boardLegType,
  metalLegStyle,
  metalLegPipeSize,
  includeModesty,
  modestyType = "standard",
  metalModestyType = "plain",
  wireManagement,
  includePedestal,
  includeReturnStorage,
  includeDrawer = false,
  drawerCount = 1,
  singleDrawerType = "corner",
  cpuStandType = "none",
  returnStorageType = "3_shutters_1_open",
  quality = "standard",
  innerMica = "none",
  outerMica = "none",
  topMaterialCategory = "wood",
  marbleTypeId = "onyx",
}: any) {
  const boards = getBoards(quality);
  const board = boards.find((b) => b.id === boardId)!;
  const legType = LEGS.find((l) => l.id === legId)!;

  const innerRate = innerMica === "0.8" ? 35 : innerMica === "1.0" ? 56 : 0;
  const outerRate = outerMica === "0.8" ? 35 : outerMica === "1.0" ? 56 : 0;
  const totalMicaRate = innerRate + outerRate;

  // 1. Table Top Area (Main + Return overlapping adjustment)
  // Assume L-shape is joined, so the return width includes or excludes the main desk depth.
  // For simplicity, we calculate total area as (Main W * Main D) + (Return W * Return D)
  const mainTopAreaSqMm = mainWidth * mainDepth;
  const returnTopAreaSqMm = includeReturnStorage
    ? returnWidth * returnDepth
    : 0;

  let topRate = 0;
  let displayThickness = topThickness;
  let displayMaterialName = "";

  if (topMaterialCategory === "marble") {
    const marble = MARBLE_TYPES.find((m) => m.id === marbleTypeId) || MARBLE_TYPES[0];
    topRate = marble.costPerSqFt;
    displayThickness = marble.thickness;
    displayMaterialName = marble.name;
  } else {
    topRate = getTopRate(board.id, board.costPerSqFt, topThickness, quality) + totalMicaRate;
    displayThickness = topThickness;
    displayMaterialName = board.name;
  }

  const topCost = ((mainTopAreaSqMm + returnTopAreaSqMm) / 90000) * topRate;

  const micaLabels = [];
  if (topMaterialCategory !== "marble") {
    if (innerMica !== "none") micaLabels.push(`Inner ${innerMica}mm`);
    if (outerMica !== "none") micaLabels.push(`Outer ${outerMica}mm`);
  }
  const micaSuffix = micaLabels.length > 0 ? ` with Mica (${micaLabels.join(" + ")})` : "";

  const mainTopSqFt = mainTopAreaSqMm / 90000;
  const bDetails = [
    {
      label: `Main Table Top (${mainWidth}x${mainDepth}x${displayThickness}mm) - ${displayMaterialName}${micaSuffix} (${mainTopSqFt.toFixed(2)} sq.ft)`,
      cost: Math.round(mainTopSqFt * topRate),
    },
  ];

  if (includeReturnStorage) {
    const returnTopSqFt = returnTopAreaSqMm / 90000;
    bDetails.push({
      label: `Return Storage Top (${returnWidth}x${returnDepth}x${displayThickness}mm) - ${displayMaterialName}${micaSuffix} (${returnTopSqFt.toFixed(2)} sq.ft)`,
      cost: Math.round(returnTopSqFt * topRate),
    });
  }

  let bCostTotal = topCost;

  // Return Storage Carcass Calculation
  let returnCarcassAreaSqMm = 0;
  if (includeReturnStorage && returnStorageType !== "table_only") {
    const cabinetHeight = Math.max(100, returnHeight - displayThickness);
    const bottomArea = returnWidth * returnDepth;
    const backArea = returnWidth * cabinetHeight;
    
    let verticalsArea = 5 * returnDepth * cabinetHeight; // default 5 vertical gables for 4-part division
    let shelvesArea = 0;
    let shuttersArea = 0;
    let desc = "";

    if (returnStorageType === "3_shutters_1_open") {
      shelvesArea = 1 * (returnWidth / 4) * returnDepth;
      shuttersArea = 3 * (returnWidth / 4) * cabinetHeight;
      desc = "Option 1: 3 Shutters + 1 Open Shelf";
      verticalsArea = 5 * returnDepth * cabinetHeight;
    } else if (returnStorageType === "2_shutters_1_open") {
      shelvesArea = 1 * (returnWidth / 3) * returnDepth;
      shuttersArea = 2 * (returnWidth / 3) * cabinetHeight;
      desc = "Option 2: 2 Shutters + 1 Open Shelf";
      verticalsArea = 4 * returnDepth * cabinetHeight; // 4 vertical gables for 3-part division (2 ends + 2 partitions)
    } else if (returnStorageType === "2_drawers_3_shutters") {
      desc = "Option 3: 2 Drawers + 3 Shutters";
      verticalsArea = 5 * returnDepth * cabinetHeight; // 5 vertical gables
      shuttersArea = 3 * (returnWidth / 4) * cabinetHeight; // 3 shutters
      const drawerFrontsArea = (returnWidth / 4) * cabinetHeight;
      shuttersArea += drawerFrontsArea; 
      
      const compWidth = returnWidth / 4;
      const drawerW = compWidth - 30;
      const drawerH = Math.max(50, (cabinetHeight - 40) / 2);
      const drawerD = returnDepth - 50;
      const drawerBoxAreaSqMm = 2 * (
        (drawerW * drawerH * 2) +
        (drawerD * drawerH * 2) +
        (drawerW * drawerD)
      );
      shelvesArea = drawerBoxAreaSqMm; // Store inner drawer box board area
    } else if (returnStorageType === "2_drawers_4_shutters") {
      desc = "Option 4: 2 Drawers + 4 Shutters";
      verticalsArea = 6 * returnDepth * cabinetHeight; // 6 vertical gables for 5-part division
      shuttersArea = 4 * (returnWidth / 5) * cabinetHeight; // 4 shutters
      const drawerFrontsArea = (returnWidth / 5) * cabinetHeight;
      shuttersArea += drawerFrontsArea;

      const compWidth = returnWidth / 5;
      const drawerW = compWidth - 30;
      const drawerH = Math.max(50, (cabinetHeight - 40) / 2);
      const drawerD = returnDepth - 50;
      const drawerBoxAreaSqMm = 2 * (
        (drawerW * drawerH * 2) +
        (drawerD * drawerH * 2) +
        (drawerW * drawerD)
      );
      shelvesArea = drawerBoxAreaSqMm; // Store inner drawer box board area
    } else if (returnStorageType === "3_drawers_2_shutters_open") {
      desc = "Option 5: 3 Drawers + 2 Shutters + 1 Open Shelf";
      verticalsArea = 5 * returnDepth * cabinetHeight; // 5 vertical gables for 4-part division
      shuttersArea = 2 * (returnWidth / 4) * cabinetHeight; // 2 shutters
      const drawerFrontsArea = (returnWidth / 4) * cabinetHeight; // 3 drawer fronts occupy 1 compartment
      shuttersArea += drawerFrontsArea;

      const compWidth = returnWidth / 4;
      const drawerW = compWidth - 30;
      const drawerH = Math.max(50, (cabinetHeight - 50) / 3);
      const drawerD = returnDepth - 50;
      const drawerBoxAreaSqMm = 3 * (
        (drawerW * drawerH * 2) +
        (drawerD * drawerH * 2) +
        (drawerW * drawerD)
      );
      shelvesArea = drawerBoxAreaSqMm + (1 * (returnWidth / 4) * returnDepth); // inner drawer boxes + 1 open shelf divider
    } else if (returnStorageType === "3_drawers_1_open_1_shutter") {
      desc = "Option 6: 3 Drawers + 1 Open Shelf + 1 Shutter";
      verticalsArea = 4 * returnDepth * cabinetHeight; // 4 vertical gables for 3-part division
      shuttersArea = 1 * (returnWidth / 3) * cabinetHeight; // 1 shutter
      const drawerFrontsArea = (returnWidth / 3) * cabinetHeight; // 3 drawer fronts occupy 1 compartment
      shuttersArea += drawerFrontsArea;

      const compWidth = returnWidth / 3;
      const drawerW = compWidth - 30;
      const drawerH = Math.max(50, (cabinetHeight - 50) / 3);
      const drawerD = returnDepth - 50;
      const drawerBoxAreaSqMm = 3 * (
        (drawerW * drawerH * 2) +
        (drawerD * drawerH * 2) +
        (drawerW * drawerD)
      );
      shelvesArea = drawerBoxAreaSqMm + (1 * (returnWidth / 3) * returnDepth); // inner drawer boxes + 1 open shelf divider
    } else if (returnStorageType === "2_shutters_1_drawer_2_open") {
      desc = "Option 7: 2 Shutters + 1 Drawer + 2 Open Shelves";
      verticalsArea = 4 * returnDepth * cabinetHeight; // 4 vertical gables for 3-part division
      shuttersArea = 2 * (returnWidth / 3) * cabinetHeight; // 2 shutters occupy 2 compartments

      const compWidth = returnWidth / 3;
      const drawerHeight = Math.max(50, (cabinetHeight - 50) / 3); // 1 drawer occupies roughly 1/3 height of compartment
      const drawerFrontsArea = compWidth * drawerHeight; // 1 drawer front
      shuttersArea += drawerFrontsArea;

      const drawerW = compWidth - 30;
      const drawerH = drawerHeight - 20; // internal box height
      const drawerD = returnDepth - 50;
      const drawerBoxAreaSqMm = 1 * (
        (drawerW * drawerH * 2) +
        (drawerD * drawerH * 2) +
        (drawerW * drawerD)
      );
      shelvesArea = drawerBoxAreaSqMm + (2 * compWidth * returnDepth); // inner drawer boxes + 2 open shelves in compartment 3
    } else if (returnStorageType === "2_shutters_2_open") {
      shelvesArea = 2 * (returnWidth / 4) * returnDepth;
      shuttersArea = 2 * (returnWidth / 4) * cabinetHeight;
      desc = "Option 2 (Legacy): 2 Shutters + 2 Open Shelves";
      verticalsArea = 5 * returnDepth * cabinetHeight;
    } else if (returnStorageType === "all_open") {
      shelvesArea = 4 * (returnWidth / 4) * returnDepth;
      shuttersArea = 0;
      desc = "Option 3 (Legacy): All Open Shelves";
      verticalsArea = 5 * returnDepth * cabinetHeight;
    }

    returnCarcassAreaSqMm = bottomArea + backArea + verticalsArea + shelvesArea + shuttersArea;
    const carcassAreaSqFt = returnCarcassAreaSqMm / 90000;
    const carcassCost = carcassAreaSqFt * (board.costPerSqFt + totalMicaRate);

    bCostTotal += carcassCost;
    bDetails.push({
      label: `Return Storage Carcass (${desc})${micaSuffix} (${carcassAreaSqFt.toFixed(2)} sq.ft)`,
      cost: Math.round(carcassCost),
    });

    const isThreePart = returnStorageType === "2_shutters_1_open" || returnStorageType === "3_drawers_1_open_1_shutter" || returnStorageType === "2_shutters_1_drawer_2_open";
    const isFivePart = returnStorageType === "2_drawers_4_shutters";
    const partCount = isThreePart ? 3 : isFivePart ? 5 : 4;
    const verticalsCount = isThreePart ? 4 : isFivePart ? 6 : 5;

    const exposedCarcassFrontM = (2 * returnWidth + verticalsCount * cabinetHeight) / 1000;
    
    let shelfFrontM = 0;
    let shutterPerimetersM = 0;

    if (returnStorageType === "3_shutters_1_open") {
      shelfFrontM = (returnWidth / 4) / 1000;
      shutterPerimetersM = 3 * (2 * (returnWidth / 4) + 2 * cabinetHeight) / 1000;
    } else if (returnStorageType === "2_shutters_1_open") {
      shelfFrontM = (returnWidth / 3) / 1000;
      shutterPerimetersM = 2 * (2 * (returnWidth / 3) + 2 * cabinetHeight) / 1000;
    } else if (returnStorageType === "2_drawers_3_shutters") {
      shelfFrontM = 0;
      const w = returnWidth / 4;
      const h = cabinetHeight;
      shutterPerimetersM = (3 * (2 * w + 2 * h) + 2 * (2 * w + h)) / 1000;
    } else if (returnStorageType === "2_drawers_4_shutters") {
      shelfFrontM = 0;
      const w = returnWidth / 5;
      const h = cabinetHeight;
      shutterPerimetersM = (4 * (2 * w + 2 * h) + 2 * (2 * w + h)) / 1000;
    } else if (returnStorageType === "3_drawers_2_shutters_open") {
      shelfFrontM = (returnWidth / 4) / 1000;
      const w = returnWidth / 4;
      const h = cabinetHeight;
      shutterPerimetersM = (2 * (2 * w + 2 * h) + 3 * (2 * w + h)) / 1000;
    } else if (returnStorageType === "3_drawers_1_open_1_shutter") {
      shelfFrontM = (returnWidth / 3) / 1000;
      const w = returnWidth / 3;
      const h = cabinetHeight;
      shutterPerimetersM = (1 * (2 * w + 2 * h) + 3 * (2 * w + h)) / 1000;
    } else if (returnStorageType === "2_shutters_1_drawer_2_open") {
      shelfFrontM = 2 * (returnWidth / 3) / 1000; // 2 open shelves in compartment 3
      const w = returnWidth / 3;
      const h = cabinetHeight;
      shutterPerimetersM = (2 * (2 * w + 2 * h) + (2 * w + 2 * (h / 3))) / 1000;
    } else if (returnStorageType === "2_shutters_2_open") {
      shelfFrontM = 2 * (returnWidth / 4) / 1000;
      shutterPerimetersM = 2 * (2 * (returnWidth / 4) + 2 * cabinetHeight) / 1000;
    } else if (returnStorageType === "all_open") {
      shelfFrontM = 4 * (returnWidth / 4) / 1000;
      shutterPerimetersM = 0;
    }

    const totalCarcassEbM = (exposedCarcassFrontM + shelfFrontM + shutterPerimetersM) * 1.2;
    const carcassEbCost = totalCarcassEbM * 13;

    bCostTotal += carcassEbCost;
    bDetails.push({
      label: `Return Storage Carcass Edge Banding (0.8mm, ${totalCarcassEbM.toFixed(1)}m)`,
      cost: Math.round(carcassEbCost),
    });
  }

  // Edge Banding for Table Tops (only for Wood tops)
  if (topMaterialCategory !== "marble") {
    let edgeBandingRate = 13;
    let edgeBandingThickness = "0.8mm";
    if (topThickness === 25) {
      edgeBandingRate = 28;
      edgeBandingThickness = "2mm";
    } else if (topThickness === 36) {
      edgeBandingRate = 48;
      edgeBandingThickness = "0.40mm"; // User mentioned .40 mm
    }

    let topPerimeterM = (mainWidth * 2 + mainDepth * 2) / 1000;
    if (includeReturnStorage) {
      topPerimeterM += (returnWidth * 2 + returnDepth * 2) / 1000;
      // Subtract the overlap joint length (times 2 because both edges are joined)
      topPerimeterM -= (2 * Math.min(mainDepth, returnDepth)) / 1000;
    }
    
    topPerimeterM *= 1.2; // 20% wastage

    const edgeBandingCost = topPerimeterM * edgeBandingRate;
    bCostTotal += edgeBandingCost;
    bDetails.push({
      label: `Table Top Edge Banding (${edgeBandingThickness}, ${Math.round(topPerimeterM * 10) / 10}m)`,
      cost: Math.round(edgeBandingCost),
    });
  }

  // 2. Legs / Understructure
  let hCost = 0;
  const hDetails: {
    label: string;
    cost: number;
    qty: number;
    unitPrice: number;
    unitLabel: string;
  }[] = [];

  if (legId === "board") {
    // 3 wooden legs for an L-Shape table typically, 2 if no return
    const legCount = includeReturnStorage ? 3 : 2;

    let mainLegDepth = mainDepth;
    let retLegDepth = returnDepth;
    if (boardLegType === "shorter") {
      if (mainDepth === 600) mainLegDepth = 400;
      else if (mainDepth === 750) mainLegDepth = 450;
      else if (mainDepth === 900) mainLegDepth = 600;
      else mainLegDepth = Math.max(400, mainDepth - 200);

      if (returnDepth === 600) retLegDepth = 400;
      else if (returnDepth === 750) retLegDepth = 450;
      else if (returnDepth === 900) retLegDepth = 600;
      else retLegDepth = Math.max(400, returnDepth - 200);
    }

    const effectiveDepth = includeReturnStorage
      ? Math.max(mainLegDepth, retLegDepth)
      : mainLegDepth;
    const legAreaSqMm = legCount * (effectiveDepth * height);
    const legAreaSqFt = legAreaSqMm / 90000;
    const legsCost = legAreaSqFt * (board.costPerSqFt + totalMicaRate);
    bCostTotal += legsCost;
    bDetails.push({
      label: `Board Understructure Legs (x${legCount}) - ${effectiveDepth}D${micaSuffix} (${legAreaSqFt.toFixed(2)} sq.ft)`,
      cost: Math.round(legsCost),
    });

    // Edge Banding for Legs (assumes standard 18mm board for legs with 0.8mm edge banding at 13/m)
    const legPerimeterM = ((legCount * (effectiveDepth * 2 + height * 2)) / 1000) * 1.2;
    const legEdgeBandingCost = legPerimeterM * 13;
    bCostTotal += legEdgeBandingCost;
    bDetails.push({
      label: `Legs Edge Banding (0.8mm, ${legPerimeterM.toFixed(3)}m)`,
      cost: Math.round(legEdgeBandingCost),
    });
  } else if (legId === "metal_leg") {
    // Pipe for vertical legs
    let verticalsMm = includeReturnStorage
      ? 6 * Math.max(height, returnHeight)
      : 4 * height;
    if (metalLegStyle === "u_shape") {
      verticalsMm += includeReturnStorage
        ? 2 * mainDepth + returnDepth
        : 2 * mainDepth;
    }
    const verticalFeet = verticalsMm / 304.8;
    const verticalRate = metalLegPipeSize === "50x50" ? 35 : 27;
    const costVerticals = verticalFeet * verticalRate;

    // 40x20 Pipe for horizontal supports
    const mainWidthPipe = Math.max(0, mainWidth - 140);
    const mainDepthPipe = Math.max(0, mainDepth - 180);
    const returnWidthPipe = Math.max(0, returnWidth - 140);

    const horizontalsMm = includeReturnStorage
      ? 2 * mainWidthPipe + 2 * mainDepthPipe + 2 * returnWidthPipe
      : 2 * mainWidthPipe + 2 * mainDepthPipe;

    const horizontalFeet = horizontalsMm / 304.8;
    const cost40x20 = horizontalFeet * 19.6; // 7kg * 56 Rs/kg / 20ft pipe = 19.6 Rs/rft

    const totalFeet = verticalFeet + horizontalFeet;
    const powderCoatingCost = totalFeet * 30;

    const numLegs = includeReturnStorage ? 6 : 4;
    const bufferCost = numLegs * 7;
    const nutCost = numLegs * 5;
    const butterflyCost = numLegs * 2 * 12.5;
    const accessoriesCost = bufferCost + nutCost + butterflyCost;

    hCost += costVerticals + cost40x20 + powderCoatingCost + accessoriesCost;

    hDetails.push({
      label: `Metal Legs ${metalLegPipeSize} (${metalLegStyle === "u_shape" ? "U-Shape" : "Straight"})`,
      qty: Number(verticalFeet.toFixed(2)),
      unitPrice: verticalRate,
      unitLabel: "rft",
      cost: Math.round(costVerticals),
    });
    hDetails.push({
      label: `Metal Frame 40x20 Pipes`,
      qty: Number(horizontalFeet.toFixed(2)),
      unitPrice: 19.6,
      unitLabel: "rft",
      cost: Math.round(cost40x20),
    });
    hDetails.push({
      label: "Powder Coating",
      qty: Number(totalFeet.toFixed(2)),
      unitPrice: 30,
      unitLabel: "rft",
      cost: Math.round(powderCoatingCost),
    });
    hDetails.push({
      label: "Leg Accessories (Buffer, Nut, Butterfly)",
      qty: numLegs,
      unitPrice: 37, // 7 + 5 + (2 * 12.5)
      unitLabel: "leg set",
      cost: Math.round(accessoriesCost),
    });
  } else {
    // Metal legs for L-Shape (usually 3 or more depending on structure, 2 if no return)
    const legCount = includeReturnStorage ? 3 : 2;
    const legTotalCost = legCount * legType.cost;
    hCost += legTotalCost;
    hDetails.push({
      label: legType.name,
      qty: legCount,
      unitPrice: legType.cost,
      unitLabel: "pcs",
      cost: legTotalCost,
    });
  }

  // 3. Modesty Panel
  let modCost = 0;
  if (includeModesty) {
    // Modesty panel for both main and return
    let modestyHeight = 750;
    if (legId === "board") {
      if (modestyType === "short") modestyHeight = 600;
      else if (modestyType === "shorter") modestyHeight = 300;
      else modestyHeight = 715; // standard
    } else {
      modestyHeight = 450;
    }
    const mainModestyWidth = mainWidth - 18;
    const returnModestyWidth = includeReturnStorage ? returnWidth - 18 : 0;
    const modestyAreaSqMm =
      (mainModestyWidth + returnModestyWidth) * modestyHeight;
    const modestyAreaSqFt = modestyAreaSqMm / 90000;

    if (legId === "board") {
      modCost = modestyAreaSqFt * (board.costPerSqFt + totalMicaRate);
      bCostTotal += modCost;
      bDetails.push({
        label: includeReturnStorage
          ? `All Table Modesty Panels (${mainModestyWidth}x${modestyHeight}, ${returnModestyWidth}x${modestyHeight})${micaSuffix} (${modestyAreaSqFt.toFixed(2)} sq.ft)`
          : `Main Modesty Panel (${mainModestyWidth}x${modestyHeight})${micaSuffix} (${modestyAreaSqFt.toFixed(2)} sq.ft)`,
        cost: Math.round(modCost),
      });

      // Modesty Edge Banding (1 bottom edge per panel)
      const modestyEbLengthM = ((mainModestyWidth + returnModestyWidth) / 1000) * 1.2;
      const modestyEbCost = modestyEbLengthM * 13;
      bCostTotal += modestyEbCost;
      bDetails.push({
        label: `Modesty Edge Banding (0.8mm, ${modestyEbLengthM.toFixed(3)}m)`,
        cost: Math.round(modestyEbCost),
      });
    } else {
      // Metal Leg Modesty
      const metalModestyRateSqFt = metalModestyType === "cnc" ? 163 : 100;
      modCost = modestyAreaSqFt * metalModestyRateSqFt;
      hCost += modCost;
      hDetails.push({
        label: `Metal Modesty Panel (${metalModestyType === "cnc" ? "CNC Design" : "Plain"})`,
        qty: Number(modestyAreaSqFt.toFixed(2)),
        unitPrice: metalModestyRateSqFt,
        unitLabel: "sqft",
        cost: Math.round(modCost),
      });
    }
  }

  // 4. Wire Management
  if (wireManagement === "raceway") {
    const racewayCost = WIRE_MANAGER_COST * 2; // Need 2 for L-shape typically
    hCost += racewayCost;
    hDetails.push({
      label: "Alu Flap Raceway",
      qty: 2,
      unitPrice: WIRE_MANAGER_COST,
      unitLabel: "Set",
      cost: racewayCost,
    });
  } else if (wireManagement === "grommet") {
    const grommetCount = 3; // L shape often needs more grommets
    const gCost = grommetCount * GROMMET_COST;
    hCost += gCost;
    hDetails.push({
      label: "PVC Grommet",
      qty: grommetCount,
      unitPrice: GROMMET_COST,
      unitLabel: "pcs",
      cost: gCost,
    });
  }

  // 5. Fixed/Movable Pedestal
  if (includePedestal) {
    const pedEstimatedCost = 4200; // slightly higher estimate
    hCost += pedEstimatedCost;
    hDetails.push({
      label: "3-Drawer Pedestal Unit",
      qty: 1,
      unitPrice: pedEstimatedCost,
      unitLabel: "unit",
      cost: pedEstimatedCost,
    });
  }

  // 6. Undermount Drawers (Optional)
  if (includeDrawer) {
    let drawerWidth = 0;
    let drawerHeight = 150;
    let drawerDepth = Math.max(300, mainDepth - 200);

    if (singleDrawerType === "corner") {
      drawerWidth = 360;
      drawerHeight = 160;
      drawerDepth = 320;
    } else {
      drawerHeight = 160;
      drawerDepth = mainDepth;
      if (drawerCount === 1) {
        drawerWidth = mainWidth - 36;
      } else {
        drawerWidth = (mainWidth - 36) / 2;
      }
    }

    const drawerAreaSqMm = drawerCount * (
      (drawerWidth * drawerHeight * 2) +
      (drawerDepth * drawerHeight * 2) +
      (drawerWidth * drawerDepth)
    );

    const drawerAreaSqFt = drawerAreaSqMm / 90000;
    const drawerBoardCost = drawerAreaSqFt * (board.costPerSqFt + totalMicaRate);
    bCostTotal += drawerBoardCost;
    bDetails.push({
      label: `Drawers (${drawerCount}x) Board${micaSuffix} (${drawerAreaSqFt.toFixed(2)} sq.ft)`,
      cost: Math.round(drawerBoardCost),
    });

    const channelCost = drawerCount * HARDWARE_CHANNEL_COST;
    const handleCost = drawerCount * HARDWARE_HANDLE_COST;
    const lockCost = drawerCount * HARDWARE_LOCK_COST;

    hCost += channelCost + handleCost + lockCost;
    hDetails.push({
      label: "Drawer Channels",
      qty: drawerCount,
      unitPrice: HARDWARE_CHANNEL_COST,
      unitLabel: "pair",
      cost: channelCost,
    });
    hDetails.push({
      label: "Drawer Handles",
      qty: drawerCount,
      unitPrice: HARDWARE_HANDLE_COST,
      unitLabel: "pcs",
      cost: handleCost,
    });
    hDetails.push({
      label: "Drawer Locks",
      qty: drawerCount,
      unitPrice: HARDWARE_LOCK_COST,
      unitLabel: "pcs",
      cost: lockCost,
    });
  }

  // Return Storage Cabinet Hardware
  if (includeReturnStorage && returnStorageType !== "table_only") {
    let shuttersCount = 0;
    if (returnStorageType === "3_shutters_1_open" || returnStorageType === "2_drawers_3_shutters") {
      shuttersCount = 3;
    } else if (returnStorageType === "2_shutters_1_open" || returnStorageType === "2_shutters_2_open" || returnStorageType === "3_drawers_2_shutters_open" || returnStorageType === "2_shutters_1_drawer_2_open") {
      shuttersCount = 2;
    } else if (returnStorageType === "2_drawers_4_shutters") {
      shuttersCount = 4;
    } else if (returnStorageType === "3_drawers_1_open_1_shutter") {
      shuttersCount = 1;
    }

    if (shuttersCount > 0) {
      const hingesCount = shuttersCount * 2;
      const hingesCost = hingesCount * 62.5; // Rs. 62.5 per hinge
      hCost += hingesCost;
      hDetails.push({
         label: "Return Storage Shutter Hinges",
         qty: hingesCount,
         unitPrice: 62.5,
         unitLabel: "pcs",
         cost: Math.round(hingesCost),
      });

      const shutterHandlesCount = returnStorageType === "2_shutters_1_drawer_2_open" ? 0 : shuttersCount;
      if (shutterHandlesCount > 0) {
        const handlesCost = shutterHandlesCount * HARDWARE_HANDLE_COST;
        hCost += handlesCost;
        hDetails.push({
           label: "Return Storage Shutter Handles",
           qty: shutterHandlesCount,
           unitPrice: HARDWARE_HANDLE_COST,
           unitLabel: "pcs",
           cost: handlesCost,
        });
      }

      // In Option 3 (2 drawers + 3 shutters), there is only 1 lock for the middle shutter, not for all 3 shutters.
      // In Option 4, 5 and 6, there are no shutter locks shown.
      const shutterLocksCount = returnStorageType === "2_drawers_3_shutters" ? 1 : (returnStorageType === "2_drawers_4_shutters" || returnStorageType === "3_drawers_2_shutters_open" || returnStorageType === "3_drawers_1_open_1_shutter") ? 0 : shuttersCount;
      if (shutterLocksCount > 0) {
        const locksCost = shutterLocksCount * HARDWARE_LOCK_COST;
        hCost += locksCost;
        hDetails.push({
          label: "Return Storage Shutter Locks",
          qty: shutterLocksCount,
          unitPrice: HARDWARE_LOCK_COST,
          unitLabel: "pcs",
          cost: locksCost,
        });
      }
    }

    // Add Drawers hardware for Option 3, 4, 5, 6 & 7
    if (returnStorageType === "2_drawers_3_shutters" || returnStorageType === "2_drawers_4_shutters" || returnStorageType === "3_drawers_2_shutters_open" || returnStorageType === "3_drawers_1_open_1_shutter" || returnStorageType === "2_shutters_1_drawer_2_open") {
      const cabinetDrawersCount = (returnStorageType === "3_drawers_2_shutters_open" || returnStorageType === "3_drawers_1_open_1_shutter") ? 3 : (returnStorageType === "2_shutters_1_drawer_2_open" ? 1 : 2);
      const channelCost = cabinetDrawersCount * HARDWARE_CHANNEL_COST;
      const drawerHandlesCount = returnStorageType === "2_shutters_1_drawer_2_open" ? 0 : cabinetDrawersCount;
      const handleCost = drawerHandlesCount * HARDWARE_HANDLE_COST;
      const lockCost = (returnStorageType === "2_drawers_3_shutters" || returnStorageType === "2_shutters_1_drawer_2_open") ? 1 * HARDWARE_LOCK_COST : 0; // Option 3 and Option 7 have 1 lock for top drawer, others have 0

      hCost += channelCost + handleCost + lockCost;
      hDetails.push({
        label: "Return Storage Drawer Channels",
        qty: cabinetDrawersCount,
        unitPrice: HARDWARE_CHANNEL_COST,
        unitLabel: "pair",
        cost: channelCost,
      });
      if (drawerHandlesCount > 0) {
        hDetails.push({
          label: "Return Storage Drawer Handles",
          qty: drawerHandlesCount,
          unitPrice: HARDWARE_HANDLE_COST,
          unitLabel: "pcs",
          cost: handleCost,
        });
      }
      if (lockCost > 0) {
        hDetails.push({
          label: "Return Storage Drawer Locks",
          qty: 1,
          unitPrice: HARDWARE_LOCK_COST,
          unitLabel: "pcs",
          cost: lockCost,
        });
      }
    }
  }

  // 7. CPU Stand (Optional)
  if (cpuStandType === "trolley") {
    hCost += CPU_TROLLEY_COST;
    hDetails.push({
      label: "CPU Trolley",
      qty: 1,
      unitPrice: CPU_TROLLEY_COST,
      unitLabel: "unit",
      cost: CPU_TROLLEY_COST,
    });
  } else if (cpuStandType === "mount") {
    hCost += CPU_MOUNT_COST;
    hDetails.push({
      label: "CPU Mount Bracket",
      qty: 1,
      unitPrice: CPU_MOUNT_COST,
      unitLabel: "unit",
      cost: CPU_MOUNT_COST,
    });
  }

  // Add Fixed Hardware (Patti & Buffer)
  if (legId !== "metal_leg") {
    const pattiTotal = LPATTI_QTY * LPATTI_COST;
    hCost += pattiTotal;
    hDetails.push({
      label: "L Patti",
      qty: LPATTI_QTY,
      unitPrice: LPATTI_COST,
      unitLabel: "pcs",
      cost: pattiTotal,
    });

    const bufferTotal = BUFFER_QTY * BUFFER_COST;
    hCost += bufferTotal;
    hDetails.push({
      label: "Buffer",
      qty: BUFFER_QTY,
      unitPrice: BUFFER_COST,
      unitLabel: "pcs",
      cost: bufferTotal,
    });
  }

  let legsArea = 0;
  if (legId === "board") {
    const legCount = includeReturnStorage ? 3 : 2;
    let mainLegDepth = mainDepth;
    let retLegDepth = returnDepth;
    if (boardLegType === "shorter") {
      if (mainDepth === 600) mainLegDepth = 400;
      else if (mainDepth === 750) mainLegDepth = 450;
      else if (mainDepth === 900) mainLegDepth = 600;
      else mainLegDepth = Math.max(400, mainDepth - 200);

      if (returnDepth === 600) retLegDepth = 400;
      else if (returnDepth === 750) retLegDepth = 450;
      else if (returnDepth === 900) retLegDepth = 600;
      else retLegDepth = Math.max(400, returnDepth - 200);
    }
    const effectiveDepth = includeReturnStorage ? Math.max(mainLegDepth, retLegDepth) : mainLegDepth;
    legsArea = legCount * (effectiveDepth * height);
  }

  let modArea = 0;
  if (includeModesty) {
    let modestyHeight = 750;
    if (legId === "board") {
      if (modestyType === "short") modestyHeight = 600;
      else if (modestyType === "shorter") modestyHeight = 300;
      else modestyHeight = 715;
    }
    const mainModestyWidth = mainWidth - 18;
    const returnModestyWidth = includeReturnStorage ? returnWidth - 18 : 0;
    modArea = (mainModestyWidth + returnModestyWidth) * modestyHeight;
  }

  let drawerArea = 0;
  if (includeDrawer) {
    let drawerWidth = 0;
    let drawerHeight = 150;
    let drawerDepth = Math.max(300, mainDepth - 200);

    if (singleDrawerType === "corner") {
      drawerWidth = 360;
      drawerHeight = 160;
      drawerDepth = 320;
    } else {
      drawerHeight = 160;
      drawerDepth = mainDepth;
      if (drawerCount === 1) {
        drawerWidth = mainWidth - 36;
      } else {
        drawerWidth = (mainWidth - 36) / 2;
      }
    }
    drawerArea = drawerCount * (
      (drawerWidth * drawerHeight * 2) +
      (drawerDepth * drawerHeight * 2) +
      (drawerWidth * drawerDepth)
    );
  }

  const carcassAreaToAdd = (includeReturnStorage && returnStorageType !== "table_only") ? returnCarcassAreaSqMm : 0;
  const calculatedSqFt =
    ((topMaterialCategory === "marble" ? 0 : (mainTopAreaSqMm + returnTopAreaSqMm)) + legsArea + modArea + drawerArea + carcassAreaToAdd) /
    90000;
  const tSqFt = calculatedSqFt.toFixed(2);
  const waste = Math.round(bCostTotal * 0.15);

  const mainWidthExtraSteps = Math.max(0, Math.floor((mainWidth - 900) / 150));
  const mainDepthExtraSteps = Math.max(0, Math.floor((mainDepth - 600) / 150));
  const dimensionExtra = (mainWidthExtraSteps + mainDepthExtraSteps) * 50;

  const lCost = Math.round((bCostTotal + waste + hCost) * 0.20);
  const pCost = PACKING_COST + dimensionExtra;

  // Total raw + labor
  const directCost = bCostTotal + waste + hCost + lCost + pCost;

  const tCost = TOOLING_COST + dimensionExtra;
  const subTotal = directCost + tCost;
  const prof = Math.round(subTotal * PROFIT_PERCENTAGE);

  const total = subTotal + prof;

  return {
    boardCostTotal: Math.round(bCostTotal),
    boardDetails: bDetails,
    hardwareCost: hCost,
    hardwareDetails: hDetails,
    modestyCost: Math.round(modCost),
    wasteCost: waste,
    laborCost: lCost,
    packingCost: pCost,
    toolingCost: tCost,
    profit: prof,
    totalCost: Math.round(total),
    totalSqFt: Number(tSqFt),
  };
}

const ReturnStorage2DDrawing = ({ style }: { style: string }) => {
  if (style === "table_only") {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-4">
        <svg viewBox="0 0 500 200" className="w-full max-w-sm h-auto">
          {/* Floor line */}
          <line x1="10" y1="180" x2="490" y2="180" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
          
          {/* Table Top */}
          <rect x="50" y="50" width="400" height="15" rx="1" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="50" y1="54" x2="450" y2="54" stroke="#1e293b" strokeWidth="0.5" />
          
          {/* Table Legs */}
          <rect x="70" y="65" width="16" height="115" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5" />
          <rect x="414" y="65" width="16" height="115" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5" />
          
          {/* Levelers */}
          <rect x="67" y="180" width="22" height="2" fill="#1e293b" />
          <rect x="411" y="180" width="22" height="2" fill="#1e293b" />
        </svg>
        <div className="text-center mt-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">FRONT VIEW</span>
          <span className="text-[11px] text-slate-400">Plain Table Extension (No Cabinet)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm mt-4 max-w-md mx-auto">
      <div className="w-full relative">
        <svg viewBox="0 0 600 240" className="w-full h-auto">
          {/* Definitions for hatch pattern to simulate wood grain on sliding shutters */}
          <defs>
            <pattern id="woodgrain_hatch" width="16" height="120" patternUnits="userSpaceOnUse">
              <line x1="2" y1="0" x2="2" y2="120" stroke="#cbd5e1" strokeWidth="0.75" />
              <line x1="6" y1="0" x2="6" y2="120" stroke="#e2e8f0" strokeWidth="0.5" />
              <line x1="10" y1="0" x2="10" y2="120" stroke="#cbd5e1" strokeWidth="0.75" />
              <line x1="14" y1="0" x2="14" y2="120" stroke="#f1f5f9" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Floor guideline */}
          <line x1="10" y1="215" x2="590" y2="215" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />

          {/* Table Top (Double line for wooden panel edge thickness) */}
          <rect x="40" y="30" width="520" height="14" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <line x1="40" y1="34" x2="560" y2="34" stroke="#1e293b" strokeWidth="0.5" />

          {/* Outer Cabinet Carcass Body */}
          <rect x="46" y="44" width="508" height="152" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />

          {/* Base / Skirting Recessed Support Plinth */}
          <rect x="54" y="196" width="492" height="18" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />

          {style === "3_shutters_1_open" ? (
            <>
              {/* Internal Dividers separating into 4 equal compartments */}
              {/* x positions: 52 (left limit), 548 (right limit). Total inside width = 496. 496 / 4 = 124 each. */}
              {/* Divider 1 */}
              <line x1="176" y1="44" x2="176" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              {/* Divider 2 */}
              <line x1="300" y1="44" x2="300" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              {/* Divider 3 */}
              <line x1="424" y1="44" x2="424" y2="196" stroke="#1e293b" strokeWidth="1.5" />

              {/* Compartment 1 (left shutter, wood grain vertical lines) */}
              <g>
                <rect x="49" y="46" width="124" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="50" width="116" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines representing planks/wood texture as in 2D blueprint */}
                <line x1="74" y1="54" x2="74" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="99" y1="54" x2="99" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="124" y1="54" x2="124" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="149" y1="54" x2="149" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Handle on the right side of this door */}
                <rect x="154" y="70" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Compartment 2 (second, plain white sliding shutter as per drawing) */}
              <g>
                <rect x="178" y="46" width="120" height="147" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
                <rect x="182" y="50" width="112" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Handle on the left side of this door */}
                <rect x="190" y="70" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Compartment 3 (third, open shelf with 1 horizontal shelf) */}
              <g>
                <rect x="302" y="116" width="120" height="8" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* Compartment 4 (right shutter, wood grain vertical lines) */}
              <g>
                <rect x="426" y="46" width="122" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="430" y="50" width="114" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines */}
                <line x1="451" y1="54" x2="451" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="476" y1="54" x2="476" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="501" y1="54" x2="501" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="526" y1="54" x2="526" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Handle on the left side of this door */}
                <rect x="438" y="70" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>
            </>
          ) : style === "2_drawers_4_shutters" ? (
            <>
              {/* Internal Dividers separating into 5 equal compartments */}
              {/* x positions: Divider 1 at 148, Divider 2 at 250, Divider 3 at 352, Divider 4 at 454 */}
              <line x1="148" y1="44" x2="148" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="250" y1="44" x2="250" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="352" y1="44" x2="352" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="454" y1="44" x2="454" y2="196" stroke="#1e293b" strokeWidth="1.5" />

              {/* Compartment 1: 2 Drawers on the leftmost side */}
              <line x1="46" y1="120" x2="148" y2="120" stroke="#1e293b" strokeWidth="1.5" />

              {/* Top Drawer */}
              <g>
                <rect x="49" y="46" width="96" height="71" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="50" width="88" height="63" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="68" y1="52" x2="68" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="88" y1="52" x2="88" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="108" y1="52" x2="108" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="128" y1="52" x2="128" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                
                {/* Centered Horizontal handle near top */}
                <rect x="82" y="58" width="30" height="4" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Bottom Drawer */}
              <g>
                <rect x="49" y="122" width="96" height="71" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="126" width="88" height="63" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="68" y1="128" x2="68" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="88" y1="128" x2="88" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="108" y1="128" x2="108" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="128" y1="128" x2="128" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                
                {/* Centered Horizontal handle near top */}
                <rect x="82" y="134" width="30" height="4" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Compartment 2: Shutter */}
              <g>
                <rect x="151" y="46" width="96" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="155" y="50" width="88" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="171" y1="54" x2="171" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="191" y1="54" x2="191" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="211" y1="54" x2="211" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="231" y1="54" x2="231" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle near top */}
                <rect x="184" y="58" width="30" height="4" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Compartment 3: Shutter */}
              <g>
                <rect x="253" y="46" width="96" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="257" y="50" width="88" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="273" y1="54" x2="273" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="293" y1="54" x2="293" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="313" y1="54" x2="313" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="333" y1="54" x2="333" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle near top */}
                <rect x="286" y="58" width="30" height="4" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Compartment 4: Shutter */}
              <g>
                <rect x="355" y="46" width="96" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="359" y="50" width="88" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="375" y1="54" x2="375" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="395" y1="54" x2="395" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="415" y1="54" x2="415" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="435" y1="54" x2="435" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle near top */}
                <rect x="388" y="58" width="30" height="4" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Compartment 5: Shutter */}
              <g>
                <rect x="457" y="46" width="94" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="461" y="50" width="86" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="477" y1="54" x2="477" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="497" y1="54" x2="497" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="517" y1="54" x2="517" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="537" y1="54" x2="537" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle near top */}
                <rect x="489" y="58" width="30" height="4" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>
            </>
          ) : style === "3_drawers_2_shutters_open" ? (
            <>
              {/* Internal Dividers separating into 4 equal compartments */}
              <line x1="176" y1="44" x2="176" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="300" y1="44" x2="300" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="424" y1="44" x2="424" y2="196" stroke="#1e293b" strokeWidth="1.5" />

              {/* Compartment 1: 3 Drawers on the leftmost side */}
              <line x1="46" y1="96" x2="176" y2="96" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="46" y1="146" x2="176" y2="146" stroke="#1e293b" strokeWidth="1.5" />

              {/* Top Drawer */}
              <g>
                <rect x="49" y="46" width="124" height="48" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="50" width="116" height="40" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="74" y1="52" x2="74" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="99" y1="52" x2="99" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="124" y1="52" x2="124" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="149" y1="52" x2="149" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle */}
                <rect x="91" y="66" width="40" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Middle Drawer */}
              <g>
                <rect x="49" y="98" width="124" height="46" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="102" width="116" height="38" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="74" y1="104" x2="74" y2="138" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="99" y1="104" x2="99" y2="138" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="124" y1="104" x2="124" y2="138" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="149" y1="104" x2="149" y2="138" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle */}
                <rect x="91" y="117" width="40" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Bottom Drawer */}
              <g>
                <rect x="49" y="148" width="124" height="46" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="152" width="116" height="38" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="74" y1="154" x2="74" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="99" y1="154" x2="99" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="124" y1="154" x2="124" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="149" y1="154" x2="149" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle */}
                <rect x="91" y="167" width="40" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Compartment 2: Shutter with handle on the right */}
              <g>
                <rect x="178" y="46" width="120" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="182" y="50" width="112" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="202" y1="54" x2="202" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="227" y1="54" x2="227" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="252" y1="54" x2="252" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="277" y1="54" x2="277" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Vertical handle on the right side of this door */}
                <rect x="282" y="80" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Compartment 3: Shutter with handle on the left */}
              <g>
                <rect x="302" y="46" width="120" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="306" y="50" width="112" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="326" y1="54" x2="326" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="351" y1="54" x2="351" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="376" y1="54" x2="376" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="401" y1="54" x2="401" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Vertical handle on the left side of this door */}
                <rect x="312" y="80" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Compartment 4: Open shelf with 1 horizontal shelf */}
              <g>
                <rect x="426" y="116" width="120" height="8" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>
            </>
          ) : style === "3_drawers_1_open_1_shutter" ? (
            <>
              {/* Internal Dividers separating into 3 equal compartments */}
              <line x1="214" y1="44" x2="214" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="382" y1="44" x2="382" y2="196" stroke="#1e293b" strokeWidth="1.5" />

              {/* Compartment 1: 3 Drawers on the leftmost side */}
              <line x1="46" y1="94" x2="214" y2="94" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="46" y1="144" x2="214" y2="144" stroke="#1e293b" strokeWidth="1.5" />

              {/* Top Drawer */}
              <g>
                <rect x="49" y="46" width="162" height="46" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="50" width="154" height="38" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="81" y1="52" x2="81" y2="84" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="113" y1="52" x2="113" y2="84" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="145" y1="52" x2="145" y2="84" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="177" y1="52" x2="177" y2="84" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle */}
                <rect x="110" y="66" width="40" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Middle Drawer */}
              <g>
                <rect x="49" y="96" width="162" height="46" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="100" width="154" height="38" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="81" y1="102" x2="81" y2="134" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="113" y1="102" x2="113" y2="134" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="145" y1="102" x2="145" y2="134" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="177" y1="102" x2="177" y2="134" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle */}
                <rect x="110" y="116" width="40" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Bottom Drawer */}
              <g>
                <rect x="49" y="146" width="162" height="46" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="150" width="154" height="38" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="81" y1="152" x2="81" y2="184" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="113" y1="152" x2="113" y2="184" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="145" y1="152" x2="145" y2="184" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="177" y1="152" x2="177" y2="184" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Centered Horizontal handle */}
                <rect x="110" y="166" width="40" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
              </g>

              {/* Compartment 2: Open shelf with 1 horizontal shelf */}
              <g>
                <rect x="216" y="116" width="164" height="8" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* Compartment 3: Shutter with handle on the left */}
              <g>
                <rect x="385" y="46" width="162" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="389" y="50" width="154" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="417" y1="54" x2="417" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="449" y1="54" x2="449" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="481" y1="54" x2="481" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="513" y1="54" x2="513" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Vertical handle on the left side of this door */}
                <rect x="395" y="80" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>
            </>
          ) : style === "2_shutters_1_drawer_2_open" ? (
            <>
              {/* Internal Dividers separating into 3 equal compartments */}
              <line x1="214" y1="44" x2="214" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="382" y1="44" x2="382" y2="196" stroke="#1e293b" strokeWidth="1.5" />

              {/* Compartment 1: Leftmost Shutter with Key Lock */}
              <g>
                <rect x="49" y="46" width="162" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="50" width="154" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="81" y1="54" x2="81" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="113" y1="54" x2="113" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="145" y1="54" x2="145" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="177" y1="54" x2="177" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                
                {/* Lock cylinder top right */}
                <circle cx="196" cy="64" r="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
                <line x1="194" y1="64" x2="198" y2="64" stroke="#1e293b" strokeWidth="1" />
                {/* Hanging Key */}
                <line x1="196" y1="64" x2="196" y2="76" stroke="#1e293b" strokeWidth="1.25" />
                <circle cx="196" cy="76" r="2.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* Compartment 2: Middle Shutter with Key Lock */}
              <g>
                <rect x="216" y="46" width="164" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="220" y="50" width="156" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="248" y1="54" x2="248" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="280" y1="54" x2="280" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="312" y1="54" x2="312" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="344" y1="54" x2="344" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                
                {/* Lock cylinder top right */}
                <circle cx="364" cy="64" r="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
                <line x1="362" y1="64" x2="366" y2="64" stroke="#1e293b" strokeWidth="1" />
                {/* Hanging Key */}
                <line x1="364" y1="64" x2="364" y2="76" stroke="#1e293b" strokeWidth="1.25" />
                <circle cx="364" cy="76" r="2.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* Compartment 3: Top Drawer + 2 Open shelves below */}
              {/* Drawer partition line */}
              <line x1="382" y1="96" x2="550" y2="96" stroke="#1e293b" strokeWidth="1.5" />
              
              {/* Top Drawer */}
              <g>
                <rect x="384" y="46" width="164" height="48" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="388" y="50" width="156" height="40" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="416" y1="52" x2="416" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="448" y1="52" x2="448" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="480" y1="52" x2="480" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="512" y1="52" x2="512" y2="88" stroke="#94a3b8" strokeWidth="0.5" />
                
                {/* Lock cylinder center */}
                <circle cx="466" cy="68" r="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
                <line x1="464" y1="68" x2="468" y2="68" stroke="#1e293b" strokeWidth="1" />
                {/* Hanging Key */}
                <line x1="466" y1="68" x2="466" y2="80" stroke="#1e293b" strokeWidth="1.25" />
                <circle cx="466" cy="80" r="2.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* 2 Open shelves below */}
              <g>
                {/* Shelf 1 */}
                <rect x="384" y="129" width="164" height="8" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
                {/* Shelf 2 */}
                <rect x="384" y="162" width="164" height="8" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>
            </>
          ) : style === "2_drawers_3_shutters" ? (
            <>
              {/* Internal Dividers separating into 4 equal compartments */}
              <line x1="176" y1="44" x2="176" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="300" y1="44" x2="300" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="424" y1="44" x2="424" y2="196" stroke="#1e293b" strokeWidth="1.5" />

              {/* Compartment 1: 2 Drawers on the left */}
              <line x1="46" y1="119" x2="176" y2="119" stroke="#1e293b" strokeWidth="1.5" />

              {/* Top Drawer */}
              <g>
                <rect x="49" y="46" width="124" height="71" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="50" width="116" height="63" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="74" y1="52" x2="74" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="99" y1="52" x2="99" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="124" y1="52" x2="124" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="149" y1="52" x2="149" y2="112" stroke="#94a3b8" strokeWidth="0.5" />
                
                {/* Vertical handle on the left side */}
                <rect x="58" y="64" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
                
                {/* Lock cylinder on the top right */}
                <circle cx="155" cy="64" r="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
                <line x1="153" y1="64" x2="157" y2="64" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* Bottom Drawer */}
              <g>
                <rect x="49" y="121" width="124" height="72" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="125" width="116" height="64" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin vertical lines for wood texture */}
                <line x1="74" y1="128" x2="74" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="99" y1="128" x2="99" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="124" y1="128" x2="124" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="149" y1="128" x2="149" y2="188" stroke="#94a3b8" strokeWidth="0.5" />
                
                {/* Vertical handle on the left side */}
                <rect x="58" y="139" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Compartment 2: Shutter with handle on the right */}
              <g>
                <rect x="178" y="46" width="120" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="182" y="50" width="112" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="202" y1="54" x2="202" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="227" y1="54" x2="227" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="252" y1="54" x2="252" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="277" y1="54" x2="277" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Handle on the right side of this door */}
                <rect x="282" y="102" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Compartment 3: Shutter with handle on the left, lock cylinder at the top left */}
              <g>
                <rect x="302" y="46" width="120" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="306" y="50" width="112" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="326" y1="54" x2="326" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="351" y1="54" x2="351" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="376" y1="54" x2="376" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="401" y1="54" x2="401" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Handle on the left side of this door */}
                <rect x="312" y="102" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
                {/* Lock cylinder on the top left */}
                <circle cx="324" cy="65" r="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.25" />
                <line x1="322" y1="65" x2="326" y2="65" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* Compartment 4: Shutter with handle on the left */}
              <g>
                <rect x="426" y="46" width="122" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="430" y="50" width="114" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Wood texture */}
                <line x1="451" y1="54" x2="451" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="476" y1="54" x2="476" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="501" y1="54" x2="501" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="526" y1="54" x2="526" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Handle on the left side of this door */}
                <rect x="436" y="102" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Support Legs at the bottom */}
              {/* Left support leg */}
              <g>
                <rect x="80" y="200" width="18" height="14" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.25" />
                <rect x="76" y="214" width="26" height="2" fill="#1e293b" />
              </g>
              {/* Middle support leg */}
              <g>
                <rect x="291" y="200" width="18" height="14" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.25" />
                <rect x="287" y="214" width="26" height="2" fill="#1e293b" />
              </g>
              {/* Right support leg */}
              <g>
                <rect x="502" y="200" width="18" height="14" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.25" />
                <rect x="498" y="214" width="26" height="2" fill="#1e293b" />
              </g>
            </>
          ) : (
            <>
              {/* Internal Dividers separating into 3 equal compartments */}
              {/* Divider 1 at 217 */}
              <line x1="217" y1="44" x2="217" y2="196" stroke="#1e293b" strokeWidth="1.5" />
              {/* Divider 2 at 383 */}
              <line x1="383" y1="44" x2="383" y2="196" stroke="#1e293b" strokeWidth="1.5" />

              {/* Compartment 1 (left shutter, wood grain, vertical handle) */}
              <g>
                <rect x="49" y="46" width="165" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="53" y="50" width="157" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin wood grain lines */}
                <line x1="85" y1="54" x2="85" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="120" y1="54" x2="120" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="155" y1="54" x2="155" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="190" y1="54" x2="190" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Handle on the right side of left door */}
                <rect x="198" y="70" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>

              {/* Compartment 2 (middle open shelf divider) */}
              <g>
                <rect x="219" y="116" width="162" height="8" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
              </g>

              {/* Compartment 3 (right shutter, wood grain, vertical handle) */}
              <g>
                <rect x="385" y="46" width="163" height="147" fill="url(#woodgrain_hatch)" stroke="#1e293b" strokeWidth="1" />
                <rect x="389" y="50" width="155" height="139" fill="none" stroke="#475569" strokeWidth="0.75" />
                {/* Thin wood grain lines */}
                <line x1="420" y1="54" x2="420" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="455" y1="54" x2="455" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="490" y1="54" x2="490" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                <line x1="525" y1="54" x2="525" y2="185" stroke="#94a3b8" strokeWidth="0.5" />
                {/* Handle on the left side of right door */}
                <rect x="396" y="70" width="6" height="35" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
              </g>
            </>
          )}
        </svg>
      </div>
      <div className="text-center mt-3 border-t pt-2 w-full">
        <span className="text-[10px] font-mono text-slate-800 font-extrabold tracking-widest block">FRONT VIEW</span>
        <span className="text-xs text-slate-500 font-medium">
          {style === "3_shutters_1_open" 
            ? "Option 1: 3 Shutters + 1 Open Shelf Partition" 
            : style === "2_shutters_1_open"
            ? "Option 2: 2 Shutters + 1 Open Shelf Partition"
            : style === "2_drawers_3_shutters"
            ? "Option 3: 2 Drawers + 3 Shutters (With Locks)"
            : style === "2_drawers_4_shutters"
            ? "Option 4: 2 Drawers + 4 Shutters"
            : style === "3_drawers_2_shutters_open"
            ? "Option 5: 3 Drawers + 2 Shutters + 1 Open Shelf Partition"
            : style === "3_drawers_1_open_1_shutter"
            ? "Option 6: 3 Drawers + 1 Open Shelf + 1 Shutter"
            : style === "2_shutters_1_drawer_2_open"
            ? "Option 7: 2 Shutters + 1 Drawer + 2 Open Shelves"
            : style === "2_shutters_2_open"
            ? "Option 2 (Legacy): 2 Shutters + 2 Open Shelves"
            : style === "all_open"
            ? "Option 3 (Legacy): All Open Shelves"
            : "Plain Table Extension"}
        </span>
      </div>
    </div>
  );
};

export default function LShapeTableCalculator() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const editItemId = searchParams.get("edit");
  const navigate = useNavigate();
  const { projects, addItemToProject, updateItemInProject } = useProjectStore();

  const [isCustomSize, setIsCustomSize] = useState<boolean>(false);
  const [mainWidth, setMainWidth] = useState<number>(900); // mm
  const [mainDepth, setMainDepth] = useState<number>(600); // mm
  const [returnWidth, setReturnWidth] = useState<number>(900); // mm
  const [returnDepth, setReturnDepth] = useState<number>(600); // mm
  const [height, setHeight] = useState<number>(750); // mm
  const [returnHeight, setReturnHeight] = useState<number>(750); // mm
  const [topThickness, setTopThickness] = useState<number>(18); // mm
  const [quality, setQuality] = useState<string>("standard");

  const [topMaterialCategory, setTopMaterialCategory] = useState<string>("wood"); // 'wood', 'marble'
  const [marbleTypeId, setMarbleTypeId] = useState<string>("onyx");

  const [boardId, setBoardId] = useState<string>("plpb");

  const [innerMica, setInnerMica] = useState<string>("none");
  const [outerMica, setOuterMica] = useState<string>("none");

  useEffect(() => {
    if (editItemId && projectId) {
      const project = projects.find(p => p.id === projectId);
      const item = project?.items.find(i => i.id === editItemId);
      if (item && item.config) {
        const c = item.config;
        if (c.isCustomSize !== undefined) setIsCustomSize(c.isCustomSize);
        if (c.mainWidth !== undefined) setMainWidth(c.mainWidth);
        if (c.mainDepth !== undefined) setMainDepth(c.mainDepth);
        if (c.returnWidth !== undefined) setReturnWidth(c.returnWidth);
        if (c.returnDepth !== undefined) setReturnDepth(c.returnDepth);
        if (c.height !== undefined) setHeight(c.height);
        if (c.returnHeight !== undefined) setReturnHeight(c.returnHeight);
        if (c.topThickness !== undefined) setTopThickness(c.topThickness);
        if (c.quality !== undefined) setQuality(c.quality);
        if (c.topMaterialCategory !== undefined) setTopMaterialCategory(c.topMaterialCategory);
        if (c.marbleTypeId !== undefined) setMarbleTypeId(c.marbleTypeId);
        if (c.boardId !== undefined) setBoardId(c.boardId);
        if (c.innerMica !== undefined) setInnerMica(c.innerMica);
        if (c.outerMica !== undefined) setOuterMica(c.outerMica);
        if (c.legId !== undefined) setLegId(c.legId);
        if (c.boardLegType !== undefined) setBoardLegType(c.boardLegType);
        if (c.metalLegStyle !== undefined) setMetalLegStyle(c.metalLegStyle);
        if (c.metalLegPipeSize !== undefined) setMetalLegPipeSize(c.metalLegPipeSize);
        if (c.includeModesty !== undefined) setIncludeModesty(c.includeModesty);
        if (c.modestyType !== undefined) setModestyType(c.modestyType);
        if (c.metalModestyType !== undefined) setMetalModestyType(c.metalModestyType);
        if (c.wireManagement !== undefined) setWireManagement(c.wireManagement);
        if (c.includePedestal !== undefined) setIncludePedestal(c.includePedestal);
        if (c.includeDrawer !== undefined) setIncludeDrawer(c.includeDrawer);
        if (c.drawerCount !== undefined) setDrawerCount(c.drawerCount);
        if (c.singleDrawerType !== undefined) setSingleDrawerType(c.singleDrawerType);
        if (c.cpuStandType !== undefined) setCpuStandType(c.cpuStandType);
        if (c.includeReturnStorage !== undefined) setIncludeReturnStorage(c.includeReturnStorage);
        if (c.returnStorageType !== undefined) setReturnStorageType(c.returnStorageType);
      }
    }
  }, [editItemId, projectId, projects]);

  useEffect(() => {
    const available = getAvailableThicknesses(boardId, quality);
    if (!available.includes(topThickness)) {
      setTopThickness(available[0]);
    }
  }, [boardId, quality, topThickness]);

  const [legId, setLegId] = useState<string>("board");
  const [boardLegType, setBoardLegType] = useState<string>("full");
  const [metalLegStyle, setMetalLegStyle] = useState<string>("straight");
  const [metalLegPipeSize, setMetalLegPipeSize] = useState<string>("40x40");

  const [includeModesty, setIncludeModesty] = useState<boolean>(true);
  const [modestyType, setModestyType] = useState<string>("standard");
  const [metalModestyType, setMetalModestyType] = useState<string>("plain");
  const [wireManagement, setWireManagement] = useState<string>("grommet"); // 'grommet', 'raceway', 'none'
  const [includePedestal, setIncludePedestal] = useState<boolean>(true);
  const [includeDrawer, setIncludeDrawer] = useState<boolean>(false);
  const [drawerCount, setDrawerCount] = useState<number>(1);
  const [singleDrawerType, setSingleDrawerType] = useState<string>("corner");
  const [cpuStandType, setCpuStandType] = useState<string>("none"); // 'none', 'trolley', 'mount'
  const [includeReturnStorage, setIncludeReturnStorage] =
    useState<boolean>(true);
  const [returnStorageType, setReturnStorageType] =
    useState<string>("2_shutters_1_open");

  useEffect(() => {
    const isSize900_600_750 = returnWidth === 900 && returnDepth === 600 && returnHeight === 750;
    if (isSize900_600_750) {
      if (returnStorageType !== "2_shutters_1_open") {
        setReturnStorageType("2_shutters_1_open");
      }
    } else {
      if (returnStorageType === "2_shutters_1_open") {
        setReturnStorageType("3_shutters_1_open");
      }
    }
  }, [returnWidth, returnDepth, returnHeight, returnStorageType]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportIncludeModesty, setExportIncludeModesty] = useState(true);
  const [exportModestyType, setExportModestyType] =
    useState<string>("standard");
  const [exportIncludePedestal, setExportIncludePedestal] = useState(true);
  const [exportWireManagement, setExportWireManagement] =
    useState<string>("grommet");
  const [exportThickness, setExportThickness] = useState<string>("all");
  const [exportIncludeReturnStorage, setExportIncludeReturnStorage] =
    useState(true);
  const [exportMaterial, setExportMaterial] = useState<string>("all");
  const [exportQuality, setExportQuality] = useState<string>("standard");
  const [exportInnerMica, setExportInnerMica] = useState<string>("none");
  const [exportOuterMica, setExportOuterMica] = useState<string>("none");
  const [exportLegId, setExportLegId] = useState<string>("board");
  const [exportBoardLegType, setExportBoardLegType] = useState<string>("full");

  const currentBoard = getBoards(quality).find((b) => b.id === boardId);
  const currentMarble = MARBLE_TYPES.find((m) => m.id === marbleTypeId);
  const displayMaterialName = topMaterialCategory === "marble" ? currentMarble?.name : currentBoard?.name;
  const displayThickness = topMaterialCategory === "marble" ? currentMarble?.thickness : topThickness;
  const topRate = topMaterialCategory === "marble" ? currentMarble?.costPerSqFt : getTopRate(boardId, currentBoard?.costPerSqFt ?? 0, topThickness, quality);

  const {
    boardCostTotal,
    boardDetails,
    hardwareCost,
    hardwareDetails,
    modestyCost,
    wasteCost,
    laborCost,
    packingCost,
    toolingCost,
    profit,
    totalCost,
    totalSqFt,
  } = useMemo(() => {
    return calculateLShapeCost({
      mainWidth,
      mainDepth,
      returnWidth,
      returnDepth,
      height,
      returnHeight,
      topThickness,
      boardId,
      legId,
      boardLegType,
      metalLegStyle,
      metalLegPipeSize,
      includeModesty,
      modestyType,
      metalModestyType,
      wireManagement,
      includePedestal,
      includeDrawer,
      drawerCount,
      singleDrawerType,
      cpuStandType,
      includeReturnStorage,
      returnStorageType,
      quality,
      innerMica,
      outerMica,
      topMaterialCategory,
      marbleTypeId,
    });
  }, [
    mainWidth,
    mainDepth,
    returnWidth,
    returnDepth,
    height,
    returnHeight,
    boardId,
    legId,
    boardLegType,
    metalLegStyle,
    metalLegPipeSize,
    includeModesty,
    modestyType,
    metalModestyType,
    wireManagement,
    includePedestal,
    includeDrawer,
    drawerCount,
    singleDrawerType,
    cpuStandType,
    includeReturnStorage,
    returnStorageType,
    topThickness,
    quality,
    innerMica,
    outerMica,
    topMaterialCategory,
    marbleTypeId,
  ]);

  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copyImagePrompt = () => {
    let topName = "";
    if (topMaterialCategory === "marble") {
      topName = MARBLE_TYPES.find((m) => m.id === marbleTypeId)?.name || "Marble";
    } else {
      const topBoard = getBoards(quality).find((b) => b.id === boardId)?.name || "Board";
      topName = topBoard === "PLPB" || topBoard === "MDF" || topBoard === "HDHMR" ? topBoard + " wood" : topBoard;
    }

    let legStyle = "panel legs";
    if (legId === "metal_leg") {
      legStyle = `metal loop legs`;
    }

    let storageDesc = "";
    if (includeReturnStorage) {
      if (returnStorageType === "3_shutters_1_open") {
        storageDesc = " It includes a return storage cabinet with 3 wooden shutters and 1 open shelf compartment with a horizontal shelf.";
      } else if (returnStorageType === "2_shutters_1_open") {
        storageDesc = " It includes a return storage cabinet with 2 wooden shutters and 1 open shelf compartment.";
      } else if (returnStorageType === "2_drawers_3_shutters") {
        storageDesc = " It includes a return storage cabinet with 2 drawers on the left, and 3 wooden shutters on the remaining parts with key locks.";
      } else if (returnStorageType === "2_drawers_4_shutters") {
        storageDesc = " It includes a return storage cabinet with 2 drawers on the left, and 4 wooden shutters on the remaining parts with horizontal handles.";
      } else if (returnStorageType === "3_drawers_2_shutters_open") {
        storageDesc = " It includes a return storage cabinet with 3 drawers on the left, 2 wooden shutters in the middle, and 1 open shelf compartment with a horizontal shelf.";
      } else if (returnStorageType === "3_drawers_1_open_1_shutter") {
        storageDesc = " It includes a return storage cabinet with 3 drawers on the left, 1 open shelf compartment with a horizontal shelf in the middle, and 1 wooden shutter with a vertical handle on the right.";
      } else if (returnStorageType === "2_shutters_1_drawer_2_open") {
        storageDesc = " It includes a return storage cabinet with 2 wooden shutters (with key locks) and 1 compartment with a drawer at the top (with a key lock) and 2 open shelves below.";
      } else if (returnStorageType === "2_shutters_2_open") {
        storageDesc = " It includes a return storage cabinet with 2 wooden shutters and 2 open shelf compartments.";
      } else if (returnStorageType === "all_open") {
        storageDesc = " It includes an open shelf return storage cabinet.";
      } else {
        storageDesc = " It includes a plain return side table extension.";
      }
    }
    let drawerDesc = "";
    if (includeDrawer) {
      if (singleDrawerType === "corner") {
        drawerDesc = ` It features ${drawerCount} undermount corner drawer${drawerCount > 1 ? "s" : ""} (360mm W x 320mm D x 160mm H).`;
      } else {
        drawerDesc = ` It features an undermount ${drawerCount} drawer storage unit.`;
      }
    }
    const pedestalDesc = includePedestal ? ` It has a 3-drawer side pedestal attached.` : "";
    const cpuDesc = cpuStandType !== "none" ? ` The desk includes a CPU ${cpuStandType === "trolley" ? "trolley on wheels" : "mount bracket"}.` : "";
    
    let modestyString = "a front modesty panel";
    if (legId === "board") {
      if (modestyType === "short") modestyString = "a short (600mm) front modesty panel";
      if (modestyType === "shorter") modestyString = "a very short (300mm) front modesty panel";
    }
    const modestyDesc = includeModesty ? ` It includes ${modestyString}.` : " It has an open back design with no modesty panel.";
    
    const returnTableDesc = includeReturnStorage ? `, and the return table is ${returnWidth}mm x ${returnDepth}mm` : "";
    const shapeDesc = includeReturnStorage ? "L-shape " : "";

    const prompt = `A highly realistic, professional product photography studio shot of a modern ${shapeDesc}office desk layout. The main table dimensions are ${mainWidth}mm x ${mainDepth}mm x ${height}mm${returnTableDesc}. The table top is made of ${topName}. The desk base uses ${legStyle}.${modestyDesc}${storageDesc}${drawerDesc}${pedestalDesc}${cpuDesc} Clean, ultra-minimalist solid white background. Studio lighting, highly detailed, 8k resolution, photorealistic furniture photography.`;
    
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const boards = getBoards(quality);
    const board = boards.find((b) => b.id === boardId)!;
    const legType = LEGS.find((l) => l.id === legId)!;

    doc.setFontSize(20);
    doc.text("All Table Cost Estimation Report", 14, 22);

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);

    const specBody = [
      [
        "Main Table Dimensions (W x D x H)",
        `${mainWidth} mm x ${mainDepth} mm x ${height} mm`,
      ],
    ];
    if (includeReturnStorage) {
      specBody.push([
        "Return Storage Dimensions (W x D x H)",
        `${returnWidth} mm x ${returnDepth} mm x ${returnHeight} mm`,
      ]);
      let styleName = "Plain Table Extension (No Cabinet)";
      if (returnStorageType === "3_shutters_1_open") styleName = "Option 1: 3 Shutters + 1 Open Shelf (Front View)";
      else if (returnStorageType === "2_shutters_1_open") styleName = "Option 2: 2 Shutters + 1 Open Shelf (Front View)";
      else if (returnStorageType === "2_drawers_3_shutters") styleName = "Option 3: 2 Drawers + 3 Shutters (Front View)";
      else if (returnStorageType === "2_drawers_4_shutters") styleName = "Option 4: 2 Drawers + 4 Shutters";
      else if (returnStorageType === "3_drawers_2_shutters_open") styleName = "Option 5: 3 Drawers + 2 Shutters + 1 Open Shelf Partition";
      else if (returnStorageType === "3_drawers_1_open_1_shutter") styleName = "Option 6: 3 Drawers + 1 Open Shelf + 1 Shutter";
      else if (returnStorageType === "2_shutters_1_drawer_2_open") styleName = "Option 7: 2 Shutters + 1 Drawer + 2 Open Shelves";
      else if (returnStorageType === "2_shutters_2_open") styleName = "Option 2 (Legacy): 2 Shutters + 2 Open Shelves";
      else if (returnStorageType === "all_open") styleName = "Option 3 (Legacy): All Open Shelves";
      specBody.push([
        "Return Storage Configuration",
        styleName
      ]);
    }
    specBody.push(
      ["Table Top Category", topMaterialCategory === "marble" ? "Marble Top" : "Wood / Board Top"]
    );

    if (topMaterialCategory === "marble") {
      specBody.push(
        ["Table Top Thickness", "14 mm"],
        ["Table Top Material", `Onyx (Rs. 1,500/sq.ft)`]
      );
    } else {
      specBody.push(
        ["Table Top Thickness", `${topThickness} mm`],
        [
          "Board Material",
          `${board.name} (Rs. ${getTopRate(board.id, board.costPerSqFt, topThickness, quality)}/sq.ft)`,
        ],
        ["Total Board Area", `${totalSqFt} sq.ft`],
        ["Inner Mica / Laminate", innerMica === "none" ? "None" : `${innerMica} mm (Rs. ${innerMica === "0.8" ? 35 : 56}/sq.ft)`],
        ["Outer Mica / Laminate", outerMica === "none" ? "None" : `${outerMica} mm (Rs. ${outerMica === "0.8" ? 35 : 56}/sq.ft)`]
      );
    }

    specBody.push(
      ["Structure Wood", board.name],
      ["Understructure", legType.name],
      ["Modesty Panel", includeModesty ? "Included" : "None"],
      ["Wire Management", wireManagement.toUpperCase()]
    );

    if (includePedestal) {
      specBody.push(["Attached Pedestal", "Yes (3-Drawers)"]);
    }
    if (includeDrawer) {
      specBody.push([
        "Undermount Drawer",
        `${drawerCount}x ${singleDrawerType === "corner" ? "Corner (Compact)" : (drawerCount === 1 ? "Full Width" : "Equal Widths")}`
      ]);
    }
    if (cpuStandType !== "none") {
      specBody.push([
        "CPU Stand",
        cpuStandType === "trolley" ? "CPU Trolley" : "CPU Mount Bracket"
      ]);
    }

    autoTable(doc, {
      startY: 40,
      head: [["Specification", "Details"]],
      body: specBody,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    const bdBody = boardDetails.map((b) => [
      b.label,
      `Rs. ${b.cost.toLocaleString()}`,
    ]);

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
      head: [["Hardware & Accessories Included", "Cost"]],
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
      ["Material Waste (15%)", `Rs. ${wasteCost.toLocaleString()}`],
      [
        "Hardware & Accessories",
        `Rs. ${Math.round(hardwareCost).toLocaleString()}`,
      ],
      ["Labor & Making", `Rs. ${laborCost.toLocaleString()}`],
      ["Packing", `Rs. ${packingCost.toLocaleString()}`],
      ["Tooling", `Rs. ${toolingCost.toLocaleString()}`],
      ["Profit (25%)", `Rs. ${profit.toLocaleString()}`],
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

    doc.save("lshape-table-cost-report.pdf");
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    const boards = getBoards(quality);
    const board = boards.find((b) => b.id === boardId)!;
    const legType = LEGS.find((l) => l.id === legId)!;

    // 1. Cover / Specs Sheet
    const specsData = [
      ["All Table Cost Estimation Report"],
      ["Date", new Date().toLocaleDateString()],
      [""],
      ["Specification", "Details"],
      [
        "Main Table Dimensions (W x D x H)",
        `${mainWidth} mm x ${mainDepth} mm x ${height} mm`,
      ],
    ];

    if (includeReturnStorage) {
      specsData.push([
        "Return Storage Dimensions (W x D x H)",
        `${returnWidth} mm x ${returnDepth} mm x ${returnHeight} mm`,
      ]);
      let styleName = "Plain Table Extension (No Cabinet)";
      if (returnStorageType === "3_shutters_1_open") styleName = "Option 1: 3 Shutters + 1 Open Shelf (Front View)";
      else if (returnStorageType === "2_shutters_1_open") styleName = "Option 2: 2 Shutters + 1 Open Shelf (Front View)";
      else if (returnStorageType === "2_drawers_3_shutters") styleName = "Option 3: 2 Drawers + 3 Shutters (With Locks)";
      else if (returnStorageType === "2_drawers_4_shutters") styleName = "Option 4: 2 Drawers + 4 Shutters";
      else if (returnStorageType === "3_drawers_2_shutters_open") styleName = "Option 5: 3 Drawers + 2 Shutters + 1 Open Shelf Partition";
      else if (returnStorageType === "3_drawers_1_open_1_shutter") styleName = "Option 6: 3 Drawers + 1 Open Shelf + 1 Shutter";
      else if (returnStorageType === "2_shutters_1_drawer_2_open") styleName = "Option 7: 2 Shutters + 1 Drawer + 2 Open Shelves";
      else if (returnStorageType === "2_shutters_2_open") styleName = "Option 2 (Legacy): 2 Shutters + 2 Open Shelves";
      else if (returnStorageType === "all_open") styleName = "Option 3 (Legacy): All Open Shelves";
      specsData.push([
        "Return Storage Configuration",
        styleName
      ]);
    }

    specsData.push(
      ["Table Top Thickness", `${topThickness} mm`],
      [
        "Board Material",
        `${board.name} (Rs. ${getTopRate(board.id, board.costPerSqFt, topThickness, quality)}/sq.ft)`,
      ],
      ["Total Board Area", `${totalSqFt} sq.ft`],
      ["Inner Mica / Laminate", innerMica === "none" ? "None" : `${innerMica} mm (Rs. ${innerMica === "0.8" ? 35 : 56}/sq.ft)`],
      ["Outer Mica / Laminate", outerMica === "none" ? "None" : `${outerMica} mm (Rs. ${outerMica === "0.8" ? 35 : 56}/sq.ft)`],
      ["Understructure", legType.name],
      ["Modesty Panel", includeModesty ? "Included" : "None"],
      ["Wire Management", wireManagement.toUpperCase()],
    );
    if (includePedestal) {
      specsData.push(["Attached Pedestal", "Yes (3-Drawers)"]);
    }
    if (includeDrawer) {
      specsData.push([
        "Undermount Drawer",
        `${drawerCount}x ${singleDrawerType === "corner" ? "Corner (Compact)" : (drawerCount === 1 ? "Full Width" : "Equal Widths")}`
      ]);
    }
    if (cpuStandType !== "none") {
      specsData.push([
        "CPU Stand",
        cpuStandType === "trolley" ? "CPU Trolley" : "CPU Mount Bracket"
      ]);
    }

    const wsSpecs = XLSX.utils.aoa_to_sheet(specsData);
    XLSX.utils.book_append_sheet(wb, wsSpecs, "Specifications");

    // 2. Details Sheet
    const detailsData: any[][] = [];
    detailsData.push(["Detailed Board Cost", "Amount", "Calculation Concept"]);
    boardDetails.forEach((b) => {
      detailsData.push([
        b.label,
        Math.round(b.cost),
        "Board Surface Area (sq.ft) × Board Material Rate",
      ]);
    });

    detailsData.push([""]);
    detailsData.push([
      "Hardware & Accessories Included",
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
      "Sum of all individual board pieces (main table + return + understructure)",
    ]);
    detailsData.push([
      "Material Waste (15%)",
      wasteCost,
      "15% of Total Board Cost (Board Cost × 0.15) for standard cutting wastage",
    ]);
    detailsData.push([
      "Hardware & Accessories",
      Math.round(hardwareCost),
      "Sum of all selected hardware items",
    ]);
    detailsData.push([
      "Labor & Making",
      laborCost,
      "Standard fixed labor charges for L-shape tables",
    ]);
    detailsData.push([
      "Packing",
      packingCost,
      "Standard fixed packing charges",
    ]);
    detailsData.push([
      "Tooling",
      toolingCost,
      "5% of Direct Costs (Board + Waste + Hardware + Labor + Packing) for machinery overhead",
    ]);
    detailsData.push([
      "Profit (25%)",
      profit,
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
        "(Width (mm) × Depth (mm)) / 90000",
        "1 sq.ft = 90000 sq.mm. Panel dimensions are multiplied to get sq.mm, then divided by 90000.",
      ],
      [
        "Board Cost",
        "Area (sq.ft) × Material Rate",
        "Calculated by multiplying the surface area in sq.ft by the selected board's per sq.ft rate.",
      ],
      [
        "Material Waste",
        "Total Board Cost × 15%",
        "Standard 15% waste margin added to account for cutting and offcuts.",
      ],
      [
        "Hardware Cost",
        "Qty × Unit Price",
        "Quantity of hardware items multiplied by respective unit prices.",
      ],
      [
        "Labor & Making",
        "Fixed Amount",
        "Standardized fixed labor charges for assembly.",
      ],
      [
        "Packing",
        "Fixed Amount",
        "Standard fixed charges for packing the item.",
      ],
      [
        "Tooling",
        "(Direct Costs) × 5%",
        "Machinery overhead estimated at 5% of direct costs (Board + Waste + Hardware + Labor + Packing).",
      ],
      [
        "Profit",
        "Subtotal × 25%",
        "25% profit margin applied to the subtotal before final pricing.",
      ],
      [
        "Total Estimated Cost",
        "Subtotal + Profit",
        "The final calculated estimated cost for the product.",
      ],
    ];
    const wsFormulas = XLSX.utils.aoa_to_sheet(formulasData);
    XLSX.utils.book_append_sheet(wb, wsFormulas, "Calculation Formulas");

    XLSX.writeFile(wb, "lshape-table-cost-report.xlsx");
  };

  const downloadMasterPriceList = () => {
    const wb = XLSX.utils.book_new();

    const masterData: any[][] = [];
    masterData.push(["L-Shape Table Master Price List Report"]);
    masterData.push(["Generated On", new Date().toLocaleDateString()]);
    masterData.push(["Board Option", exportQuality.toUpperCase()]);
    masterData.push(["Inner Mica / Laminate", exportInnerMica === "none" ? "None" : `${exportInnerMica} mm`]);
    masterData.push(["Outer Mica / Laminate", exportOuterMica === "none" ? "None" : `${exportOuterMica} mm`]);
    masterData.push([]); // blank row
    masterData.push([
      "Board Material",
      "Main Desk (WxDxH mm)",
      "Return Desk (WxDxH mm)",
      "Top Thickness",
      "Understructure",
      "Total Board Area (sq.ft)",
      "Cost Price (Rs)",
    ]);

    const widths = [750, 900, 1500, 1800, 2100, 2400];
    const depths = [450, 600, 750, 900, 1100];
    const boards = getBoards(exportQuality);
    const boardsToExport =
      exportMaterial === "all"
        ? boards
        : boards.filter((b) => b.id === exportMaterial);
    const exportLegName =
      LEGS.find((l) => l.id === exportLegId)?.name || "Board Leg";
    const exportLeg =
      exportLegId === "board"
        ? `${exportLegName} (${exportBoardLegType === "shorter" ? "Shorter" : "Full Depth"})`
        : exportLegName;

    // Build the master data
    for (const board of boardsToExport) {
      const allowedThicknesses = getAvailableThicknesses(
        board.id,
        exportQuality,
      );
      const boardThicknesses =
        exportThickness === "all"
          ? allowedThicknesses
          : allowedThicknesses.includes(Number(exportThickness))
            ? [Number(exportThickness)]
            : [];

      for (const mw of widths) {
        for (const md of depths) {
          if (!exportIncludeReturnStorage) {
            for (const t of boardThicknesses) {
              const res = calculateLShapeCost({
                mainWidth: mw,
                mainDepth: md,
                returnWidth: 900,
                returnDepth: 600,
                height: 750,
                returnHeight: 750,
                topThickness: t,
                boardId: board.id,
                legId: exportLegId,
                boardLegType: exportBoardLegType,
                metalLegStyle: "straight",
                metalLegPipeSize: "40x40",
                includeModesty: exportIncludeModesty,
                modestyType: exportModestyType,
                metalModestyType: "plain",
                wireManagement: exportWireManagement,
                includePedestal: exportIncludePedestal,
                includeDrawer,
                drawerCount,
                singleDrawerType,
                cpuStandType,
                includeReturnStorage: false,
                returnStorageType: "table_only",
                quality: exportQuality,
                innerMica: exportInnerMica,
                outerMica: exportOuterMica,
              });

              masterData.push([
                board.name,
                `${mw}x${md}x${750}`,
                `None`,
                `${t}mm`,
                exportLeg,
                res.totalSqFt,
                res.totalCost,
              ]);
            }
            continue;
          }

          for (const rw of widths) {
            for (const rd of depths) {
              for (const t of boardThicknesses) {
                const res = calculateLShapeCost({
                  mainWidth: mw,
                  mainDepth: md,
                  returnWidth: rw,
                  returnDepth: rd,
                  height: 750,
                  returnHeight: 750,
                  topThickness: t,
                  boardId: board.id,
                  legId: exportLegId,
                  boardLegType: exportBoardLegType,
                  metalLegStyle: "straight",
                  metalLegPipeSize: "40x40",
                  includeModesty: exportIncludeModesty,
                  modestyType: exportModestyType,
                  metalModestyType: "plain",
                  wireManagement: exportWireManagement,
                  includePedestal: exportIncludePedestal,
                  includeDrawer,
                  drawerCount,
                  singleDrawerType,
                  cpuStandType,
                  includeReturnStorage: true,
                  returnStorageType: returnStorageType,
                  quality: exportQuality,
                  innerMica: exportInnerMica,
                  outerMica: exportOuterMica,
                });

                masterData.push([
                  board.name,
                  `${mw}x${md}x${750}`,
                  `${rw}x${rd}x${750}`,
                  `${t}mm`,
                  exportLeg,
                  res.totalSqFt,
                  res.totalCost,
                ]);
              }
            }
          }
        }
      }
    }

    const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
    const colWidths = [
      { wch: 15 },
      { wch: 22 },
      { wch: 22 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
    ];
    wsMaster["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsMaster, "Master Price List");
    XLSX.writeFile(wb, "l-shape-table-master-price-list.xlsx");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            All Table Calculator
          </h1>
          <p className="text-gray-500 flex items-center gap-2 mt-1">
            Calculate manufacturing costs for executive L-shaped tables.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
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
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">
                  Main Table
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width
                    </label>
                    {isCustomSize ? (
                      <input
                        type="number"
                        value={mainWidth}
                        onChange={(e) => setMainWidth(Number(e.target.value))}
                        min={0}
                        className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      />
                    ) : (
                      <select
                        value={mainWidth}
                        onChange={(e) => setMainWidth(Number(e.target.value))}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      >
                        <option value={750}>750 mm</option>
                        <option value={900}>900 mm</option>
                        <option value={1800}>1800 mm</option>
                        <option value={2100}>2100 mm</option>
                        <option value={2400}>2400 mm</option>
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
                        value={mainDepth}
                        onChange={(e) => setMainDepth(Number(e.target.value))}
                        min={0}
                        className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      />
                    ) : (
                      <select
                        value={mainDepth}
                        onChange={(e) => setMainDepth(Number(e.target.value))}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      >
                        <option value={600}>600 mm</option>
                        <option value={750}>750 mm</option>
                        <option value={900}>900 mm</option>
                        <option value={1100}>1100 mm</option>
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
                        className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      />
                    ) : (
                      <select
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      >
                        <option value={750}>750 mm</option>
                      </select>
                    )}{" "}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Top Thickness
                    </label>
                    {topMaterialCategory === "marble" ? (
                      <div className="block w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 font-semibold select-none">
                        14 mm (Onyx)
                      </div>
                    ) : (
                      <select
                        value={topThickness}
                        onChange={(e) => setTopThickness(Number(e.target.value))}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      >
                        {getAvailableThicknesses(boardId, quality).map((t) => (
                          <option key={t} value={t}>
                            {t} mm
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Return Storage
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeReturnStorage}
                      onChange={(e) =>
                        setIncludeReturnStorage(e.target.checked)
                      }
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                    />
                    <span className="text-sm text-gray-600">
                      Include Return Storage
                    </span>
                  </label>
                </div>
                {includeReturnStorage && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {!isCustomSize && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                          Quick Presets (Width x Depth x Height)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
                          {[
                            { w: 1500, d: 450, h: 600 },
                            { w: 1500, d: 600, h: 600 },
                            { w: 1800, d: 450, h: 600 },
                            { w: 1800, d: 600, h: 600 },
                            { w: 2100, d: 450, h: 600 },
                            { w: 2100, d: 600, h: 600 },
                            { w: 900, d: 600, h: 750 },
                          ].map((preset) => {
                            const isSelected =
                              returnWidth === preset.w &&
                              returnDepth === preset.d &&
                              returnHeight === preset.h;
                            return (
                              <button
                                key={`${preset.w}-${preset.d}-${preset.h}`}
                                type="button"
                                onClick={() => {
                                  setReturnWidth(preset.w);
                                  setReturnDepth(preset.d);
                                  setReturnHeight(preset.h);
                                }}
                                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center ${
                                  isSelected
                                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm font-semibold"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                                }`}
                              >
                                {preset.w} x {preset.d} x {preset.h}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width
                      </label>
                      {isCustomSize ? (
                        <input
                          type="number"
                          value={returnWidth}
                          onChange={(e) =>
                            setReturnWidth(Number(e.target.value))
                          }
                          min={0}
                          className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                      ) : (
                        <select
                          value={returnWidth}
                          onChange={(e) =>
                            setReturnWidth(Number(e.target.value))
                          }
                          className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        >
                          <option value={750}>750 mm</option>
                          <option value={900}>900 mm</option>
                          <option value={1500}>1500 mm</option>
                          <option value={1800}>1800 mm</option>
                          <option value={2100}>2100 mm</option>
                          <option value={2400}>2400 mm</option>
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
                          value={returnDepth}
                          onChange={(e) =>
                            setReturnDepth(Number(e.target.value))
                          }
                          min={0}
                          className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                      ) : (
                        <select
                          value={returnDepth}
                          onChange={(e) =>
                            setReturnDepth(Number(e.target.value))
                          }
                          className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        >
                          <option value={450}>450 mm</option>
                          <option value={600}>600 mm</option>
                          <option value={750}>750 mm</option>
                          <option value={900}>900 mm</option>
                          <option value={1100}>1100 mm</option>
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
                          value={returnHeight}
                          onChange={(e) =>
                            setReturnHeight(Number(e.target.value))
                          }
                          min={0}
                          className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                      ) : (
                        <select
                          value={returnHeight}
                          onChange={(e) =>
                            setReturnHeight(Number(e.target.value))
                          }
                          className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        >
                          <option value={600}>600 mm</option>
                          <option value={750}>750 mm</option>
                        </select>
                      )}
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 space-y-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                          Return Storage Style Configuration
                        </span>
                        
                        <div className="flex items-center gap-2.5 p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl mb-4 text-xs text-indigo-900">
                          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>
                            {returnWidth === 900 && returnDepth === 600 && returnHeight === 750 ? (
                              <>Size <strong>900 x 600 x 750 mm</strong> is compact, so only <strong>Option 2: 2 Shutters + 1 Open Shelf</strong> is available.</>
                            ) : (
                              <>For size <strong>{returnWidth} x {returnDepth} x {returnHeight} mm</strong>, all options <strong>except Option 2</strong> are available.</>
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            {
                              id: "3_shutters_1_open",
                              name: "Option 1",
                              label: "3 Shutters + 1 Open Shelf",
                              desc: "Underlying cabinet with 3 wooden shutters and 1 open shelf partition with horizontal divider."
                            },
                            {
                              id: "2_shutters_1_open",
                              name: "Option 2",
                              label: "2 Shutters + 1 Open Shelf",
                              desc: "Underlying cabinet with 2 shutters (left/right) and 1 middle open shelf partition with horizontal divider."
                            },
                            {
                              id: "2_drawers_3_shutters",
                              name: "Option 3",
                              label: "2 Drawers + 3 Shutters",
                              desc: "Underlying cabinet with 2 drawers on left, 3 wooden shutters, handles, and lock systems."
                            },
                            {
                              id: "2_drawers_4_shutters",
                              name: "Option 4",
                              label: "2 Drawers + 4 Shutters",
                              desc: "Underlying cabinet with 2 drawers on left, 4 wooden shutters with horizontal handles."
                            },
                            {
                              id: "3_drawers_2_shutters_open",
                              name: "Option 5",
                              label: "3 Drawers + 2 Shutters + 1 Open Shelf",
                              desc: "Cabinet with 3 drawers on left, 2 wooden shutters with vertical handles in middle, and 1 open shelf partition on right."
                            },
                            {
                              id: "3_drawers_1_open_1_shutter",
                              name: "Option 6",
                              label: "3 Drawers + 1 Open Shelf + 1 Shutter",
                              desc: "Cabinet with 3 drawers on left, 1 open shelf with divider in middle, and 1 wooden shutter with vertical handle on right."
                            },
                            {
                              id: "2_shutters_1_drawer_2_open",
                              name: "Option 7",
                              label: "2 Shutters + 1 Drawer + 2 Open Shelves",
                              desc: "Cabinet with 2 shutters on left (each with a lock) and 1 drawer at top (with lock) + 2 open shelves below on right."
                            }
                          ].filter((opt) => {
                            const isSize900_600_750 = returnWidth === 900 && returnDepth === 600 && returnHeight === 750;
                            if (isSize900_600_750) {
                              return opt.id === "2_shutters_1_open";
                            } else {
                              return opt.id !== "2_shutters_1_open";
                            }
                          }).map((opt) => {
                            const isSelected = returnStorageType === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setReturnStorageType(opt.id)}
                                className={`p-4 rounded-xl border text-left transition-all outline-none ${
                                  isSelected
                                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20"
                                    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                                  {opt.name}
                                </span>
                                <span className="text-xs font-bold text-slate-900 block mb-1 leading-tight">
                                  {opt.label}
                                </span>
                                <span className="text-[11px] text-slate-500 block leading-relaxed">
                                  {opt.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Interactive 2D Blueprint Drawing Preview */}
                      <ReturnStorage2DDrawing style={returnStorageType} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
              <LayoutGrid className="w-5 h-5 text-gray-400" />
              Configuration
            </h2>
             <div className="space-y-6">
              <div className="p-4 bg-indigo-50 border border-indigo-100/50 rounded-xl">
                <label className="block text-sm font-semibold text-indigo-900 mb-2">
                  Table Top Category
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-indigo-950 font-medium cursor-pointer select-none">
                    <input
                      type="radio"
                      name="topMaterialCategory"
                      value="wood"
                      checked={topMaterialCategory === "wood"}
                      onChange={() => setTopMaterialCategory("wood")}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    Wood / Laminate Board
                  </label>
                  <label className="flex items-center gap-2 text-sm text-indigo-950 font-medium cursor-pointer select-none">
                    <input
                      type="radio"
                      name="topMaterialCategory"
                      value="marble"
                      checked={topMaterialCategory === "marble"}
                      onChange={() => setTopMaterialCategory("marble")}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    Marble Top (Onyx)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topMaterialCategory === "marble" && (
                  <div className="sm:col-span-2 p-3 bg-amber-50/55 border border-amber-100 rounded-lg">
                    <label className="block text-sm font-medium text-amber-900 mb-1">
                      Marble Top Material
                    </label>
                    <select
                      value={marbleTypeId}
                      onChange={(e) => setMarbleTypeId(e.target.value)}
                      className="block w-full px-4 py-2 bg-white border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 transition-all outline-none font-semibold text-amber-950"
                    >
                      {MARBLE_TYPES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} @ ₹{m.costPerSqFt.toLocaleString()}/sq.ft
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {topMaterialCategory === "marble" ? "Structure Wood Quality" : "Board Quality"}
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  >
                    <option value="affordable">Affordable</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {topMaterialCategory === "marble" ? "Structure Wood Material" : "Board Material"}
                  </label>
                  <select
                    value={boardId}
                    onChange={(e) => setBoardId(e.target.value)}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  >
                    {getBoards(quality).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (₹
                        {getTopRate(b.id, b.costPerSqFt, topThickness, quality)}
                        /sq.ft)
                      </option>
                    ))}
                  </select>
                </div>
                {topMaterialCategory !== "marble" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inner Mica / Laminate
                      </label>
                      <select
                        value={innerMica}
                        onChange={(e) => setInnerMica(e.target.value)}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-950 font-medium"
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
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-950 font-medium"
                      >
                        <option value="none">None (₹0/sq.ft)</option>
                        <option value="0.8">0.8 mm (₹35/sq.ft)</option>
                        <option value="1.0">1.0 mm (₹56/sq.ft)</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Understructure (Legs)
                  </label>
                  <select
                    value={legId}
                    onChange={(e) => setLegId(e.target.value)}
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  >
                    {LEGS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                {legId === "board" && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Board Leg Type
                    </label>
                    <select
                      value={boardLegType}
                      onChange={(e) => setBoardLegType(e.target.value)}
                      className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    >
                      <option value="full">Full Legs</option>
                      <option value="shorter">Shorter Legs</option>
                    </select>
                  </div>
                )}
                {legId === "metal_leg" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metal Pipe Size
                      </label>
                      <select
                        value={metalLegPipeSize}
                        onChange={(e) => setMetalLegPipeSize(e.target.value)}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      >
                        <option value="40x40">40x40 mm</option>
                        <option value="50x50">50x50 mm</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Style of Leg
                      </label>
                      <select
                        value={metalLegStyle}
                        onChange={(e) => setMetalLegStyle(e.target.value)}
                        className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      >
                        <option value="straight">Straight Leg</option>
                        <option value="u_shape">U-Shape Leg</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wire Management
                </label>
                <select
                  value={wireManagement}
                  onChange={(e) => setWireManagement(e.target.value)}
                  className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="none">None</option>
                  <option value="grommet">PVC Grommets</option>
                  <option value="raceway">Aluminum Flap Box</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Add-ons
                </label>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeModesty}
                        onChange={(e) => setIncludeModesty(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">
                          Modesty Panel
                        </span>
                        <span className="text-xs text-gray-500">
                          Board covers for main and return
                        </span>
                      </div>
                    </label>

                    {includeModesty && legId === "board" && (
                      <div className="ml-8 mt-1">
                        <select
                          value={modestyType}
                          onChange={(e) => setModestyType(e.target.value)}
                          className="block w-full max-w-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="standard">Standard (715 mm)</option>
                          <option value="short">Short (600 mm)</option>
                          <option value="shorter">Shorter (300 mm)</option>
                        </select>
                      </div>
                    )}
                    {includeModesty && legId !== "board" && (
                      <div className="ml-8 mt-1">
                        <select
                          value={metalModestyType}
                          onChange={(e) => setMetalModestyType(e.target.value)}
                          className="block w-full max-w-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="plain">Plain Metal Sheet</option>
                          <option value="cnc">CNC Design Panel</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Undermount Drawer Option */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDrawer}
                        onChange={(e) => setIncludeDrawer(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">
                          Include Pedestal Drawer Unit
                        </span>
                        <span className="text-xs text-gray-500">
                          Adds undermount/attached drawers.
                        </span>
                      </div>
                    </label>

                    {includeDrawer && (
                      <div className="ml-8 mt-1 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Number of Drawers
                          </label>
                          <select
                            value={drawerCount}
                            onChange={(e) => setDrawerCount(Number(e.target.value))}
                            className="block w-full max-w-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value={1}>1 Drawer</option>
                            <option value={2}>2 Drawers</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Drawer Type
                          </label>
                          <select
                            value={singleDrawerType}
                            onChange={(e) => setSingleDrawerType(e.target.value)}
                            className="block w-full max-w-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="corner">Corner (Compact)</option>
                            <option value="full">{drawerCount === 1 ? "Full Width (Table width - 36mm)" : "Equal Widths (Table width - 36mm)"}</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePedestal}
                      onChange={(e) => setIncludePedestal(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 block">
                        Include Pedestal Drawer Unit
                      </span>
                      <span className="text-xs text-gray-500">
                        Adds an estimated ₹4,200 pedestal cost
                      </span>
                    </div>
                  </label>

                  {/* CPU Stand Option */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                      CPU Stand
                    </label>
                    <select
                      value={cpuStandType}
                      onChange={(e) => setCpuStandType(e.target.value)}
                      className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                    >
                      <option value="none">None</option>
                      <option value="trolley">CPU Trolley</option>
                      <option value="mount">CPU Mount Bracket</option>
                    </select>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4">
          <div className="sticky top-24 bg-gray-900 rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500 rounded-full opacity-10 blur-3xl mix-blend-screen pointer-events-none"></div>

            <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2 mb-2">
              <FileBox className="w-5 h-5 text-indigo-400" />
              Estimation
            </h2>
            <div className="text-xs text-gray-400 mb-6 pb-4 border-b border-gray-800">
              {displayMaterialName} • {displayThickness}mm (₹{topRate}/sq.ft)
            </div>

            <div className="space-y-4 mb-6 relative z-10">
              <div className="flex flex-col mb-1 border-gray-800/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Total Board Cost</span>
                  <span className="font-medium">
                    ₹{boardCostTotal.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 border-l border-gray-700 ml-1 pl-2">
                  {boardDetails.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs text-gray-500"
                    >
                      <span>{item.label}</span>
                      <span>₹{item.cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Material Waste (15%)</span>
                <span className="font-medium">
                  ₹{wasteCost.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col mb-1 pt-2 border-t border-gray-800/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Hardware & Fittings</span>
                  <span className="font-medium text-gray-100">
                    ₹{Math.round(hardwareCost).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 border-l border-gray-700 ml-1 pl-2">
                  {hardwareDetails.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start text-xs text-gray-500"
                    >
                      <span className="pr-2 leading-relaxed">
                        {item.label}{" "}
                        <span className="text-gray-600">(x{item.qty})</span>
                      </span>
                      <span className="whitespace-nowrap mt-[1px]">
                        ₹{Math.round(item.cost).toLocaleString()}
                      </span>
                    </div>
                  ))}
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
                Approximation based on {totalSqFt} sq.ft board volume.
              </p>

              <div className="flex flex-col gap-3">
                {projectId ? (
                  <button
                    onClick={() => {
                      const itemName = `L-Shape ${mainWidth}x${mainDepth} (${boardId})`;
                      const itemData = {
                        productType: 'l-shape-table' as const,
                        name: itemName,
                        config: {
                          isCustomSize, mainWidth, mainDepth, returnWidth, returnDepth,
                          height, returnHeight, topThickness, quality, topMaterialCategory,
                          marbleTypeId, boardId, innerMica, outerMica, legId, boardLegType,
                          metalLegStyle, metalLegPipeSize, includeModesty, modestyType,
                          metalModestyType, wireManagement, includePedestal, includeDrawer,
                          drawerCount, singleDrawerType, cpuStandType, includeReturnStorage,
                          returnStorageType
                        },
                        costSummary: {
                          totalCost,
                          totalSqFt,
                          boardDetails,
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
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors mb-3"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download Excel Report
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
              <div className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-gray-50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportIncludeModesty}
                    onChange={(e) => setExportIncludeModesty(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">
                    Include Modesty Panel
                  </span>
                </label>
                {exportIncludeModesty && (
                  <select
                    value={exportModestyType}
                    onChange={(e) => setExportModestyType(e.target.value)}
                    className="block w-full ml-7 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none w-auto self-start"
                  >
                    <option value="standard">Standard (715 mm)</option>
                    <option value="short">Short (600 mm)</option>
                    <option value="shorter">Shorter (300 mm)</option>
                  </select>
                )}
              </div>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={exportIncludePedestal}
                  onChange={(e) => setExportIncludePedestal(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  Include Pedestal Unit
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={exportIncludeReturnStorage}
                  onChange={(e) =>
                    setExportIncludeReturnStorage(e.target.checked)
                  }
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  Include Return Storage
                </span>
              </label>

              <div className="space-y-2 p-3 border rounded-lg">
                <label className="text-sm font-medium text-gray-900">
                  Wire Management
                </label>
                <select
                  value={exportWireManagement}
                  onChange={(e) => setExportWireManagement(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none"
                >
                  <option value="none">None</option>
                  <option value="grommet">PVC Grommets</option>
                  <option value="raceway">Alu Flap Raceway</option>
                </select>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <label className="text-sm font-medium text-gray-900">
                  Top Thickness
                </label>
                <select
                  value={exportThickness}
                  onChange={(e) => setExportThickness(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none"
                >
                  <option value="all">All Available</option>
                  {Array.from(
                    new Set(
                      exportMaterial === "all"
                        ? getBoards(exportQuality).flatMap((b) =>
                            getAvailableThicknesses(b.id, exportQuality),
                          )
                        : getAvailableThicknesses(
                            exportMaterial,
                            exportQuality,
                          ),
                    ),
                  )
                    .sort((a, b) => a - b)
                    .map((t) => (
                      <option key={t} value={t}>
                        {t} mm
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <label className="text-sm font-medium text-gray-900">
                  Understructure (Legs)
                </label>
                <select
                  value={exportLegId}
                  onChange={(e) => setExportLegId(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none"
                >
                  {LEGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>

                {exportLegId === "board" && (
                  <div className="pt-2 border-t mt-2">
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Board Leg Type
                    </label>
                    <select
                      value={exportBoardLegType}
                      onChange={(e) => setExportBoardLegType(e.target.value)}
                      className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none"
                    >
                      <option value="full">Full Depth</option>
                      <option value="shorter">Shorter (Minus 200mm)</option>
                    </select>
                  </div>
                )}
              </div>

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
