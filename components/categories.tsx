"use client";

import { ChevronRightIcon, FolderIcon } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Select } from "@/components/common";
import { api } from "@/lib/api-client";
import type { CategoryNode } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

export interface FlatCategory {
  id: number;
  name: string;
  depth: number;
  parentId: number | null;
  imageUrl?: string | null;
}

export function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): FlatCategory[] {
  return nodes.flatMap((n) => [
    {
      id: n.id,
      name: n.name,
      depth,
      parentId: n.parentId,
      imageUrl: n.imageUrl,
    },
    ...flattenCategories(n.children, depth + 1),
  ]);
}

/** Ids of the node and everything below it (to stop moving a category under its own descendant). */
export function subtreeIds(nodes: CategoryNode[], id: number): Set<number> {
  const find = (list: CategoryNode[]): CategoryNode | undefined => {
    for (const n of list) {
      if (n.id === id) return n;
      const hit = find(n.children);
      if (hit) return hit;
    }
  };
  const result = new Set<number>();
  const walk = (n: CategoryNode) => {
    result.add(n.id);
    n.children.forEach(walk);
  };
  const root = find(nodes);
  if (root) walk(root);
  return result;
}

export function useCategoryTree() {
  return useLoad("categories", () => api.get<CategoryNode[]>("/categories"));
}

interface CategorySelectProps {
  tree: CategoryNode[];
  value: number | null;
  onChange: (id: number | null) => void;
  emptyLabel?: string;
  exclude?: Set<number>;
  invalid?: boolean;
}

export function CategorySelect({
  tree,
  value,
  onChange,
  emptyLabel = "— None —",
  exclude,
  invalid,
}: CategorySelectProps) {
  return (
    <Select
      value={value ?? ""}
      invalid={invalid}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Number(e.target.value))
      }
    >
      <option value="">{emptyLabel}</option>
      {flattenCategories(tree)
        .filter((c) => !exclude?.has(c.id))
        .map((c) => (
          <option key={c.id} value={c.id}>
            {"\u00a0\u00a0".repeat(c.depth)}
            {c.name}
          </option>
        ))}
    </Select>
  );
}

function isDescendant(node: CategoryNode, targetId: number | null): boolean {
  if (targetId === null) return false;
  for (const child of node.children) {
    if (child.id === targetId || isDescendant(child, targetId)) {
      return true;
    }
  }
  return false;
}

export function CategoryNav({
  nodes,
  selected,
  onSelect,
}: {
  nodes: CategoryNode[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  // Find which sibling contains or is the selected category
  const activeSiblingId = useMemo(() => {
    if (selected === null) return null;
    const found = nodes.find(
      (n) => n.id === selected || isDescendant(n, selected),
    );
    return found ? found.id : null;
  }, [nodes, selected]);

  const [openState, setOpenState] = useState<{
    activeSiblingId: number | null;
    openId: number | null;
  } | null>(null);
  const openId =
    openState?.activeSiblingId === activeSiblingId
      ? openState.openId
      : activeSiblingId;

  function setOpenId(nextOpenId: number | null) {
    setOpenState({ activeSiblingId, openId: nextOpenId });
  }

  function handleToggle(nodeId: number) {
    setOpenId(openId === nodeId ? null : nodeId);
  }

  return (
    <ul className="space-y-1">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = openId === node.id;
        const isSelected = selected === node.id;

        return (
          <li key={node.id} className="space-y-1">
            <div
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors",
                isSelected
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(node.id);
                  if (hasChildren && !isOpen) {
                    setOpenId(node.id);
                  }
                }}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              >
                {node.imageUrl ? (
                  <Image
                    src={node.imageUrl}
                    alt=""
                    width={20}
                    height={20}
                    unoptimized
                    loading="lazy"
                    className="size-5 shrink-0 rounded object-cover ring-1 ring-border"
                  />
                ) : (
                  <FolderIcon className="size-4 shrink-0 text-muted-foreground/60" />
                )}
                <span className="truncate">{node.name}</span>
              </button>

              {hasChildren && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(node.id);
                  }}
                  className="ml-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  aria-expanded={isOpen}
                >
                  <ChevronRightIcon
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      isOpen && "rotate-90",
                    )}
                  />
                </button>
              )}
            </div>

            {hasChildren && isOpen && (
              <div className="ml-3 border-l border-border/60 pl-2">
                <CategoryNav
                  nodes={node.children}
                  selected={selected}
                  onSelect={onSelect}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
