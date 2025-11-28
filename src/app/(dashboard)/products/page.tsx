'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProducts } from '@/lib/supabase/queries';
import AddProductDialog from '@/components/add-product-dialog';
import type { Product } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nammos-cream">Products</h1>
          <p className="text-nammos-muted mt-1">
            Manage your furniture catalog
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nammos-muted" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-nammos-charcoal border-border"
          />
        </div>
        <Button variant="outline">All Categories</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-nammos-charcoal border-border overflow-hidden animate-pulse">
              <div className="aspect-square bg-nammos-dark" />
              <CardContent className="p-4 space-y-2">
                <div className="h-5 bg-nammos-dark rounded w-3/4" />
                <div className="h-4 bg-nammos-dark rounded w-1/2" />
                <div className="h-6 bg-nammos-dark rounded w-1/3 mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-nammos-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-nammos-cream">No products found</h3>
          <p className="text-nammos-muted mt-1">
            {search ? 'Try a different search term' : 'Add your first product to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="bg-nammos-charcoal border-border overflow-hidden hover:border-primary transition-colors cursor-pointer"
            >
              <div className="aspect-square bg-nammos-dark flex items-center justify-center relative">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <Package className="h-16 w-16 text-nammos-muted" />
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-nammos-cream">
                      {product.name}
                    </h3>
                    <p className="text-sm text-nammos-muted">
                      {product.dimensions} cm
                    </p>
                  </div>
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-semibold text-primary">
                    AED {product.base_price.toLocaleString()}
                  </span>
                  <span className="text-sm text-nammos-muted">
                    {product.cbm} CBM
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddProductDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProductAdded={(product) => {
          setProducts([product, ...products]);
        }}
      />
    </div>
  );
}
