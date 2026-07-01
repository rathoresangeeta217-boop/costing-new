import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { Plus, FolderOpen, Trash2, ArrowRight } from 'lucide-react';

export default function Home() {
  const { projects, addProject, deleteProject } = useProjectStore();
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      addProject(newProjectName.trim());
      setNewProjectName('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Create New Project</h2>
        <form onSubmit={handleCreateProject} className="flex gap-3">
          <input
            type="text"
            placeholder="Enter project name..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newProjectName.trim()}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Project
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Recent Projects</h2>
        
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 truncate pr-4" title={project.name}>{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-sm text-gray-600 mb-6 flex-1">
                  {project.items.length} {project.items.length === 1 ? 'item' : 'items'}
                </div>
                
                <Link
                  to={`/project/${project.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-medium rounded-xl transition-colors"
                >
                  View Details
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
