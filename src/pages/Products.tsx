import { Link, useParams } from "react-router-dom";
import { PRODUCTS } from "../types";
import { ChevronRight, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function Products() {
  const { projectId } = useParams();

  const downloadRawMaterials = () => {
    const wb = XLSX.utils.book_new();

    const pedestalRates = [
      { Category: 'Board (Standard)', Material: 'PLPB', 'Thickness': '18mm', 'Rate (Rs)': 49, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'PLPB', 'Thickness': '25mm', 'Rate (Rs)': 63, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'PLPB', 'Thickness': '36mm', 'Rate (Rs)': 98, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'MDF', 'Thickness': '18mm', 'Rate (Rs)': 61, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'MDF', 'Thickness': '25mm', 'Rate (Rs)': 83, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'MDF', 'Thickness': '36mm', 'Rate (Rs)': 122, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'HDHMR', 'Thickness': '18mm', 'Rate (Rs)': 74, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'HDHMR', 'Thickness': '25mm', 'Rate (Rs)': 108, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'PLY LAMINATE', 'Thickness': '18mm', 'Rate (Rs)': 130, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'PLY LAMINATE', 'Thickness': '25mm', 'Rate (Rs)': 181, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'PLY CENTURY', 'Thickness': '18mm', 'Rate (Rs)': 230, Unit: 'per sq.ft' },
      { Category: 'Board (Standard)', Material: 'PLY CENTURY', 'Thickness': '25mm', 'Rate (Rs)': 319, Unit: 'per sq.ft' },

      { Category: 'Board (Affordable)', Material: 'PLPB', 'Thickness': '11mm', 'Rate (Rs)': 27, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLPB', 'Thickness': '17mm', 'Rate (Rs)': 29, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLPB', 'Thickness': '18mm', 'Rate (Rs)': 34, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLPB', 'Thickness': '25mm', 'Rate (Rs)': 42, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'MDF', 'Thickness': '17mm', 'Rate (Rs)': 55, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'MDF', 'Thickness': '18mm', 'Rate (Rs)': 60, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'MDF', 'Thickness': '25mm', 'Rate (Rs)': 80, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'MDF', 'Thickness': '35mm', 'Rate (Rs)': 112, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'HDHMR', 'Thickness': '16.75mm', 'Rate (Rs)': 88, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'HDHMR', 'Thickness': '18mm', 'Rate (Rs)': 99, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'HDHMR', 'Thickness': '25mm', 'Rate (Rs)': 135, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '6mm', 'Rate (Rs)': 22, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '9mm', 'Rate (Rs)': 35, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '12mm', 'Rate (Rs)': 38, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '15mm', 'Rate (Rs)': 46, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '16mm', 'Rate (Rs)': 46, Unit: 'per sq.ft' },
      { Category: 'Board (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '18mm', 'Rate (Rs)': 55, Unit: 'per sq.ft' },

      { Category: 'Edge Banding', Material: '0.8mm Edge Banding', 'Thickness': '-', 'Rate (Rs)': 13, Unit: 'per meter' },
      { Category: 'Hardware', Material: 'Channel (Set)', 'Thickness': '-', 'Rate (Rs)': 235, Unit: 'per set' },
      { Category: 'Hardware', Material: 'Handle', 'Thickness': '-', 'Rate (Rs)': 50, Unit: 'per piece' },
      { Category: 'Hardware', Material: 'Lock (Individual)', 'Thickness': '-', 'Rate (Rs)': 120, Unit: 'per piece' },
      { Category: 'Hardware', Material: 'Central Lock', 'Thickness': '-', 'Rate (Rs)': 220, Unit: 'per piece' },
      { Category: 'Hardware', Material: 'Shutter Hinge', 'Thickness': '-', 'Rate (Rs)': 62.5, Unit: 'per piece' },
      { Category: 'Hardware', Material: 'Castor (Set of 4)', 'Thickness': '-', 'Rate (Rs)': 180, Unit: 'per set' },
      { Category: 'Hardware', Material: 'L Patti', 'Thickness': '-', 'Rate (Rs)': 10, Unit: 'per piece' },
      { Category: 'Other', Material: 'Fixed Labor', 'Thickness': '-', 'Rate (Rs)': 500, Unit: 'fixed' },
      { Category: 'Other', Material: 'Packing', 'Thickness': '-', 'Rate (Rs)': 300, Unit: 'fixed' },
      { Category: 'Other', Material: 'Tooling', 'Thickness': '-', 'Rate (Rs)': 100, Unit: 'fixed' },
    ];

    const tableRates = [
      { Category: 'Table Top (Standard)', Material: 'PLPB', 'Thickness': '18mm', 'Rate (Rs)': 49, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'PLPB', 'Thickness': '25mm', 'Rate (Rs)': 63, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'PLPB', 'Thickness': '36mm', 'Rate (Rs)': 98, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'MDF', 'Thickness': '18mm', 'Rate (Rs)': 61, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'MDF', 'Thickness': '25mm', 'Rate (Rs)': 83, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'MDF', 'Thickness': '36mm', 'Rate (Rs)': 122, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'HDHMR', 'Thickness': '18mm', 'Rate (Rs)': 74, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'HDHMR', 'Thickness': '25mm', 'Rate (Rs)': 108, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'PLY LAMINATE', 'Thickness': '18mm', 'Rate (Rs)': 130, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'PLY LAMINATE', 'Thickness': '25mm', 'Rate (Rs)': 181, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'PLY CENTURY', 'Thickness': '18mm', 'Rate (Rs)': 230, Unit: 'per sq.ft' },
      { Category: 'Table Top (Standard)', Material: 'PLY CENTURY', 'Thickness': '25mm', 'Rate (Rs)': 319, Unit: 'per sq.ft' },

      { Category: 'Table Top (Affordable)', Material: 'PLPB', 'Thickness': '11mm', 'Rate (Rs)': 27, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLPB', 'Thickness': '17mm', 'Rate (Rs)': 29, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLPB', 'Thickness': '18mm', 'Rate (Rs)': 34, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLPB', 'Thickness': '25mm', 'Rate (Rs)': 42, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'MDF', 'Thickness': '17mm', 'Rate (Rs)': 55, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'MDF', 'Thickness': '18mm', 'Rate (Rs)': 60, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'MDF', 'Thickness': '25mm', 'Rate (Rs)': 80, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'MDF', 'Thickness': '35mm', 'Rate (Rs)': 112, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'HDHMR', 'Thickness': '16.75mm', 'Rate (Rs)': 88, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'HDHMR', 'Thickness': '18mm', 'Rate (Rs)': 99, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'HDHMR', 'Thickness': '25mm', 'Rate (Rs)': 135, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '6mm', 'Rate (Rs)': 22, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '9mm', 'Rate (Rs)': 35, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '12mm', 'Rate (Rs)': 38, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '15mm', 'Rate (Rs)': 46, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '16mm', 'Rate (Rs)': 46, Unit: 'per sq.ft' },
      { Category: 'Table Top (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '18mm', 'Rate (Rs)': 55, Unit: 'per sq.ft' },

      { Category: 'Understructure Board (Standard)', Material: 'PLPB', 'Thickness': '18mm', 'Rate (Rs)': 49, Unit: 'per sq.ft' },
      { Category: 'Understructure Board (Standard)', Material: 'MDF', 'Thickness': '18mm', 'Rate (Rs)': 61, Unit: 'per sq.ft' },
      { Category: 'Understructure Board (Standard)', Material: 'HDHMR', 'Thickness': '18mm', 'Rate (Rs)': 74, Unit: 'per sq.ft' },
      { Category: 'Understructure Board (Standard)', Material: 'PLY LAMINATE', 'Thickness': '18mm', 'Rate (Rs)': 130, Unit: 'per sq.ft' },
      
      { Category: 'Understructure Board (Affordable)', Material: 'PLPB', 'Thickness': '18mm', 'Rate (Rs)': 34, Unit: 'per sq.ft' },
      { Category: 'Understructure Board (Affordable)', Material: 'MDF', 'Thickness': '18mm', 'Rate (Rs)': 38, Unit: 'per sq.ft' },
      { Category: 'Understructure Board (Affordable)', Material: 'HDHMR', 'Thickness': '18mm', 'Rate (Rs)': 99, Unit: 'per sq.ft' },
      { Category: 'Understructure Board (Affordable)', Material: 'PLY LAMINATE', 'Thickness': '18mm', 'Rate (Rs)': 55, Unit: 'per sq.ft' },

      { Category: 'Legs', Material: 'Metal Loop Legs', 'Thickness': '-', 'Rate (Rs)': 1500, Unit: 'per leg' },
      { Category: 'Legs', Material: 'Metal C-Legs', 'Thickness': '-', 'Rate (Rs)': 1800, Unit: 'per leg' },

      { Category: 'Wire Management', Material: 'Aluminum Flap Box', 'Thickness': '-', 'Rate (Rs)': 450, Unit: 'per piece' },
      { Category: 'Wire Management', Material: 'PVC Grommet', 'Thickness': '-', 'Rate (Rs)': 100, Unit: 'per piece' },

      { Category: 'Edge Banding', Material: '0.8mm Edge Banding', 'Thickness': '-', 'Rate (Rs)': 13, Unit: 'per meter' },
      { Category: 'Edge Banding', Material: '2mm Edge Banding', 'Thickness': '-', 'Rate (Rs)': 28, Unit: 'per meter' },
      { Category: 'Edge Banding', Material: '0.40mm Edge Banding', 'Thickness': '-', 'Rate (Rs)': 48, Unit: 'per meter' },

      { Category: 'Laminate / Mica', Material: '0.8mm Mica', 'Thickness': '-', 'Rate (Rs)': 35, Unit: 'per sq.ft' },
      { Category: 'Laminate / Mica', Material: '1.0mm Mica', 'Thickness': '-', 'Rate (Rs)': 56, Unit: 'per sq.ft' },

      { Category: 'Partition', Material: 'Fabric Pinboard', 'Thickness': '-', 'Rate (Rs)': 150, Unit: 'per sq.ft' },
      { Category: 'Partition', Material: 'Toughened Glass', 'Thickness': '-', 'Rate (Rs)': 200, Unit: 'per sq.ft' },
      { Category: 'Partition', Material: 'Screen Bracket', 'Thickness': '-', 'Rate (Rs)': 80, Unit: 'per piece' },

      { Category: 'Special Tops', Material: 'Onyx Marble', 'Thickness': '14mm', 'Rate (Rs)': 1500, Unit: 'per sq.ft' },

      { Category: 'Other', Material: 'Buffer', 'Thickness': '-', 'Rate (Rs)': 5, Unit: 'per piece' },
      { Category: 'Other', Material: 'L Patti', 'Thickness': '-', 'Rate (Rs)': 10, Unit: 'per piece' },
      { Category: 'Packing', Material: 'Base Packing Cost', 'Thickness': '-', 'Rate (Rs)': 400, Unit: 'fixed' },
    ];

    const wsPedestal = XLSX.utils.json_to_sheet(pedestalRates);
    const wsTables = XLSX.utils.json_to_sheet(tableRates);

    XLSX.utils.book_append_sheet(wb, wsPedestal, "Pedestal Rates");
    XLSX.utils.book_append_sheet(wb, wsTables, "Table & L-Shape Rates");

    XLSX.writeFile(wb, "SRK-Raw-Material-Costs.xlsx");
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Select a Product
          </h1>
          <p className="mt-2 text-gray-600">
            Choose a furniture product from the catalog to configure its
            specifications and estimate manufacturing costs.
          </p>
        </div>
        
        <button
          onClick={downloadRawMaterials}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-medium transition-all shadow-sm self-start sm:self-auto"
        >
          <Download className="w-5 h-5" />
          Raw Material Costs
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {PRODUCTS.map((product) => (
          <Link
            key={product.id}
            to={projectId ? `/project/${projectId}${product.path}` : product.path}
            className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-200"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h2>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-sm text-gray-500 flex-1 leading-relaxed">
                {product.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
