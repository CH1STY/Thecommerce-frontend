"use client";

import {
  ImagePlusIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import { ProductImage } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, toApiError } from "@/lib/api-client";
import { formatBytes, optimizeImageToWebP } from "@/lib/image-optimizer";
import { cn } from "@/lib/utils";

interface ProductGalleryFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
}

export function ProductGalleryField({
  images,
  onChange,
  error,
}: ProductGalleryFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Add image URL directly
  function handleAddUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/api/uploads/")) {
      setUploadError("Please enter a valid HTTP/HTTPS or /api/uploads/ URL.");
      return;
    }
    if (images.includes(trimmed)) {
      setUploadError("This image is already in the gallery.");
      return;
    }
    setUploadError(null);
    onChange([...images, trimmed]);
    setUrlInput("");
    toast.success("Image URL added to gallery");
  }

  // Optimize files to WebP and upload them
  async function handleFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) {
      setUploadError("Please select valid image files (JPEG, PNG, WebP, GIF, AVIF).");
      return;
    }

    setBusy(true);
    setUploadError(null);

    const uploadedUrls: string[] = [];
    let totalOriginal = 0;
    let totalOptimized = 0;

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setStatus(
          validFiles.length > 1
            ? `Converting & minimizing (${i + 1}/${validFiles.length}) to WebP…`
            : "Converting and minimizing to WebP…",
        );

        // Client-side compression to WebP
        const optimized = await optimizeImageToWebP(file);
        totalOriginal += optimized.originalSize;
        totalOptimized += optimized.optimizedSize;

        // Upload WebP file to backend
        setStatus(
          validFiles.length > 1
            ? `Uploading (${i + 1}/${validFiles.length})…`
            : "Uploading WebP image…",
        );

        const formData = new FormData();
        formData.append("file", optimized.file);

        const res = await api.post<{ url: string }>("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploadedUrls.push(res.url);
      }

      // Add uploaded URLs to gallery
      const newImages = Array.from(new Set([...images, ...uploadedUrls]));
      onChange(newImages);

      const savedPercent = totalOriginal > 0
        ? Math.round(((totalOriginal - totalOptimized) / totalOriginal) * 100)
        : 0;

      toast.success(
        `${uploadedUrls.length} ${uploadedUrls.length === 1 ? "image" : "images"} converted to WebP and added!`,
        {
          description: savedPercent > 0
            ? `Saved ${savedPercent}% (${formatBytes(totalOriginal)} → ${formatBytes(totalOptimized)})`
            : undefined,
        },
      );
    } catch (err) {
      const apiErr = toApiError(err);
      setUploadError(apiErr.message || "Failed to convert or upload images.");
    } finally {
      setBusy(false);
      setStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index));
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
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Additional Gallery Images (Detail Page)
          </label>
          <p className="text-[11px] text-muted-foreground">
            Upload pictures or add URLs. Uploaded images are automatically compressed to modern WebP.
          </p>
        </div>
        <Badge variant="secondary" className="text-[11px] font-medium">
          {images.length} {images.length === 1 ? "image" : "images"}
        </Badge>
      </div>

      {/* Tabs for Upload vs URL */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as "upload" | "url");
          setUploadError(null);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="upload" className="text-xs cursor-pointer">
            <UploadCloudIcon className="size-3.5 mr-1.5" />
            Upload (WebP)
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs cursor-pointer">
            <LinkIcon className="size-3.5 mr-1.5" />
            Image URL
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab with Drag & Drop */}
        <TabsContent value="upload" className="pt-2">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer select-none",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-background/50",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onFileInputChange}
              className="hidden"
            />
            {busy ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Spinner className="size-5 text-primary" />
                <span className="text-xs font-medium text-foreground">{status}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <ImagePlusIcon className="size-5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select multiple images (PNG, JPG, WebP) · Auto-compressed to WebP
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* URL Tab */}
        <TabsContent value="url" className="pt-2">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/photo.jpg or /api/uploads/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              className="text-xs h-9"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddUrl}
              className="shrink-0 cursor-pointer"
            >
              <PlusIcon className="size-3.5 mr-1" />
              Add
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Errors */}
      {(uploadError || error) && (
        <p className="text-xs text-destructive font-medium">{uploadError || error}</p>
      )}

      {/* Gallery Thumbnails List */}
      {images.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Gallery preview ({images.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="group/thumb relative size-16 shrink-0 rounded-lg border bg-background overflow-hidden shadow-2xs"
              >
                <ProductImage src={url} alt={`Gallery ${idx + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"
                  title="Remove image from gallery"
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </button>
                <span className="absolute bottom-0.5 right-1 rounded bg-black/60 px-1 py-0.2 text-[9px] font-mono text-white/90">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
