'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Search, Package, X, Plus, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Product } from '@/types';

interface ProductSelectorProps {
  products: Product[];
  onSelect: (product: Product) => void;
  onCancel: () => void;
}

export default function ProductSelector({
  products,
  onSelect,
  onCancel,
}: ProductSelectorProps) {
  const [search, setSearch] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customProduct, setCustomProduct] = useState({
    name: '',
    category: 'Custom',
    base_price: 0,
    dimensions: '',
    cbm: 0,
    image_url: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setCustomProduct({ ...customProduct, image_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCustomProduct = () => {
    if (!customProduct.name || !customProduct.base_price) return;

    const newProduct: Product = {
      id: `custom-${Date.now()}`,
      name: customProduct.name,
      category: customProduct.category || 'Custom',
      base_price: customProduct.base_price,
      dimensions: customProduct.dimensions || '0×0×0',
      cbm: customProduct.cbm || 0,
      image_url: customProduct.image_url,
      annotatable_parts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSelect(newProduct);
    setShowCustomForm(false);
    setCustomProduct({
      name: '',
      category: 'Custom',
      base_price: 0,
      dimensions: '',
      cbm: 0,
      image_url: '',
    });
    setImagePreview(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nammos-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-10 bg-nammos-dark border-border"
            autoFocus
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
        <button
          onClick={() => setShowCustomForm(true)}
          className="flex flex-col items-center justify-center p-2 bg-nammos-dark rounded-lg border-2 border-dashed border-primary/50 hover:border-primary transition-colors min-h-[120px]"
        >
          <Plus className="h-8 w-8 text-primary mb-2" />
          <span className="text-xs font-medium text-primary text-center">
            Custom Product
          </span>
        </button>

        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className="flex flex-col items-center p-2 bg-nammos-dark rounded-lg border border-border hover:border-primary transition-colors text-left"
          >
            <div className="w-full aspect-square bg-nammos-charcoal rounded flex items-center justify-center mb-2 relative overflow-hidden">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-contain p-1"
                />
              ) : (
                <Package className="h-8 w-8 text-nammos-muted" />
              )}
            </div>
            <h4 className="font-medium text-nammos-cream text-xs text-center line-clamp-1">
              {product.name}
            </h4>
            <span className="text-xs font-medium text-primary mt-1">
              AED {product.base_price.toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-nammos-muted mx-auto mb-2" />
          <p className="text-nammos-muted">No products found</p>
        </div>
      )}

      <Dialog open={showCustomForm} onOpenChange={setShowCustomForm}>
        <DialogContent className="bg-nammos-charcoal border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-nammos-cream">Add Custom Product</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 bg-nammos-dark rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer flex flex-col items-center justify-center overflow-hidden"
            >
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={160}
                  height={160}
                  className="object-contain"
                />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-nammos-muted mb-2" />
                  <span className="text-sm text-nammos-muted">Click to upload image</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="space-y-2">
              <Label htmlFor="customName">Product Name *</Label>
              <Input
                id="customName"
                value={customProduct.name}
                onChange={(e) => setCustomProduct({ ...customProduct, name: e.target.value })}
                placeholder="e.g. Custom Dining Table"
                className="bg-nammos-dark border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customCategory">Category</Label>
              <Input
                id="customCategory"
                value={customProduct.category}
                onChange={(e) => setCustomProduct({ ...customProduct, category: e.target.value })}
                placeholder="e.g. Seating, Tables"
                className="bg-nammos-dark border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customPrice">Base Price (AED) *</Label>
                <Input
                  id="customPrice"
                  type="number"
                  value={customProduct.base_price || ''}
                  onChange={(e) => setCustomProduct({ ...customProduct, base_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="bg-nammos-dark border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customCbm">CBM</Label>
                <Input
                  id="customCbm"
                  type="number"
                  step="0.01"
                  value={customProduct.cbm || ''}
                  onChange={(e) => setCustomProduct({ ...customProduct, cbm: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="bg-nammos-dark border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDimensions">Dimensions (W×D×H cm)</Label>
              <Input
                id="customDimensions"
                value={customProduct.dimensions}
                onChange={(e) => setCustomProduct({ ...customProduct, dimensions: e.target.value })}
                placeholder="e.g. 120×80×75"
                className="bg-nammos-dark border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomProduct}
              disabled={!customProduct.name || !customProduct.base_price}
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
