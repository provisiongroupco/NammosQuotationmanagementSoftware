'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMaterials } from '@/lib/supabase/queries';
import AddMaterialDialog from '@/components/add-material-dialog';
import type { Material, MaterialType } from '@/types';

const MATERIAL_TYPES: { value: MaterialType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fabric', label: 'Fabrics' },
  { value: 'leather', label: 'Leather' },
  { value: 'wood', label: 'Woods' },
  { value: 'metal', label: 'Metal' },
  { value: 'glass', label: 'Glass' },
  { value: 'stone', label: 'Stone' },
];

const availabilityColors = {
  in_stock: 'bg-success/20 text-success',
  limited: 'bg-warning/20 text-warning',
  out_of_stock: 'bg-destructive/20 text-destructive',
};

const typeColors: Record<MaterialType, string> = {
  fabric: '#8B7355',
  leather: '#654321',
  wood: '#DEB887',
  metal: '#C0C0C0',
  glass: '#E8E8E8',
  stone: '#808080',
};

const typeBadgeColors: Record<MaterialType, string> = {
  fabric: 'bg-amber-800/30 text-amber-400',
  leather: 'bg-orange-900/30 text-orange-400',
  wood: 'bg-yellow-800/30 text-yellow-500',
  metal: 'bg-slate-600/30 text-slate-300',
  glass: 'bg-cyan-800/30 text-cyan-300',
  stone: 'bg-gray-600/30 text-gray-300',
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<MaterialType | 'all'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    async function fetchMaterials() {
      const data = await getMaterials();
      setMaterials(data);
      setLoading(false);
    }
    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.name.toLowerCase().includes(search.toLowerCase()) ||
      material.code.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'all' || material.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getCountByType = (type: MaterialType | 'all') => {
    if (type === 'all') return materials.length;
    return materials.filter((m) => m.type === type).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nammos-cream">
            Materials
          </h1>
          <p className="text-nammos-muted mt-1">
            Fabrics, woods, leathers, and finishes
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Material
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nammos-muted" />
          <Input
            placeholder="Search materials by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-nammos-charcoal border-border"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nammos-muted hover:text-nammos-cream"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {MATERIAL_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedType(type.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-nammos-charcoal text-nammos-cream hover:bg-nammos-charcoal/80'
            }`}
          >
            {type.label} ({getCountByType(type.value)})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="bg-nammos-charcoal border-border overflow-hidden animate-pulse">
              <div className="aspect-square bg-nammos-dark" />
              <CardContent className="p-3 space-y-2">
                <div className="h-4 bg-nammos-dark rounded w-3/4" />
                <div className="h-3 bg-nammos-dark rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-nammos-muted">
            {search
              ? `No materials found matching "${search}"`
              : 'No materials found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredMaterials.map((material) => (
            <Card
              key={material.id}
              className="bg-nammos-charcoal border-border overflow-hidden hover:border-primary transition-colors cursor-pointer group"
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
                    className="w-16 h-16 rounded-full"
                    style={{ backgroundColor: typeColors[material.type] }}
                  />
                )}
                <Badge
                  className={`absolute top-2 right-2 text-xs capitalize ${typeBadgeColors[material.type]}`}
                >
                  {material.type}
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-nammos-cream text-sm truncate">
                  {material.name}
                </h3>
                <p className="text-xs text-nammos-muted">{material.code}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    +AED {material.price_uplift}
                  </span>
                  <Badge
                    className={`text-xs ${
                      availabilityColors[material.availability]
                    }`}
                  >
                    {material.availability.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMaterialDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onMaterialAdded={(material) => {
          setMaterials([material, ...materials]);
        }}
      />
    </div>
  );
}
