export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  path: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'pedestal',
    name: 'Pedestal Unit',
    description: 'Calculate manufacturing and material costs for rolling or fixed modular office pedestal units.',
    imageUrl: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?auto=format&fit=crop&q=80&w=800',
    path: '/calculator/pedestal',
  },
  {
    id: 'workstation',
    name: 'Workstation',
    description: 'Calculate manufacturing and material costs for linear office tables, including screens and wire management.',
    imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800',
    path: '/calculator/workstation',
  },
  {
    id: 'l_shape_table',
    name: 'All Table',
    description: 'Calculate manufacturing and material costs for All office tables with pedestals and returns.',
    imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800',
    path: '/calculator/l-shape-table',
  },
  {
    id: 'custom_storage',
    name: 'Custom Drawers & Storages',
    description: 'Calculate manufacturing and material costs for fully customizable modular storages, credenzas, and drawer units.',
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=800',
    path: '/calculator/custom-storage',
  },
];
