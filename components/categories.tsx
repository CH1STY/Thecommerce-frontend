"use client";

import { Select } from "@/components/common";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { CategoryNode } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export interface FlatCategory {
  id: number;
  name: string;
  depth: number;
  parentId: number | null;
}

export function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): FlatCategory[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, depth, parentId: n.parentId },
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

export function CategoryNav({
  nodes,
  selected,
  onSelect,
}: {
  nodes: CategoryNode[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <li key={node.id}>
          <Button
            type="button"
            size="sm"
            variant={selected === node.id ? "secondary" : "ghost"}
            aria-current={selected === node.id ? "true" : undefined}
            onClick={() => onSelect(node.id)}
            className={`w-full justify-start font-normal ${selected === node.id ? "font-medium" : "text-muted-foreground"}`}
          >
            {node.name}
          </Button>
          {node.children.length > 0 && (
            <div className="ml-3 border-l pl-2">
              <CategoryNav
                nodes={node.children}
                selected={selected}
                onSelect={onSelect}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
