'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Search, Check, X, Filter, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Material, MaterialType } from '@/types';

const typeColors: Record<MaterialType, string> = {
  fabric: '#8B7355',
  leather: '#654321',
  wood: '#DEB887',
  metal: '#C0C0C0',
  glass: '#E8E8E8',
  stone: '#808080',
};

const availabilityColors = {
  in_stock: 'bg-success/20 text-success',
  limited: 'bg-warning/20 text-warning',
  out_of_stock: 'bg-destructive/20 text-destructive',
};

const ALL_MATERIAL_TYPES: MaterialType[] = ['fabric', 'leather', 'wood', 'metal', 'glass', 'stone'];

interface GlobalMaterialSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: Material[];
  onMaterialSelect: (material: Material) => void;
  partLabel: string;
  allowedTypes?: MaterialType[];
}

export default function GlobalMaterialSearch({
  open,
  onOpenChange,
  materials,
  onMaterialSelect,
  partLabel,
  allowedTypes,
}: GlobalMaterialSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<MaterialType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const availableTypes = allowedTypes || ALL_MATERIAL_TYPES;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    materials.forEach((m) => {
      if (m.tags) {
        m.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let result = materials;

    if (allowedTypes && allowedTypes.length > 0) {
      result = result.filter((m) => allowedTypes.includes(m.type));
    }

    if (selectedTypes.length > 0) {
      result = result.filter((m) => selectedTypes.includes(m.type));
    }

    if (selectedTags.length > 0) {
      result = result.filter((m) =>
        m.tags && selectedTags.some((tag) => m.tags.includes(tag))
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (material) =>
          material.name.toLowerCase().includes(query) ||
          material.code.toLowerCase().includes(query) ||
          (material.supplier && material.supplier.toLowerCase().includes(query)) ||
          (material.tags && material.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    return result;
  }, [materials, searchQuery, selectedTypes, selectedTags, allowedTypes]);

  const toggleType = useCallback((type: MaterialType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTypes([]);
    setSelectedTags([]);
    setSearchQuery('');
  }, []);

  const handleConfirm = () => {
    if (selectedMaterial) {
      onMaterialSelect(selectedMaterial);
      setSelectedMaterial(null);
      setSearchQuery('');
      clearFilters();
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedMaterial(null);
    setSearchQuery('');
    clearFilters();
    onOpenChange(false);
  };

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setSelectedMaterial(null);
      setSearchQuery('');
      setShowFilters(false);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const hasActiveFilters = selectedTypes.length > 0 || selectedTags.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-nammos-charcoal border-border sm:max-w-5xl max-h-[85vh] !grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-nammos-cream">
            Search Materials{partLabel ? ` for "${partLabel}"` : ''}
          </DialogTitle>
          <p className="text-sm text-nammos-muted">
            Search across all materials by name, code, supplier, or tags
          </p>
        </DialogHeader>

        <div className="flex-shrink-0 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nammos-muted" />
              <Input
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-nammos-dark border-border text-lg h-12"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nammos-muted hover:text-nammos-cream"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="lg"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-1 bg-primary-foreground text-primary h-5 w-5 p-0 flex items-center justify-center">
                  {selectedTypes.length + selectedTags.length}
                </Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="p-4 bg-nammos-dark rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-nammos-cream">Filter Options</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    Clear All
                  </Button>
                )}
              </div>

              <div>
                <label className="text-xs text-nammos-muted mb-2 block">Material Type</label>
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                        selectedTypes.includes(type)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-nammos-charcoal text-nammos-cream hover:bg-secondary border border-border'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {allTags.length > 0 && (
                <div>
                  <label className="text-xs text-nammos-muted mb-2 block flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-nammos-charcoal text-nammos-cream hover:bg-secondary border border-border'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => toggleType(type)}
                >
                  {type}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => toggleTag(tag)}
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-auto min-h-0">
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-nammos-muted">
                {searchQuery.trim() || hasActiveFilters
                  ? 'No materials found matching your criteria'
                  : 'No materials available'}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
              {filteredMaterials.map((material) => (
                <div
                  key={material.id}
                  onClick={() => setSelectedMaterial(material)}
                  className={`group cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                    selectedMaterial?.id === material.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <div className="aspect-square bg-gradient-to-br from-nammos-dark to-nammos-charcoal flex items-center justify-center relative">
                    {material.swatch_image_url ? (
                      <Image
                        src={material.swatch_image_url}
                        alt={material.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-lg shadow-inner"
                        style={{ backgroundColor: typeColors[material.type] }}
                      />
                    )}

                    {selectedMaterial?.id === material.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}

                    <Badge
                      className="absolute top-2 left-2 text-xs capitalize"
                      variant="secondary"
                    >
                      {material.type}
                    </Badge>
                  </div>

                  <div className="p-3 space-y-2">
                    <div>
                      <h3 className="font-medium text-nammos-cream text-sm line-clamp-2 leading-tight">
                        {material.name}
                      </h3>
                      <p className="text-xs text-nammos-muted font-mono">
                        {material.code}
                      </p>
                    </div>

                    {material.supplier && (
                      <p className="text-xs text-nammos-muted/80 truncate">
                        {material.supplier}
                      </p>
                    )}

                    {material.tags && material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {material.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-nammos-dark rounded text-nammos-muted"
                          >
                            {tag}
                          </span>
                        ))}
                        {material.tags.length > 3 && (
                          <span className="text-[10px] text-nammos-muted">
                            +{material.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        +AED {material.price_uplift}
                      </span>
                      <Badge
                        className={`text-xs ${availabilityColors[material.availability]}`}
                      >
                        {material.availability === 'in_stock'
                          ? 'In Stock'
                          : material.availability === 'limited'
                          ? 'Limited'
                          : 'Out of Stock'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between w-full pt-4 border-t border-border">
          <p className="text-xs text-nammos-muted">
            {filteredMaterials.length} material{filteredMaterials.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedMaterial}
              className="min-w-[100px]"
            >
              {selectedMaterial ? 'Select Material' : 'Select a Material'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
