'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { FigshareProject } from '@/lib/types/figshare-api';

interface ProjectContextType {
  project: FigshareProject | null;
  setProject: (project: FigshareProject) => void;
  clearProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<FigshareProject | null>(null);

  const setProject = (p: FigshareProject) => setProjectState(p);
  const clearProject = () => setProjectState(null);

  return (
    <ProjectContext.Provider value={{ project, setProject, clearProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return ctx;
}
