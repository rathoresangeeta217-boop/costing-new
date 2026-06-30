const fs = require('fs');

const content = fs.readFileSync('src/pages/PedestalCalculator.tsx', 'utf-8');

const targetStrStart = "  } = useMemo(() => {";
const fallbackTargetIndex = content.indexOf(targetStrStart);
if (fallbackTargetIndex === -1) throw new Error("Could not find start");

// Find end of useMemo
const targetStrEnd = '    };\n  }, [';
const endIndex = content.indexOf(targetStrEnd);
if (endIndex === -1) throw new Error("Could not find end");

const endOfDeps = content.indexOf(']);', endIndex) + 3;

const calcLogic = content.substring(fallbackTargetIndex + targetStrStart.length, endIndex + 6); // include "    };"

const newComponentCode = `  } = useMemo(() => {
    return calculatePedestalCost({
      width, height, depth, typeId, boardId, wideStyle, wideInternalConfig,
      drawerLockType, includeHandles, includeShutterLocks, includeShutterHandles, includeCastors
    });
  }, [
    height,
    width,
    depth,
    typeId,
    boardId,
    includeHandles,
    drawerLockType,
    includeShutterHandles,
    includeShutterLocks,
    includeCastors,
    wideStyle,
    wideInternalConfig,
  ]);`;

const funcDef = `
export function calculatePedestalCost({
  width, height, depth, typeId, boardId, wideStyle, wideInternalConfig,
  drawerLockType, includeHandles, includeShutterLocks, includeShutterHandles, includeCastors
}: any) {
${calcLogic}
}
`;

// Insert the new function right before "export default function PedestalCalculator"
const exportDefaultIndex = content.indexOf('export default function PedestalCalculator');

let newContent = content.substring(0, exportDefaultIndex) + funcDef + content.substring(exportDefaultIndex);

// Replace the useMemo inside the component
newContent = newContent.replace(content.substring(fallbackTargetIndex, endOfDeps), newComponentCode);

fs.writeFileSync('src/pages/PedestalCalculator.tsx', newContent);
console.log("Refactored successfully");
