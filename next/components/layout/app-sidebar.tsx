"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  LogOut,
  Puzzle,
  Gem,
  Code,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface Project {
  id: string;
  userId: string;
  name: string;
  instructions: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

const iconMap: Record<string, LucideIcon> = {
  gem: Gem,
  code: Code,
  puzzle: Puzzle,
};

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const currentProjectId = searchParams?.get("project") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [extensions, setExtensions] = useState<
    Array<{ id: string; name: string; icon: LucideIcon }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load projects");
      const data = (await res.json()) as Project[];
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExtensions = useCallback(async (projId: string) => {
    try {
      const url = projId
        ? `/api/extensions?projectId=${projId}`
        : "/api/extensions";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load extensions");
      const data: any[] = await res.json();
      // ?projectId now always returns *exactly* the DB project_extensions rows (raw, possibly []).
      // No server fallthrough. Client only falls back on network/parse error (recovery to defaults).
      const mapped = data.map((e) => ({
        id: e.id,
        name: e.name,
        icon: iconMap[e.icon] || Puzzle,
      }));
      setExtensions(mapped);
    } catch {
      // error recovery fallback (not for "0 assignments" semantics)
      setExtensions([
        { id: "web-search", name: "Web Search", icon: Puzzle },
        { id: "vision", name: "Vision", icon: Puzzle },
        { id: "document-gen", name: "Document Gen", icon: Puzzle },
        { id: "memory", name: "Memory", icon: Puzzle },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchExtensions(currentProjectId);
  }, [fetchProjects, fetchExtensions, currentProjectId]);

  return (
    <aside className="w-64 h-screen border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-950">
      {/* Logo + New Chat */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          UBEK
        </h1>
        <Button variant="ghost" size="sm" asChild aria-label="New Chat">
          <Link href="/chat">
            <Plus className="w-4 h-4" />
            New Chat
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Projects */}
        <div className="px-4 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            Projects
          </p>
        </div>
        <ul className="space-y-1 px-2">
          {loading ? (
            <li className="flex items-center justify-center py-3">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </li>
          ) : error ? (
            <li className="px-4 py-3 text-sm text-red-500 dark:text-red-400">
              Failed to load projects
            </li>
          ) : projects.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No projects yet
            </li>
          ) : (
            projects.map((proj) => {
              const Icon = iconMap[proj.icon] || Gem;
              return (
                <li key={proj.id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href={`/chat?project=${proj.id}`}>
                      <Icon className="w-4 h-4 mr-2" />
                      {proj.name}
                    </Link>
                  </Button>
                </li>
              );
            })
          )}
        </ul>

        {/* Extensions */}
        <div className="mt-6 px-4 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            Extensions
          </p>
        </div>
        <ul className="space-y-1 px-2">
          {extensions.length === 0 ? (
            <li className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400">
              No extensions assigned{currentProjectId ? " to this project" : ""}
            </li>
          ) : (
            extensions.map((ext) => {
              const Icon = ext.icon;
              return (
                <li key={ext.id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href={`/ext/${ext.id}`}>
                      <Icon className="w-4 h-4 mr-2" />
                      {ext.name}
                    </Link>
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.name}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout?.();
              }}
              aria-label="Logout"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
