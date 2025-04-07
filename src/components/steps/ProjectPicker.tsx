'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useProject } from '@/lib/ProjectContext';
import { toast } from 'sonner';
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem
} from '@/components/ui/select';
import {FigshareProject} from "@/lib/types/figshare-api";

export function ProjectPicker() {
  const { user, token } = useAuth();
  const { setProject } = useProject();
  const [projects, setProjects] = useState<FigshareProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) return;
    fetch('https://api.figshare.com/v2/account/projects', {
      headers: { Authorization: `token ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
        return res.json();
      })
      .then(setProjects)
      .catch(err => toast.error(`Error fetching projects: ${err.message}`))
      .finally(() => setLoading(false));
  }, [user, token]);

  const handleSelect = (id: string) => {
    fetch(`https://api.figshare.com/v2/account/projects/${id}`, {
      headers: { Authorization: `token ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch project (${res.status})`);
        return res.json();
      })
      .then(setProject)
      .catch(err => toast.error(`Error fetching project: ${err.message}`));
  };

  if (!user) return null;
  if (loading) return <p>Loading projects...</p>;

  return (
    <div>
      <label className="block mb-2 text-left font-medium">Select a project:</label>
      <Select onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Choose project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((proj) => (
            <SelectItem key={proj.id} value={String(proj.id)}>
              {proj.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
