'use client';

import { useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createMaterial } from '@/lib/supabase/queries';
import { uploadMaterialSwatch } from '@/lib/supabase/storage';
import type { Material, MaterialType } from '@/types';

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'leather', label: 'Leather' },
  { value: 'wood', label: 'Wood' },
  { value: 'metal', label: 'Metal' },
  { value: 'glass', label: 'Glass' },
  { value: 'stone', label: 'Stone' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'limited', label: 'Limited' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

interface AddMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaterialAdded: (material: Material) => void;
}

export default function AddMaterialDialog({
  open,
  onOpenChange,
  onMaterialAdded,
}: AddMaterialDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '' as MaterialType | '',
    price_uplift: '',
    supplier: '',
    availability: 'in_stock' as 'in_stock' | 'limited' | 'out_of_stock',
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.type) return;

    setLoading(true);
    try {
      let swatchUrl = '';
      if (imageFile) {
        swatchUrl = await uploadMaterialSwatch(imageFile);
      }

      const newMaterial = await createMaterial({
        name: formData.name,
        code: formData.code,
        type: formData.type as MaterialType,
        price_uplift: formData.price_uplift ? parseFloat(formData.price_uplift) : 0,
        supplier: formData.supplier || undefined,
        swatch_image_url: swatchUrl,
        availability: formData.availability,
      });

      if (newMaterial) {
        onMaterialAdded(newMaterial);
        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating material:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: '',
      price_uplift: '',
      supplier: '',
      availability: 'in_stock',
    });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-nammos-charcoal border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-nammos-cream">Add New Material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Swatch Image</Label>
            {imagePreview ? (
              <div className="relative w-24 h-24 bg-nammos-dark rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`h-6 w-6 mb-1 ${isDragging ? 'text-primary' : 'text-nammos-muted'}`} />
                <span className={`text-xs ${isDragging ? 'text-primary' : 'text-nammos-muted'}`}>
                  {isDragging ? 'Drop here' : 'Upload'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Material Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Italian Leather"
                className="bg-nammos-dark border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Supplier Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., ITL-001"
                className="bg-nammos-dark border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as MaterialType })}
              >
                <SelectTrigger className="bg-nammos-dark border-border">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_uplift">Price Uplift (AED)</Label>
              <Input
                id="price_uplift"
                type="number"
                min="0"
                step="0.01"
                value={formData.price_uplift}
                onChange={(e) => setFormData({ ...formData, price_uplift: e.target.value })}
                placeholder="0.00"
                className="bg-nammos-dark border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="e.g., Supplier Co."
                className="bg-nammos-dark border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Select
                value={formData.availability}
                onValueChange={(value) => setFormData({ ...formData, availability: value as 'in_stock' | 'limited' | 'out_of_stock' })}
              >
                <SelectTrigger className="bg-nammos-dark border-border">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.code || !formData.type}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Material'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
