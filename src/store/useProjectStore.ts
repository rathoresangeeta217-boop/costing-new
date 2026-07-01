import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectItem {
  id: string;
  productType: 'pedestal' | 'workstation' | 'l-shape-table' | 'custom-storage';
  name: string;
  quantity?: number;
  config: any; // Raw configuration state
  costSummary: any; // Calculated details including boardPiecesDetails, hardware, totalCost, etc.
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: ProjectItem[];
}

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  addItemToProject: (projectId: string, item: Omit<ProjectItem, 'id'>) => void;
  updateItemInProject: (projectId: string, itemId: string, item: Omit<ProjectItem, 'id'>) => void;
  deleteItemFromProject: (projectId: string, itemId: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,
      addProject: (name) =>
        set((state) => {
          const newProject: Project = {
            id: uuidv4(),
            name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [],
          };
          return { projects: [newProject, ...state.projects] };
        }),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
      setActiveProject: (id) => set({ activeProjectId: id }),
      addItemToProject: (projectId, item) =>
        set((state) => {
          const newItem = { ...item, id: uuidv4() };
          return {
            projects: state.projects.map((p) =>
              p.id === projectId
                ? { ...p, items: [...p.items, newItem], updatedAt: new Date().toISOString() }
                : p
            ),
          };
        }),
      updateItemInProject: (projectId, itemId, item) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  items: p.items.map((i) => (i.id === itemId ? { ...item, id: itemId } : i)),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        })),
      deleteItemFromProject: (projectId, itemId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  items: p.items.filter((i) => i.id !== itemId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        })),
    }),
    {
      name: 'srk-project-storage',
    }
  )
);
