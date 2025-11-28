'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Package, Plus, Trash2, MousePointer2, Tag, Move, Search, Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlobalMaterialSearch from '@/components/global-material-search';
import type { Product, Material, Annotation } from '@/types';

interface AnnotationCanvasProps {
  product: Product;
  materials: Material[];
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
}

interface PendingPoint {
  x: number;
  y: number;
}

const QUICK_LABELS = [
  'Seat',
  'Back',
  'Legs',
  'Arms',
  'Cushion',
  'Frame',
  'Piping',
  'Stitching',
  'Base',
  'Headrest',
];

export default function AnnotationCanvas({
  product,
  materials,
  annotations,
  onAnnotationsChange,
}: AnnotationCanvasProps) {
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<PendingPoint | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [searchFirstMode, setSearchFirstMode] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPositionFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingId) return;
    if (!isAddingPoint) return;

    const pos = getPositionFromEvent(e);
    if (!pos) return;

    setPendingPoint(pos);
    setIsAddingPoint(false);
    setCustomLabel('');
    setIsCustomMode(false);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, annotationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(annotationId);
    setSelectedAnnotationId(null);
  };

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingId) return;
    e.preventDefault();

    const pos = getPositionFromEvent(e);
    if (!pos) return;

    onAnnotationsChange(
      annotations.map((ann) =>
        ann.id === draggingId ? { ...ann, x: pos.x, y: pos.y } : ann
      )
    );
  }, [draggingId, annotations, onAnnotationsChange, getPositionFromEvent]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleOpenMaterialSearch = () => {
    if (!customLabel.trim()) return;
    setShowMaterialSearch(true);
  };

  const handleSearchFirstSelect = (material: Material) => {
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      part_id: `search-${Date.now()}`,
      part_name: material.name,
      material_id: material.id,
      material,
      x: 50,
      y: 50,
    };

    onAnnotationsChange([...annotations, newAnnotation]);
    setShowMaterialSearch(false);
    setSearchFirstMode(false);
  };

  const handleMaterialSelect = (material: Material) => {
    if (!pendingPoint || !customLabel.trim()) return;

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      part_id: `point-${Date.now()}`,
      part_name: customLabel.trim(),
      material_id: material.id,
      material,
      x: pendingPoint.x,
      y: pendingPoint.y,
    };

    onAnnotationsChange([...annotations, newAnnotation]);
    setPendingPoint(null);
    setCustomLabel('');
    setIsCustomMode(false);
    setShowMaterialSearch(false);
  };

  const handleQuickLabel = (label: string) => {
    setCustomLabel(label);
    setIsCustomMode(false);
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    onAnnotationsChange(annotations.filter((a) => a.id !== annotationId));
    if (selectedAnnotationId === annotationId) {
      setSelectedAnnotationId(null);
    }
  };

  const handleCancelPendingPoint = () => {
    setPendingPoint(null);
    setCustomLabel('');
    setIsCustomMode(false);
    setShowMaterialSearch(false);
  };

  const handleGeneratePreview = async () => {
    if (annotations.length === 0 || !product.image_url) return;

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch('/api/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productImageUrl: product.image_url,
          productName: product.name,
          annotations: annotations.map((ann) => ({
            partName: ann.part_name,
            materialName: ann.material.name,
            materialType: ann.material.type,
            materialCode: ann.material.code,
            swatchImageUrl: ann.material.swatch_image_url,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setPreviewImage(data.imageBase64);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-nammos-muted flex-1">
          {isAddingPoint
            ? 'Click on the image to place a marker'
            : draggingId
              ? 'Drag to reposition the marker'
              : annotations.length === 0
                ? 'Search materials or add points on image'
                : `${annotations.length} point${annotations.length > 1 ? 's' : ''} marked`
          }
        </p>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setSearchFirstMode(true);
              setShowMaterialSearch(true);
            }}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Search Materials
          </Button>
          <Button
            size="sm"
            variant={isAddingPoint ? 'secondary' : 'outline'}
            onClick={() => {
              setIsAddingPoint(!isAddingPoint);
              setPendingPoint(null);
            }}
            className="gap-2"
          >
            {isAddingPoint ? (
              <>
                <MousePointer2 className="h-4 w-4" />
                Click to Place
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Point
              </>
            )}
          </Button>
          {annotations.length > 0 && (
            <Button
              size="sm"
              variant="default"
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview || !product.image_url}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isGeneratingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI Preview
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {previewError && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-lg flex items-center justify-between">
          <p className="text-sm text-destructive">{previewError}</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPreviewError(null)}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{ touchAction: draggingId ? 'none' : 'auto' }}
          className={`relative aspect-[4/3] min-h-[280px] max-h-[400px] bg-nammos-dark rounded-lg overflow-hidden ${
            isAddingPoint ? 'cursor-crosshair ring-2 ring-primary' : draggingId ? 'cursor-grabbing' : 'cursor-default'
          }`}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-20 w-20 text-nammos-muted/30" />
            </div>
          )}

          {annotations.map((annotation, index) => (
            <div
              key={annotation.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                draggingId === annotation.id
                  ? 'z-30 scale-125 cursor-grabbing'
                  : selectedAnnotationId === annotation.id
                    ? 'z-20 scale-110'
                    : 'z-10 cursor-pointer'
              }`}
              style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, touchAction: 'none' }}
              onClick={(e) => {
                if (draggingId) return;
                e.stopPropagation();
                setSelectedAnnotationId(
                  selectedAnnotationId === annotation.id ? null : annotation.id
                );
              }}
              onMouseDown={(e) => handleDragStart(e, annotation.id)}
              onTouchStart={(e) => handleDragStart(e, annotation.id)}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 overflow-hidden relative ${
                  draggingId === annotation.id
                    ? 'border-white ring-2 ring-primary/50'
                    : selectedAnnotationId === annotation.id
                      ? 'border-white ring-2 ring-primary'
                      : 'border-primary'
                }`}
              >
                {annotation.material.swatch_image_url ? (
                  <Image
                    src={annotation.material.swatch_image_url}
                    alt={annotation.material.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: annotation.material.type === 'fabric' ? '#8B7355' :
                        annotation.material.type === 'leather' ? '#654321' :
                        annotation.material.type === 'wood' ? '#DEB887' :
                        annotation.material.type === 'metal' ? '#C0C0C0' :
                        annotation.material.type === 'glass' ? '#E8E8E8' : '#808080'
                    }}
                  />
                )}
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {index + 1}
                </span>
              </div>
              {selectedAnnotationId === annotation.id && !draggingId && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-nammos-charcoal rounded-lg p-2 shadow-xl border border-border min-w-[160px] z-30">
                  <p className="text-xs font-bold text-primary truncate">
                    {annotation.part_name}
                  </p>
                  <p className="text-xs font-medium text-nammos-cream truncate">
                    {annotation.material.name}
                  </p>
                  <p className="text-xs text-nammos-muted">
                    {annotation.material.code}
                  </p>
                  <div className="flex gap-1 mt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 h-7 text-xs text-nammos-muted hover:text-nammos-cream"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, annotation.id);
                      }}
                    >
                      <Move className="h-3 w-3 mr-1" />
                      Move
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnotation(annotation.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {pendingPoint && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ left: `${pendingPoint.x}%`, top: `${pendingPoint.y}%` }}
            >
              <div className="w-8 h-8 rounded-full bg-primary animate-pulse flex items-center justify-center border-2 border-white shadow-lg">
                <Plus className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          )}

          {isAddingPoint && (
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          )}
        </div>

        <div className="space-y-3">
          {pendingPoint ? (
            <div className="p-4 bg-nammos-dark rounded-lg border border-primary space-y-3">
              <h4 className="font-medium text-nammos-cream">
                Configure Point
              </h4>

              <div>
                <label className="text-xs text-nammos-muted mb-1 block">
                  Part Label *
                </label>
                {isCustomMode ? (
                  <div className="flex gap-2">
                    <Input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="e.g., Custom Stitching"
                      className="bg-nammos-charcoal border-border h-9 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCustomMode(false)}
                      className="h-9"
                    >
                      Back
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {QUICK_LABELS.map((label) => (
                        <button
                          key={label}
                          onClick={() => handleQuickLabel(label)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            customLabel === label
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-nammos-charcoal text-nammos-cream hover:bg-secondary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsCustomMode(true)}
                      className="w-full h-8 text-xs gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      Custom Label
                    </Button>
                  </div>
                )}
                {customLabel && (
                  <p className="text-xs text-primary mt-1">
                    Selected: {customLabel}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-nammos-muted mb-1 block">
                  Select Material
                </label>
                {!customLabel.trim() ? (
                  <p className="text-xs text-nammos-muted italic">Select a label first</p>
                ) : (
                  <Button
                    onClick={handleOpenMaterialSearch}
                    className="w-full gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Search &amp; Select Material
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleCancelPendingPoint}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              {annotations.length === 0 && (
                <div className="p-3 bg-nammos-dark rounded-lg border border-border">
                  <h4 className="font-medium text-nammos-cream text-sm mb-2">
                    How to Annotate
                  </h4>
                  <ol className="text-xs text-nammos-muted space-y-1">
                    <li>1. Click &ldquo;Add Point&rdquo; button</li>
                    <li>2. Click on the furniture image</li>
                    <li>3. Name the part (Seat, Piping, etc.)</li>
                    <li>4. Select material type & material</li>
                    <li>5. Drag markers to reposition</li>
                  </ol>
                </div>
              )}

              {annotations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-nammos-cream text-sm">
                    Material Specifications
                  </h4>
                  <p className="text-xs text-nammos-muted">
                    Tip: Drag markers on the image to reposition
                  </p>
                  {annotations.map((annotation, index) => (
                    <div
                      key={annotation.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                        selectedAnnotationId === annotation.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-nammos-dark border-border hover:border-nammos-cream'
                      }`}
                      onClick={() =>
                        setSelectedAnnotationId(
                          selectedAnnotationId === annotation.id
                            ? null
                            : annotation.id
                        )
                      }
                    >
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary">
                          {annotation.part_name}
                        </p>
                        <p className="text-sm font-medium text-nammos-cream truncate">
                          {annotation.material.name}
                        </p>
                        <p className="text-xs text-nammos-muted">
                          {annotation.material.type} • +AED{' '}
                          {annotation.material.price_uplift}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-nammos-muted hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(annotation.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewImage && (
        <div className="relative aspect-video max-h-[300px] rounded-lg overflow-hidden border border-primary bg-nammos-dark">
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPreviewImage(null)}
              className="gap-1 h-7 text-xs"
            >
              <X className="h-3 w-3" />
              Close
            </Button>
          </div>
          <div className="absolute top-2 left-2 z-10">
            <p className="text-xs text-primary font-medium flex items-center gap-1 bg-nammos-dark/80 px-2 py-1 rounded">
              <Sparkles className="h-3 w-3" />
              AI Preview
            </p>
          </div>
          <Image
            src={previewImage}
            alt="AI Generated Preview"
            fill
            className="object-contain"
          />
        </div>
      )}

      <GlobalMaterialSearch
        open={showMaterialSearch}
        onOpenChange={(open) => {
          setShowMaterialSearch(open);
          if (!open) setSearchFirstMode(false);
        }}
        materials={materials}
        onMaterialSelect={searchFirstMode ? handleSearchFirstSelect : handleMaterialSelect}
        partLabel={searchFirstMode ? '' : customLabel}
      />
    </div>
  );
}
