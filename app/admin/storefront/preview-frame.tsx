"use client";

import {
  ExternalLinkIcon,
  LaptopIcon,
  MonitorIcon,
  RotateCwIcon,
  SmartphoneIcon,
  TabletIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PREVIEW_PARAM,
  type DesignerMessage,
  type PreviewMessage,
  type Section,
} from "@/lib/page-layout";
import type { LayoutPage } from "@/lib/types";

export type Device = "mobile" | "tablet" | "laptop" | "desktop";

export const DEVICES: Record<Device, { label: string; width: number; icon: LucideIcon }> = {
  mobile: { label: "Phone", width: 390, icon: SmartphoneIcon },
  tablet: { label: "Tablet", width: 820, icon: TabletIcon },
  laptop: { label: "Laptop", width: 1280, icon: LaptopIcon },
  desktop: { label: "Desktop", width: 1536, icon: MonitorIcon },
};

function pagePath(page: LayoutPage, searchQuery: string) {
  if (page === "home") return "/";
  const q = searchQuery.trim();
  return q ? `/search?q=${encodeURIComponent(q)}` : "/search";
}

/**
 * Renders the real storefront page in a same-origin iframe at the device's width (scaled down to fit),
 * and streams the unsaved sections into it with postMessage. Media queries therefore behave exactly as
 * on a real phone/tablet/desktop.
 */
export function PreviewFrame({
  page,
  sections,
  selectedId,
  onSelect,
}: {
  page: LayoutPage;
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [device, setDevice] = useState<Device>("laptop");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [reloads, setReloads] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ page, sections, selectedId });

  const path = pagePath(page, appliedQuery);
  const src = `${path}${path.includes("?") ? "&" : "?"}${PREVIEW_PARAM}=1`;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    latest.current = { page, sections, selectedId };
    const target = frame.current?.contentWindow;
    if (!target) return;
    const message: DesignerMessage = { source: "tc-designer", kind: "layout", page, sections, selectedId };
    target.postMessage(message, window.location.origin);
  }, [page, sections, selectedId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data as Partial<PreviewMessage> | null;
      if (data?.source !== "tc-preview") return;
      if (data.kind === "ready") {
        const { page, sections, selectedId } = latest.current;
        const message: DesignerMessage = { source: "tc-designer", kind: "layout", page, sections, selectedId };
        frame.current?.contentWindow?.postMessage(message, window.location.origin);
      } else if (data.kind === "select" && typeof data.id === "string") {
        onSelect(data.id);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onSelect]);

  const deviceWidth = DEVICES[device].width;
  const scale = size.width > 0 ? Math.min(1, size.width / deviceWidth) : 1;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={device}
          onValueChange={(v) => v && setDevice(v as Device)}
          aria-label="Preview size"
        >
          {(Object.keys(DEVICES) as Device[]).map((key) => {
            const { label, width, icon: Icon } = DEVICES[key];
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={key} aria-label={`${label} (${width}px)`}>
                    <Icon />
                    <span className="hidden 2xl:inline">{label}</span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  {label} · {width}px
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
        <span className="text-xs text-muted-foreground tabular-nums">
          {deviceWidth}px · {Math.round(scale * 100)}%
        </span>
        {page === "search" && (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedQuery(searchQuery);
            }}
          >
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Preview a search…"
              aria-label="Search to preview"
              className="h-7 w-44"
            />
            <Button type="submit" size="sm" variant="secondary">
              Preview
            </Button>
          </form>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Reload preview" onClick={() => setReloads((n) => n + 1)}>
            <RotateCwIcon />
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Open the published page in a new tab">
            <a href={path} target="_blank" rel="noopener">
              <ExternalLinkIcon />
            </a>
          </Button>
        </div>
      </div>
      <div ref={stage} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/50">
        {size.width > 0 && (
          <div
            className="absolute top-0 left-1/2 overflow-hidden bg-background shadow-sm ring-1 ring-border"
            style={{
              width: deviceWidth * scale,
              height: size.height,
              transform: "translateX(-50%)",
            }}
          >
            <iframe
              key={`${src}#${reloads}`}
              ref={frame}
              src={src}
              title={`Preview of the ${page === "home" ? "home" : "search"} page`}
              style={{
                width: deviceWidth,
                height: size.height / scale,
                transform: `scale(${scale})`,
                transformOrigin: "0 0",
              }}
              className="block border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
