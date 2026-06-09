"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Puzzle,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Extension = {
  id: string;
  name: string;
  description: string;
  hasUi?: boolean;
  icon?: string;
};

type Project = {
  id: string;
  name: string;
};

export default function AdminExtensionManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [allExtensions, setAllExtensions] = useState<Extension[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load projects");
      const data = (await res.json()) as Project[];
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []); // selectedProjectId read only for one-time initial set; stable callback per hygiene

  const fetchAllExtensions = useCallback(async () => {
    try {
      // This will also trigger seeding of core extensions
      const res = await fetch("/api/extensions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load extensions");
      const data = (await res.json()) as Extension[];
      setAllExtensions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load extensions",
      );
    }
  }, []);

  const fetchAssigned = useCallback(async (projId: string) => {
    if (!projId) {
      setAssignedIds(new Set());
      return;
    }
    setLoadingAssigned(true);
    try {
      const res = await fetch(`/api/extensions?projectId=${projId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load assigned");
      const data = (await res.json()) as Extension[];
      setAssignedIds(new Set(data.map((e) => e.id)));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load assigned extensions",
      );
    } finally {
      setLoadingAssigned(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchProjects(), fetchAllExtensions()]);
    setLoading(false);
  }, [fetchProjects, fetchAllExtensions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchAssigned(selectedProjectId);
    }
  }, [selectedProjectId, fetchAssigned]);

  async function toggleAssign(extId: string) {
    if (!selectedProjectId) return;
    const isAssigned = assignedIds.has(extId);
    setToggling((prev) => ({ ...prev, [extId]: true }));
    setError(null);
    try {
      if (isAssigned) {
        const res = await fetch(
          `/api/extensions?projectId=${selectedProjectId}&extensionId=${extId}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error("Unassign failed");
      } else {
        const res = await fetch("/api/extensions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            projectId: selectedProjectId,
            extensionId: extId,
          }),
        });
        if (!res.ok) throw new Error("Assign failed");
      }
      // refetch assigned for this proj
      await fetchAssigned(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setToggling((prev) => ({ ...prev, [extId]: false }));
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 flex-1 overflow-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Extension Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Assign core extensions to projects (per-project tools)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="text-red-500"
            aria-label="Dismiss"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500">
                No projects. Create one first in Gems.
              </p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm border",
                      selectedProjectId === p.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {selectedProject && (
              <div className="mt-4 text-xs text-gray-500">
                Managing extensions for:{" "}
                <span className="font-mono">{selectedProject.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extensions list + assign controls */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Available Extensions{" "}
              {loadingAssigned && (
                <Loader2 className="inline w-4 h-4 animate-spin ml-2" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allExtensions.length === 0 ? (
              <div className="text-sm text-gray-500">
                No extensions registered (seeding on first load...)
              </div>
            ) : !selectedProjectId ? (
              <div className="text-sm text-gray-500">
                Select a project to assign extensions.
              </div>
            ) : (
              <div className="space-y-3">
                {allExtensions.map((ext) => {
                  const isAssigned = assignedIds.has(ext.id);
                  const busy = toggling[ext.id];
                  return (
                    <div
                      key={ext.id}
                      className="flex items-center justify-between border dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-950"
                    >
                      <div className="flex items-start gap-3">
                        <Puzzle className="w-5 h-5 mt-0.5 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {ext.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {ext.description || ext.id}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            {ext.id} {ext.hasUi ? "(has UI)" : ""}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={isAssigned ? "destructive" : "default"}
                        size="sm"
                        disabled={busy || loadingAssigned}
                        onClick={() => toggleAssign(ext.id)}
                        className="min-w-[92px]"
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isAssigned ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" /> Unassign
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" /> Assign
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-gray-500">
              Assigned extensions for the selected project appear in the sidebar
              and are provided as tools to the LLM during chat for that project.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
