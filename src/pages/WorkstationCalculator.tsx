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
      // 16.75 will be matched with close values if exact match fails, but we'll use exact match
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
  { id: "board", name: "Board/Wooden Legs", cost: 0 }, // Cost derived from board material
  { id: "metal_loop", name: "Metal Loop Legs", cost: 1500 }, // per leg
  { id: "metal_c", name: "Metal C-Legs", cost: 1800 }, // per leg
  { id: "metal_leg", name: "Metal Leg", cost: 0 },
];

const SCREENS = [
  { id: "none", name: "None", costPerSqFt: 0 },
  { id: "board", name: "Board Partition", costPerSqFt: 0 }, // Cost derived from board material
  { id: "fabric", name: "Fabric Pinboard", costPerSqFt: 150 },
  { id: "glass", name: "Toughened Glass", costPerSqFt: 200 },
];

const WIRE_MANAGER_COST = 450; // Aluminum flap box
const GROMMET_COST = 100; // PVC grommet
const BRACKET_COST = 80; // Cost per screen bracket

const LABOR_COST = 200; // Making charges
const PACKING_COST = 100;
const TOOLING_COST = 100; // Fixed tolling cost
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

export function calculateWorkstationCost({
  width,
  depth,
  height,
  topThickness,
  boardId,
  legId,
  boardLegType,
  metalLegStyle,
  metalLegPipeSize,
  screenId,
  screenHeight,
  includeModesty,
  modestyType = "standard",
  metalModestyType = "plain",
  wireManagement,
  includePedestal,
  includeDrawer = false,
  drawerCount = 1,
  singleDrawerType = "corner",
  cpuStandType = "none",
  quality = "standard",
  innerMica = "none",
  outerMica = "none",
  topMaterialCategory = "wood",
  marbleTypeId = "onyx",
}: any) {
  const boards = getBoards(quality);
  const board = boards.find((b) => b.id === boardId)!;
  const legType = LEGS.find((l) => l.id === legId)!;
  const screenType = SCREENS.find((s) => s.id === screenId)!;

  const innerRate = innerMica === "0.8" ? 35 : innerMica === "1.0" ? 56 : 0;
  const outerRate = outerMica === "0.8" ? 35 : outerMica === "1.0" ? 56 : 0;
  const totalMicaRate = innerRate + outerRate;

  // 1. Table Top Area
  const topAreaSqMm = width * depth;
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

  const topCost = (topAreaSqMm / 90000) * topRate;

  const micaLabels = [];
  if (topMaterialCategory !== "marble") {
    if (innerMica !== "none") micaLabels.push(`Inner ${innerMica}mm`);
    if (outerMica !== "none") micaLabels.push(`Outer ${outerMica}mm`);
  }
  const micaSuffix = micaLabels.length > 0 ? ` with Mica (${micaLabels.join(" + ")})` : "";

  const bDetails = [
    {
      label: `Table Top (${width}x${depth}x${displayThickness}mm) - ${displayMaterialName}${micaSuffix} (${(topAreaSqMm / 90000).toFixed(2)} sq.ft)`,
      cost: Math.round(topCost),
    },
  ];

  let bCostTotal = topCost;

  // Edge Banding for Table Top (only for Wood tops)
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

    const topPerimeterM = ((width * 2 + depth * 2) / 1000) * 1.2;
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
    // 2 wooden side legs (gable ends)
    let legDepth = depth;
    if (boardLegType === "shorter") {
      if (depth === 600) legDepth = 400;
      else if (depth === 750) legDepth = 450;
      else if (depth === 900) legDepth = 600;
      else legDepth = Math.max(400, depth - 200);
    }

    const sideLegAreaSqMm = 2 * (legDepth * height);
    const sideLegAreaSqFt = sideLegAreaSqMm / 90000;
    const legsCost = sideLegAreaSqFt * (board.costPerSqFt + totalMicaRate);
    bCostTotal += legsCost;
    bDetails.push({
      label: `Board Side Legs (x2) - ${legDepth}D${micaSuffix} (${sideLegAreaSqFt.toFixed(2)} sq.ft)`,
      cost: Math.round(legsCost),
    });

    // Edge Banding for Legs (assumes standard 18mm board for legs with 0.8mm edge banding at 13/m)
    const legCount = 2;
    const legPerimeterM = ((legCount * (legDepth * 2 + height * 2)) / 1000) * 1.2;
    const legEdgeBandingCost = legPerimeterM * 13;
    bCostTotal += legEdgeBandingCost;
    bDetails.push({
      label: `Legs Edge Banding (0.8mm, ${legPerimeterM.toFixed(3)}m)`,
      cost: Math.round(legEdgeBandingCost),
    });
  } else if (legId === "metal_leg") {
    // Pipe for vertical legs
    let verticalLengthMm = 4 * height;
    if (metalLegStyle === "u_shape") {
      verticalLengthMm += 2 * depth; // u-shape has bottom loops
    }
    const verticalFeet = verticalLengthMm / 304.8;
    const verticalRate = metalLegPipeSize === "50x50" ? 35 : 27;
    const costVerticals = verticalFeet * verticalRate;

    // 40x20 Pipe for horizontal supports
    const horizontalWidthMm = Math.max(0, width - 140);
    const horizontalDepthMm = Math.max(0, depth - 180);
    const horizontalLengthMm = 2 * horizontalWidthMm + 2 * horizontalDepthMm;
    const horizontalFeet = horizontalLengthMm / 304.8;

    const cost40x20 = horizontalFeet * 19.6; // 7kg * 56 Rs/kg / 20ft pipe = 19.6 Rs/rft

    const totalFeet = verticalFeet + horizontalFeet;
    const powderCoatingCost = totalFeet * 30;

    const numLegs = 4;
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
      label: `Metal Frame 40x20 (${horizontalWidthMm}W & ${horizontalDepthMm}D)`,
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
    // Other Metal legs
    const legCount = 2;
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
    let modestyHeight = 750;
    if (legId === "board") {
      if (modestyType === "short") modestyHeight = 600;
      else if (modestyType === "shorter") modestyHeight = 300;
      else modestyHeight = 715; // standard
    } else {
      modestyHeight = 450; // Typically metal frame modesty panels are shorter, let's assume 450mm
    }
    const modestyWidth = width - 18;
    const modestyAreaSqMm = modestyWidth * modestyHeight;
    const modestyAreaSqFt = modestyAreaSqMm / 90000;

    if (legId === "board") {
      modCost = modestyAreaSqFt * (board.costPerSqFt + totalMicaRate);
      bCostTotal += modCost;
      bDetails.push({
        label: `Modesty Panel (${modestyWidth}x${modestyHeight})${micaSuffix} (${modestyAreaSqFt.toFixed(2)} sq.ft)`,
        cost: Math.round(modCost),
      });

      // Modesty Edge Banding (1 bottom edge)
      const modestyEbLengthM = (modestyWidth / 1000) * 1.2;
      const modestyEbCost = modestyEbLengthM * 13; // Uses standard 13/m rate
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

  // 4. Partition Screen
  let sCost = 0;
  if (screenId !== "none") {
    const sAreaSqFt = (width * screenHeight) / 90000;
    if (screenId === "board") {
      sCost = sAreaSqFt * (board.costPerSqFt + totalMicaRate);
      bCostTotal += sCost;
      bDetails.push({ label: `Board Partition${micaSuffix} (${sAreaSqFt.toFixed(2)} sq.ft)`, cost: Math.round(sCost) });
    } else {
      sCost = sAreaSqFt * screenType.costPerSqFt;
    }

    // Hardware for screen
    const bracketCount = width > 1200 ? 3 : 2;
    const bracketTotal = bracketCount * BRACKET_COST;
    hCost += bracketTotal;
    hDetails.push({
      label: "Screen Brackets",
      qty: bracketCount,
      unitPrice: BRACKET_COST,
      unitLabel: "pcs",
      cost: bracketTotal,
    });
  }

  // 5. Wire Management
  if (wireManagement === "raceway") {
    hCost += WIRE_MANAGER_COST;
    hDetails.push({
      label: "Alu Flap Raceway",
      qty: 1,
      unitPrice: WIRE_MANAGER_COST,
      unitLabel: "Set",
      cost: WIRE_MANAGER_COST,
    });
  } else if (wireManagement === "grommet") {
    const grommetCount = 2;
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

  // 6. Fixed Pedestal (Standard approx material + hardware)
  // Here we just add a flat estimated rate for a pedestal if selected.
  if (includePedestal) {
    const pedEstimatedCost = 3500;
    hCost += pedEstimatedCost;
    hDetails.push({
      label: "3-Drawer Pedestal (Fixed)",
      qty: 1,
      unitPrice: pedEstimatedCost,
      unitLabel: "unit",
      cost: pedEstimatedCost,
    });
  }

  // 7. Undermount Drawers (Optional)
  if (includeDrawer) {
    let drawerWidth = 0;
    let drawerHeight = 150;
    let drawerDepth = Math.max(300, depth - 200);

    if (singleDrawerType === "corner") {
      drawerWidth = 360;
      drawerHeight = 160;
      drawerDepth = 320;
    } else {
      drawerHeight = 160;
      drawerDepth = depth;
      if (drawerCount === 1) {
        drawerWidth = width - 36;
      } else {
        drawerWidth = (width - 36) / 2;
      }
    }

    // Front/Back + Sides + Bottom approx
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

  // 8. CPU Stand (Optional)
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

  let boardAreaSqMm =
    (topMaterialCategory === "marble" ? 0 : topAreaSqMm) +
    (legId === "board"
      ? 2 *
        (boardLegType === "shorter"
          ? depth === 600
            ? 400
            : depth === 750
              ? 450
              : depth === 900
                ? 600
                : Math.max(400, depth - 200)
          : depth) *
        height
      : 0) +
    (includeModesty
      ? (width - 18) *
        (legId === "board"
          ? modestyType === "short"
            ? 600
            : modestyType === "shorter"
              ? 300
              : 715
          : 750)
      : 0) +
    (screenId === "board" ? width * screenHeight : 0);

  if (includeDrawer) {
    let drawerWidth = 0;
    let drawerHeight = 150;
    let drawerDepth = Math.max(300, depth - 200);

    if (singleDrawerType === "corner") {
      drawerWidth = 360;
      drawerHeight = 160;
      drawerDepth = 320;
    } else {
      drawerHeight = 160;
      drawerDepth = depth;
      if (drawerCount === 1) {
        drawerWidth = width - 36;
      } else {
        drawerWidth = (width - 36) / 2;
      }
    }
    const drawerAreaSqMm = drawerCount * (
      (drawerWidth * drawerHeight * 2) +
      (drawerDepth * drawerHeight * 2) +
      (drawerWidth * drawerDepth)
    );
    boardAreaSqMm += drawerAreaSqMm;
  }

  const tSqFt = (boardAreaSqMm / 90000).toFixed(2);
  const waste = Math.round(bCostTotal * 0.15);

  const lCost = Math.round((bCostTotal + waste + hCost + (screenId !== "board" ? sCost : 0) + modCost) * 0.20);
  const pCost = PACKING_COST;

  // Total raw + labor
  const directCost =
    bCostTotal +
    waste +
    hCost +
    (screenId !== "board" ? sCost : 0) +
    modCost +
    lCost +
    pCost;

  const tCost = TOOLING_COST;
  const subTotal = directCost + tCost;
  const prof = Math.round(subTotal * PROFIT_PERCENTAGE);

  const total = subTotal + prof;

  return {
    boardCostTotal: Math.round(bCostTotal),
    boardDetails: bDetails,
    hardwareCost: hCost,
    hardwareDetails: hDetails,
    screenCostResult: Math.round(sCost),
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

export default function WorkstationCalculator() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const editItemId = searchParams.get("edit");
  const navigate = useNavigate();
  const { projects, addItemToProject, updateItemInProject } = useProjectStore();

  const [isCustomSize, setIsCustomSize] = useState<boolean>(false);
  const [width, setWidth] = useState<number>(900); // mm
  const [depth, setDepth] = useState<number>(600); // mm
  const [height, setHeight] = useState<number>(750); // mm
  const [topThickness, setTopThickness] = useState<number>(18); // mm
  const [quality, setQuality] = useState<string>("standard");

  const [topMaterialCategory, setTopMaterialCategory] = useState<string>("wood"); // 'wood', 'marble'
  const [marbleTypeId, setMarbleTypeId] = useState<string>("onyx");

  const [boardId, setBoardId] = useState<string>("plpb");

  useEffect(() => {
    const available = getAvailableThicknesses(boardId, quality);
    if (!available.includes(topThickness)) {
      setTopThickness(available[0]);
    }
  }, [boardId, quality, topThickness]);

  const [legId, setLegId] = useState<string>("board");
  const [boardLegType, setBoardLegType] = useState<string>("full"); // 'full', 'shorter'
  const [metalLegStyle, setMetalLegStyle] = useState<string>("straight"); // 'straight', 'u_shape'
  const [metalLegPipeSize, setMetalLegPipeSize] = useState<string>("40x40"); // '40x40', '50x50'
  const [screenId, setScreenId] = useState<string>("none");

  const [screenHeight, setScreenHeight] = useState<number>(300); // above desk height mm
  const [includeModesty, setIncludeModesty] = useState<boolean>(true);
  const [modestyType, setModestyType] = useState<string>("standard"); // 'standard', 'short', 'shorter'
  const [metalModestyType, setMetalModestyType] = useState<string>("plain"); // 'plain', 'cnc'
  const [wireManagement, setWireManagement] = useState<string>("raceway"); // 'grommet', 'raceway', 'none'
  const [includePedestal, setIncludePedestal] = useState<boolean>(false);
  const [includeDrawer, setIncludeDrawer] = useState<boolean>(false);
  const [drawerCount, setDrawerCount] = useState<number>(1);
  const [singleDrawerType, setSingleDrawerType] = useState<string>("corner");
  const [cpuStandType, setCpuStandType] = useState<string>("none"); // 'none', 'trolley', 'mount'

  const [innerMica, setInnerMica] = useState<string>("none");
  const [outerMica, setOuterMica] = useState<string>("none");

  useEffect(() => {
    if (editItemId && projectId) {
      const project = projects.find(p => p.id === projectId);
      const item = project?.items.find(i => i.id === editItemId);
      if (item && item.config) {
        const c = item.config;
        if (c.isCustomSize !== undefined) setIsCustomSize(c.isCustomSize);
        if (c.width !== undefined) setWidth(c.width);
        if (c.depth !== undefined) setDepth(c.depth);
        if (c.height !== undefined) setHeight(c.height);
        if (c.topThickness !== undefined) setTopThickness(c.topThickness);
        if (c.quality !== undefined) setQuality(c.quality);
        if (c.topMaterialCategory !== undefined) setTopMaterialCategory(c.topMaterialCategory);
        if (c.marbleTypeId !== undefined) setMarbleTypeId(c.marbleTypeId);
        if (c.boardId !== undefined) setBoardId(c.boardId);
        if (c.legId !== undefined) setLegId(c.legId);
        if (c.boardLegType !== undefined) setBoardLegType(c.boardLegType);
        if (c.metalLegStyle !== undefined) setMetalLegStyle(c.metalLegStyle);
        if (c.metalLegPipeSize !== undefined) setMetalLegPipeSize(c.metalLegPipeSize);
        if (c.screenId !== undefined) setScreenId(c.screenId);
        if (c.screenHeight !== undefined) setScreenHeight(c.screenHeight);
        if (c.includeModesty !== undefined) setIncludeModesty(c.includeModesty);
        if (c.modestyType !== undefined) setModestyType(c.modestyType);
        if (c.metalModestyType !== undefined) setMetalModestyType(c.metalModestyType);
        if (c.wireManagement !== undefined) setWireManagement(c.wireManagement);
        if (c.includePedestal !== undefined) setIncludePedestal(c.includePedestal);
        if (c.includeDrawer !== undefined) setIncludeDrawer(c.includeDrawer);
        if (c.drawerCount !== undefined) setDrawerCount(c.drawerCount);
        if (c.singleDrawerType !== undefined) setSingleDrawerType(c.singleDrawerType);
        if (c.cpuStandType !== undefined) setCpuStandType(c.cpuStandType);
        if (c.innerMica !== undefined) setInnerMica(c.innerMica);
        if (c.outerMica !== undefined) setOuterMica(c.outerMica);
      }
    }
  }, [editItemId, projectId, projects]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportIncludeModesty, setExportIncludeModesty] = useState(true);
  const [exportModestyType, setExportModestyType] =
    useState<string>("standard");
  const [exportIncludePedestal, setExportIncludePedestal] = useState(false);
  const [exportWireManagement, setExportWireManagement] =
    useState<string>("none");
  const [exportThickness, setExportThickness] = useState<string>("all");
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
    screenCostResult,
    modestyCost,
    wasteCost,
    laborCost,
    packingCost,
    toolingCost,
    profit,
    totalCost,
    totalSqFt,
  } = useMemo(() => {
    return calculateWorkstationCost({
      width,
      depth,
      height,
      topThickness,
      boardId,
      legId,
      boardLegType,
      metalLegStyle,
      metalLegPipeSize,
      screenId,
      screenHeight,
      includeModesty,
      modestyType,
      metalModestyType,
      wireManagement,
      includeDrawer,
      drawerCount,
      singleDrawerType,
      includePedestal,
      quality,
      innerMica,
      outerMica,
      topMaterialCategory,
      marbleTypeId,
    });
  }, [
    width,
    height,
    depth,
    topThickness,
    boardId,
    legId,
    boardLegType,
    metalLegStyle,
    metalLegPipeSize,
    screenId,
    screenHeight,
    includeModesty,
    modestyType,
    wireManagement,
    includeDrawer,
    drawerCount,
    singleDrawerType,
    cpuStandType,
    includePedestal,
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
    
    const screenDesc = screenId !== "none" ? ` It includes a ${screenHeight}mm high ${SCREENS.find(s=>s.id === screenId)?.name.toLowerCase() ?? "partition"} screen on top.` : "";
    
    const prompt = `A highly realistic, professional product photography studio shot of a modern office workstation desk. The table dimensions are ${width}mm wide, ${depth}mm deep, and ${height}mm high. The table top is made of ${topName}. The desk base uses ${legStyle}.${modestyDesc}${screenDesc}${drawerDesc}${pedestalDesc}${cpuDesc} Clean, ultra-minimalist solid white background. Studio lighting, highly detailed, 8k resolution, photorealistic furniture photography.`;
    
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const boards = getBoards(quality);
    const board = boards.find((b) => b.id === boardId)!;
    const legType = LEGS.find((l) => l.id === legId)!;
    const screenType = SCREENS.find((s) => s.id === screenId)!;

    doc.setFontSize(20);
    doc.text("Table Cost Estimation Report", 14, 22);

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);

    const specBody = [
      ["Dimensions (W x H x D)", `${width} mm x ${height} mm x ${depth} mm`],
      ["Table Top Category", topMaterialCategory === "marble" ? "Marble Top" : "Wood / Board Top"],
    ];

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
      ["Understructure Wood", board.name],
      ["Understructure", legType.name],
      ["Modesty Panel", includeModesty ? "Included" : "None"],
      [
        "Screen Partition",
        screenId !== "none"
          ? `${screenType.name} (${screenHeight}mm H)`
          : "None",
      ],
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
    ];

    if (screenId !== "none" && screenId !== "board") {
      bodyArgs.push([
        `Screen (${screenType.name})`,
        `Rs. ${screenCostResult.toLocaleString()}`,
      ]);
    }

    bodyArgs.push([
      "Material Waste (15%)",
      `Rs. ${wasteCost.toLocaleString()}`,
    ]);
    bodyArgs.push([
      "Hardware & Accessories",
      `Rs. ${Math.round(hardwareCost).toLocaleString()}`,
    ]);
    bodyArgs.push(["Labor & Making", `Rs. ${laborCost.toLocaleString()}`]);
    bodyArgs.push(["Packing", `Rs. ${packingCost.toLocaleString()}`]);
    bodyArgs.push(["Tooling", `Rs. ${toolingCost.toLocaleString()}`]);
    bodyArgs.push(["Profit (25%)", `Rs. ${profit.toLocaleString()}`]);

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

    doc.save("table-cost-report.pdf");
  };

  const downloadMasterPriceList = () => {
    const wb = XLSX.utils.book_new();

    const masterData: any[][] = [];
    masterData.push(["Table Master Price List Report"]);
    masterData.push(["Generated On", new Date().toLocaleDateString()]);
    masterData.push(["Board Option", exportQuality.toUpperCase()]);
    masterData.push(["Inner Mica / Laminate", exportInnerMica === "none" ? "None" : `${exportInnerMica} mm`]);
    masterData.push(["Outer Mica / Laminate", exportOuterMica === "none" ? "None" : `${exportOuterMica} mm`]);
    masterData.push([]); // blank row
    masterData.push([
      "Board Material",
      "Dimensions (WxDxH mm)",
      "Top Thickness",
      "Understructure",
      "Total Board Area (sq.ft)",
      "Cost Price (Rs)",
    ]);

    const widths = [900, 1050, 1200, 1350, 1500];
    const depths = [400, 600, 750, 900, 1100];
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

      for (const w of widths) {
        for (const d of depths) {
          for (const t of boardThicknesses) {
            const res = calculateWorkstationCost({
              width: w,
              depth: d,
              height: 750,
              topThickness: t,
              boardId: board.id,
              legId: exportLegId,
              boardLegType: exportBoardLegType,
              metalLegStyle: "straight",
              metalLegPipeSize: "40x40",
              screenId: "none",
              screenHeight: 300,
              includeModesty: exportIncludeModesty,
              modestyType: exportModestyType,
              metalModestyType: "plain",
              wireManagement: exportWireManagement,
              includeDrawer,
              drawerCount,
              singleDrawerType,
              cpuStandType,
              includePedestal: exportIncludePedestal,
              quality: exportQuality,
              innerMica: exportInnerMica,
              outerMica: exportOuterMica,
            });

            masterData.push([
              board.name,
              `${w}x${d}x${750}`,
              `${t}mm`,
              exportLeg,
              res.totalSqFt,
              res.totalCost,
            ]);
          }
        }
      }
    }

    const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
    const colWidths = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
    ];
    wsMaster["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsMaster, "Master Price List");
    XLSX.writeFile(wb, "table-master-price-list.xlsx");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Table Calculator
          </h1>
          <p className="text-gray-500 flex items-center gap-2 mt-1">
            Calculate manufacturing costs for linear tables.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (L)
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
                    <option value={900}>900 mm</option>
                    <option value={1050}>1050 mm</option>
                    <option value={1200}>1200 mm</option>
                    <option value={1350}>1350 mm</option>
                    <option value={1500}>1500 mm</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depth (D)
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
                    <option value={400}>400 mm</option>
                    <option value={600}>600 mm</option>
                    <option value={750}>750 mm</option>
                    <option value={900}>900 mm</option>
                    <option value={1100}>1100 mm</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (H)
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
                    <option value={750}>750 mm</option>
                  </select>
                )}
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
                    className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
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

          {/* Configurations Section */}
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
                  Partition Screen
                </label>
                <div className="flex gap-4 items-center">
                  <select
                    value={screenId}
                    onChange={(e) => setScreenId(e.target.value)}
                    className="block w-1/2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {SCREENS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {screenId !== "none" && (
                    <select
                      value={screenHeight}
                      onChange={(e) => setScreenHeight(Number(e.target.value))}
                      className="block w-1/2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value={300}>300 mm High</option>
                      <option value={400}>400 mm High</option>
                      <option value={450}>450 mm High</option>
                    </select>
                  )}
                </div>
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
                  <option value="grommet">
                    PVC Grommets (x2 for ₹{GROMMET_COST * 2})
                  </option>
                  <option value="raceway">
                    Aluminum Flap Box (₹{WIRE_MANAGER_COST})
                  </option>
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
                          Board panel below desk
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

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePedestal}
                      onChange={(e) => setIncludePedestal(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-colors"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 block">
                        Attached Pedestal (Fixed Cost)
                      </span>
                      <span className="text-xs text-gray-500">
                        Adds an estimated ₹3,500 standard pedestal cost.
                      </span>
                    </div>
                  </label>

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

                  {/* CPU Stand Option */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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

        {/* Cost Summary Sidebar */}
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

              {screenId !== "none" && screenId !== "board" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Screen/Partition Cost</span>
                  <span className="font-medium">
                    ₹{screenCostResult.toLocaleString()}
                  </span>
                </div>
              )}

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
                      const itemName = `Workstation ${width}x${depth} (${boardId})`;
                      const itemData = {
                        productType: 'workstation' as const,
                        name: itemName,
                        config: {
                          isCustomSize, width, depth, height, topThickness, quality,
                          topMaterialCategory, marbleTypeId, boardId, legId, boardLegType,
                          metalLegStyle, metalLegPipeSize, screenId, screenHeight,
                          includeModesty, modestyType, metalModestyType, wireManagement,
                          includePedestal, includeDrawer, drawerCount, singleDrawerType,
                          cpuStandType, innerMica, outerMica
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
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors mb-3"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Report
                </button>
              </div>

              <button
                onClick={copyImagePrompt}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 py-2.5 px-4 rounded-lg font-medium border border-indigo-500/30 transition-colors mb-3"
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
                  Include Fixed Pedestal
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
