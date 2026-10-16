"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExpandIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ZOOM_SCALE = 2.5;
const GAP = 16;
const STAGE_PADDING = 24;

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  inStock: boolean;
  stockQuantity: number;
}

export function ProductImageGallery({
  images,
  productName,
  inStock,
  stockQuantity,
}: ProductImageGalleryProps) {
  // Ensure we always have at least one image url
  const list = images.length > 0 ? images : ["/placeholder.png"];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeImage = list[selectedIndex] ?? list[0];

  // Amazon-style zoom: lens rectangle over the image + flyout window over the details column
  const [zoom, setZoom] = useState<{
    containerW: number;
    containerH: number;
    flyoutW: number;
    flyoutH: number;
    lensX: number;
    lensY: number;
  } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const prevImage = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? list.length - 1 : prev - 1));
  }, [list.length]);

  const nextImage = useCallback(() => {
    setSelectedIndex((prev) => (prev === list.length - 1 ? 0 : prev + 1));
  }, [list.length]);

  // Keyboard navigation for image list
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!lightboxOpen) return;
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, prevImage, nextImage]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const container = imageContainerRef.current;
    const root = rootRef.current;
    // Desktop only (lg+): the flyout needs the details column to cover.
    if (!container || !root || !window.matchMedia("(min-width: 1024px)").matches) return;
    const rect = container.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    // Flyout spans from the gallery's right edge to the end of the page container.
    const parentRect = root.parentElement?.parentElement?.getBoundingClientRect();
    const available = parentRect ? parentRect.right - rootRect.right - GAP : rect.width;
    const flyoutW = Math.max(320, Math.min(available, rect.width * 1.15));
    const flyoutH = rect.height;
    const lensW = Math.min(rect.width, flyoutW / ZOOM_SCALE);
    const lensH = Math.min(rect.height, flyoutH / ZOOM_SCALE);
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setZoom({
      containerW: rect.width,
      containerH: rect.height,
      flyoutW,
      flyoutH,
      lensX: Math.max(0, Math.min(x - lensW / 2, rect.width - lensW)),
      lensY: Math.max(0, Math.min(y - lensH / 2, rect.height - lensH)),
    });
  };

  const openLightbox = () => {
    setZoom(null);
    setLightboxZoom(1);
    setPanPos({ x: 0, y: 0 });
    setLightboxOpen(true);
  };

  // Lightbox pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (lightboxZoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPos.x, y: e.clientY - panPos.y };
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || lightboxZoom <= 1) return;
    setPanPos({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div ref={rootRef} className="relative flex flex-col-reverse gap-3 md:flex-row">
      {/* Thumbnails: vertical on desktop; hovering one switches the main image (Amazon behaviour) */}
      {list.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 md:max-h-[min(100%,36rem)] md:flex-col md:overflow-x-visible md:overflow-y-auto md:pb-0 md:pr-1">
          {list.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onMouseEnter={() => setSelectedIndex(index)}
              onFocus={() => setSelectedIndex(index)}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "aspect-square size-14 shrink-0 overflow-hidden rounded-lg border bg-background p-1 transition-all focus:outline-hidden md:size-16",
                index === selectedIndex
                  ? "border-brand ring-2 ring-brand/60"
                  : "opacity-75 hover:border-foreground/40 hover:opacity-100",
              )}
              aria-label={`Show image ${index + 1}`}
              aria-current={index === selectedIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${productName} thumbnail ${index + 1}`}
                className="size-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div
          ref={imageContainerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setZoom(null)}
          onClick={openLightbox}
          className="group relative aspect-square w-full select-none overflow-hidden rounded-2xl border bg-background shadow-xs cursor-zoom-in lg:cursor-crosshair"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={`${productName} - Image ${selectedIndex + 1}`}
            className="size-full object-contain"
            style={{ padding: STAGE_PADDING }}
            draggable={false}
          />

          {/* Availability Badges */}
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {!inStock ? (
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold shadow-xs">
                Sold out
              </Badge>
            ) : stockQuantity <= 5 ? (
              <Badge className="bg-brand text-brand-foreground px-2.5 py-1 text-xs font-semibold shadow-xs">
                Only {stockQuantity} left
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-xs text-xs font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                In Stock ({stockQuantity})
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="absolute top-3 right-3 z-10 size-8 rounded-full bg-background/80 shadow-xs backdrop-blur-md hover:bg-background"
            title="Open expanded view"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox();
            }}
          >
            <ExpandIcon className="size-4" />
          </Button>

          {/* Lens: translucent rectangle showing which area the flyout magnifies */}
          {zoom && (
            <div
              className="pointer-events-none absolute z-20 border border-foreground/30 bg-foreground/10"
              style={{
                left: zoom.lensX,
                top: zoom.lensY,
                width: Math.min(zoom.containerW, zoom.flyoutW / ZOOM_SCALE),
                height: Math.min(zoom.containerH, zoom.flyoutH / ZOOM_SCALE),
                backgroundImage:
                  "radial-gradient(currentColor 0.5px, transparent 0.5px)",
                backgroundSize: "4px 4px",
              }}
            />
          )}

          {/* Image Navigation Arrows (if multiple images) */}
          {list.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-1/2 left-3 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-md shadow-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label="Previous image"
              >
                <ChevronLeftIcon className="size-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-1/2 right-3 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-md shadow-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label="Next image"
              >
                <ChevronRightIcon className="size-5" />
              </Button>
            </>
          )}

          {list.length > 1 && (
            <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border bg-background/85 px-2.5 py-0.5 font-heading text-xs font-medium tabular-nums shadow-xs backdrop-blur-md">
              {selectedIndex + 1} / {list.length}
            </span>
          )}
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <SearchIcon className="size-3.5" />
          <span className="hidden lg:inline">Roll over image to zoom in · click to open expanded view</span>
          <span className="lg:hidden">Tap image to open expanded view</span>
        </p>
      </div>

      {/* Flyout: magnified copy of the stage, laid over the details column like Amazon */}
      {zoom && (
        <div
          className="pointer-events-none absolute top-0 z-40 hidden overflow-hidden rounded-2xl border bg-background shadow-2xl lg:block"
          style={{ left: `calc(100% + ${GAP}px)`, width: zoom.flyoutW, height: zoom.flyoutH }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt=""
            className="absolute top-0 left-0 max-w-none object-contain"
            style={{
              width: zoom.containerW * ZOOM_SCALE,
              height: zoom.containerH * ZOOM_SCALE,
              padding: STAGE_PADDING * ZOOM_SCALE,
              transform: `translate(${-zoom.lensX * ZOOM_SCALE}px, ${-zoom.lensY * ZOOM_SCALE}px)`,
            }}
            draggable={false}
          />
        </div>
      )}

      {/* Fullscreen High-Resolution Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onMouseMove={handleGlobalMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Top Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-60">
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 backdrop-blur-md">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-7 rounded-full text-white hover:bg-white/20"
                onClick={() => setLightboxZoom((z) => Math.max(1, z - 0.5))}
                disabled={lightboxZoom <= 1}
              >
                <MinusIcon className="size-3.5" />
              </Button>
              <span className="min-w-10 text-center font-heading text-xs font-semibold tabular-nums text-white">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-7 rounded-full text-white hover:bg-white/20"
                onClick={() => setLightboxZoom((z) => Math.min(4, z + 0.5))}
                disabled={lightboxZoom >= 4}
              >
                <PlusIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-7 rounded-full text-white hover:bg-white/20"
                onClick={() => {
                  setLightboxZoom(1);
                  setPanPos({ x: 0, y: 0 });
                }}
                title="Reset zoom"
              >
                <RotateCcwIcon className="size-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-9 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <XIcon className="size-5" />
            </Button>
          </div>

          {/* Navigation Arrows in Lightbox */}
          {list.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 text-white hover:bg-white/20 z-60"
                onClick={prevImage}
              >
                <ChevronLeftIcon className="size-7" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 text-white hover:bg-white/20 z-60"
                onClick={nextImage}
              >
                <ChevronRightIcon className="size-7" />
              </Button>
            </>
          )}

          {/* Lightbox Zoomable & Draggable Image Canvas */}
          <div
            className={cn(
              "relative flex size-full items-center justify-center overflow-hidden select-none",
              lightboxZoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
            )}
            onMouseDown={handleMouseDown}
            onClick={() => {
              if (lightboxZoom === 1) setLightboxZoom(2);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage}
              alt={productName}
              className="max-h-[85vh] max-w-[85vw] object-contain transition-transform duration-100 ease-out"
              style={{
                transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${lightboxZoom})`,
              }}
              draggable={false}
            />
          </div>

          {/* Bottom Thumbnails in Lightbox */}
          {list.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl bg-black/50 p-2 backdrop-blur-md z-60 max-w-[90vw] overflow-x-auto">
              {list.map((src, index) => (
                <button
                  key={`lightbox-${src}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedIndex(index);
                    setPanPos({ x: 0, y: 0 });
                  }}
                  className={cn(
                    "aspect-square size-12 shrink-0 overflow-hidden rounded-lg border p-1 transition-all",
                    index === selectedIndex
                      ? "border-primary ring-2 ring-primary"
                      : "border-white/20 opacity-60 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="size-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
