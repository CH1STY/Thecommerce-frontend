"use client";

import {
  CheckCircle2Icon,
  InfoIcon,
  LinkIcon,
  SparklesIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { ProductImage } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, toApiError } from "@/lib/api-client";
import { formatBytes, optimizeImageToWebP } from "@/lib/image-optimizer";
import { cn } from "@/lib/utils";

interface OptimizationStats {
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
}

export function ProductImageField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>(
    value.startsWith("http://") || value.startsWith("https://")
      ? "url"
      : "upload",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (JPEG, PNG, WebP, GIF, AVIF).");
      return;
    }

    setBusy(true);
    setUploadError(null);
    setStatus("Converting and minimizing to WebP…");

    try {
      // Step 1: Optimize & convert client-side to WebP
      const optimized = await optimizeImageToWebP(file);
      setStats({
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        width: optimized.width,
        height: optimized.height,
      });

      // Step 2: Upload WebP file to backend
      setStatus("Uploading WebP image…");
      const formData = new FormData();
      formData.append("file", optimized.file);

      const res = await api.post<{ url: string }>("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onChange(res.url);
      setStatus(null);
    } catch (err) {
      const apiErr = toApiError(err);
      setUploadError(apiErr.message || "Failed to convert or upload image.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      void handleFile(files[0]);
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      void handleFile(files[0]);
    }
  }

  function clearImage() {
    onChange("");
    setStats(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const reductionPercent = stats
    ? Math.round(
        ((stats.originalSize - stats.optimizedSize) / stats.originalSize) * 100,
      )
    : 0;

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="upload" className="gap-1.5 text-xs">
              <UploadCloudIcon className="size-3.5" />
              Upload image
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-1.5 text-xs">
              <LinkIcon className="size-3.5" />
              Image URL
            </TabsTrigger>
          </TabsList>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearImage}
              className="text-destructive hover:text-destructive"
            >
              <Trash2Icon className="size-3" data-icon="inline-start" />
              Remove image
            </Button>
          )}
        </div>

        <TabsContent value="upload" className="space-y-2 pt-1">
          {/* Dropzone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFileChange}
              disabled={busy}
            />

            {busy ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Spinner className="size-6 text-primary" />
                <p className="text-xs font-medium text-foreground">{status}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                  <UploadCloudIcon className="size-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Click to select or drag & drop image
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, WebP, AVIF or GIF up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* User guidance */}
          <div className="rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Image Upload Guidance
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-[11px]">
                  <li>
                    <strong className="text-foreground">Aspect ratio:</strong> 1:1
                    (square) looks best on product cards.
                  </li>
                  <li>
                    <strong className="text-foreground">Resolution:</strong> At
                    least 600×600 px (up to 2000×2000 px).
                  </li>
                  <li>
                    <strong className="text-foreground">Auto-minimized:</strong>{" "}
                    Images are automatically converted to high-quality, lightweight{" "}
                    <span className="font-semibold text-foreground">.webp</span> to
                    keep pages loading fast.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Optimization stats feedback */}
          {stats && !busy && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2Icon className="size-3.5 shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">
                  Converted to WebP ({stats.width}×{stats.height} px)
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-300"
                >
                  <SparklesIcon className="size-2.5" data-icon="inline-start" />
                  {formatBytes(stats.originalSize)} → {formatBytes(stats.optimizedSize)}
                  {reductionPercent > 0 && ` (${reductionPercent}% smaller)`}
                </Badge>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="url" className="space-y-2 pt-1">
          <Input
            type="url"
            placeholder="https://example.com/product.webp"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Enter a direct URL to an image hosted online (e.g. Unsplash, CDN).
          </p>
        </TabsContent>
      </Tabs>

      {(error || uploadError) && (
        <p className="text-xs text-destructive">{error || uploadError}</p>
      )}

      {/* Image Preview & URL display */}
      {value && (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5 shadow-2xs">
          <ProductImage
            src={value}
            alt="Product image preview"
            className="size-14 shrink-0 rounded-lg border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {value.startsWith("/api/uploads/") ? "Uploaded WebP file" : "Image URL"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {value}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
