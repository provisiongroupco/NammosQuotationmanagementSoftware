'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface MaterialSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: Material[];
  selectedType: MaterialType;
  onMaterialSelect: (material: Material) => void;
  partLabel: string;
}

export default function MaterialSelectorDialog({
  open,
  onOpenChange,
  materials,
  selectedType,
  onMaterialSelect,
  partLabel,
}: MaterialSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Filter materials by type and search query
  const filteredMaterials = useMemo(() => {
    const typeFiltered = materials.filter((m) => m.type === selectedType);

    if (!searchQuery.trim()) {
      return typeFiltered;
    }

    const query = searchQuery.toLowerCase();
    return typeFiltered.filter(
      (material) =>
        material.name.toLowerCase().includes(query) ||
        material.code.toLowerCase().includes(query) ||
        (material.supplier && material.supplier.toLowerCase().includes(query))
    );
  }, [materials, selectedType, searchQuery]);

  const handleConfirm = () => {
    if (selectedMaterial) {
      onMaterialSelect(selectedMaterial);
      setSelectedMaterial(null);
      setSearchQuery('');
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedMaterial(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-nammos-charcoal border-border sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-nammos-cream">
            Select Material for &ldquo;{partLabel}&rdquo;
          </DialogTitle>
          <div className="text-sm text-nammos-muted">
            Material Type: <span className="capitalize text-primary font-medium">{selectedType}</span>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nammos-muted" />
          <Input
            placeholder="Search by name, code, or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-nammos-dark border-border"
            autoFocus
          />
        </div>

        {/* Material Grid */}
        <ScrollArea className="flex-1 min-h-0 pr-4">
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-nammos-muted">
                {searchQuery.trim()
                  ? `No ${selectedType} materials found matching "${searchQuery}"`
                  : `No ${selectedType} materials available`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
              {filteredMaterials.map((material) => (
                <button
                  type="button"
                  key={material.id}
                  onClick={() => setSelectedMaterial(material)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setSelectedMaterial(material);
                  }}
                  className={`group cursor-pointer rounded-lg border-2 transition-all overflow-hidden text-left w-full ${
                    selectedMaterial?.id === material.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  {/* Large Material Image */}
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

                    {/* Selection Indicator */}
                    {selectedMaterial?.id === material.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Material Info */}
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
                          : 'Out of Stock'
                        }
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <div className="flex items-center justify-between w-full">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}