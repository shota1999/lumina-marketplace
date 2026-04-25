'use client';

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Star, Trash2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';

import { toast } from '@/hooks/use-toast';

interface UploadedImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  storageKey?: string;
}

interface ImageUploaderProps {
  listingId: string;
  existingImages?: UploadedImage[];
  onImagesChange?: (images: UploadedImage[]) => void;
  maxImages?: number;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUploader({
  listingId,
  existingImages = [],
  onImagesChange,
  maxImages = 20,
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateImages = useCallback(
    (updated: UploadedImage[]) => {
      setImages(updated);
      onImagesChange?.(updated);
    },
    [onImagesChange],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const uploadId = crypto.randomUUID();
      setUploading((prev) => [...prev, { id: uploadId, file, progress: 0 }]);

      try {
        // 1. Get presigned URL
        const ext = file.name.split('.').pop() ?? 'jpg';
        const presignRes = await fetch('/api/upload/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: `image.${ext}`, contentType: file.type, listingId }),
        });
        const presignJson = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignJson.error?.message ?? 'Failed to get upload URL');

        const { uploadUrl, publicUrl, storageKey } = presignJson.data;
        setUploading((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress: 30 } : u)),
        );

        // 2. Upload to S3
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        setUploading((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress: 70 } : u)),
        );

        // 3. Register image
        const registerRes = await fetch(`/api/listings/${listingId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: publicUrl,
            storageKey,
            alt: file.name.replace(/\.[^.]+$/, ''),
            width: 0,
            height: 0,
            isPrimary: images.length === 0,
          }),
        });
        const registerJson = await registerRes.json();
        if (!registerRes.ok) throw new Error(registerJson.error?.message ?? 'Failed to register image');

        setUploading((prev) => prev.filter((u) => u.id !== uploadId));
        const newImage: UploadedImage = {
          id: registerJson.data.id,
          url: publicUrl,
          alt: file.name,
          isPrimary: images.length === 0,
          storageKey,
        };
        updateImages([...images, newImage]);
      } catch (err) {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, error: err instanceof Error ? err.message : 'Upload failed' }
              : u,
          ),
        );
      }
    },
    [listingId, images, updateImages],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - images.length - uploading.length;
      const validFiles = Array.from(files)
        .filter((f) => {
          if (!ALLOWED_TYPES.includes(f.type)) {
            toast({ title: `${f.name}: invalid type`, variant: 'destructive' });
            return false;
          }
          if (f.size > MAX_SIZE) {
            toast({ title: `${f.name}: exceeds 10MB`, variant: 'destructive' });
            return false;
          }
          return true;
        })
        .slice(0, remaining);

      for (const file of validFiles) {
        uploadFile(file);
      }
    },
    [maxImages, images.length, uploading.length, uploadFile],
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      try {
        await fetch(`/api/listings/${listingId}/images/${imageId}`, { method: 'DELETE' });
        updateImages(images.filter((img) => img.id !== imageId));
      } catch {
        toast({ title: 'Failed to delete image', variant: 'destructive' });
      }
    },
    [listingId, images, updateImages],
  );

  const handleSetPrimary = useCallback(
    (imageId: string) => {
      updateImages(images.map((img) => ({ ...img, isPrimary: img.id === imageId })));
    },
    [images, updateImages],
  );

  const handleReorder = useCallback(
    (idx: number, direction: -1 | 1) => {
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= images.length) return;
      const updated = [...images];
      [updated[idx], updated[newIdx]] = [updated[newIdx]!, updated[idx]!];
      updateImages(updated);
      // Fire reorder API
      fetch(`/api/listings/${listingId}/images/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: updated.map((img) => img.id) }),
      }).catch(() => {});
    },
    [images, listingId, updateImages],
  );

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Photos ({images.length}/{maxImages})
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors ${
          dragOver
            ? 'border-slate-900 bg-slate-50 dark:border-slate-300 dark:bg-slate-800'
            : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
        }`}
      >
        <Upload className="mb-3 h-8 w-8 text-slate-400" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Drag & drop images or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WebP — max 10MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Uploading */}
      {uploading.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800"
        >
          <ImagePlus className="h-5 w-5 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
              {u.file.name}
            </p>
            {u.error ? (
              <p className="text-xs text-red-500">{u.error}</p>
            ) : (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-300"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            )}
          </div>
          {u.error && (
            <button
              onClick={() => setUploading((prev) => prev.filter((x) => x.id !== u.id))}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!u.error && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
      ))}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={`group relative overflow-hidden rounded-xl ring-1 transition-all ${
                img.isPrimary
                  ? 'ring-2 ring-amber-400'
                  : 'ring-slate-200 dark:ring-slate-700'
              }`}
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              {img.isPrimary && (
                <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">
                  Primary
                </span>
              )}
              {/* Actions overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                {!img.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(img.id)}
                    className="rounded-lg bg-white/90 p-2 text-amber-600 hover:bg-white"
                    title="Set as primary"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                {idx > 0 && (
                  <button
                    onClick={() => handleReorder(idx, -1)}
                    className="rounded-lg bg-white/90 p-2 text-slate-700 hover:bg-white"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
                {idx < images.length - 1 && (
                  <button
                    onClick={() => handleReorder(idx, 1)}
                    className="rounded-lg bg-white/90 p-2 text-slate-700 hover:bg-white"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(img.id)}
                  className="rounded-lg bg-white/90 p-2 text-red-500 hover:bg-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
