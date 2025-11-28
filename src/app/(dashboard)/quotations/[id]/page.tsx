'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Plus, Trash2, Download, Package, Pencil, Users, X, Save } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import ProductSelector from '@/components/product-selector';
import AnnotationCanvas from '@/components/annotation-canvas';
import type { Product, Material, Annotation, QuotationItem, Client, Quotation } from '@/types';
import { exportQuotationToExcel, downloadBlob } from '@/lib/excel/export-quotation';
import { getProducts, getMaterials, getClients, getQuotationById, updateQuotation } from '@/lib/supabase/queries';

const statusColors = {
  draft: 'bg-nammos-muted/20 text-nammos-muted',
  sent: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-success/20 text-success',
  rejected: 'bg-destructive/20 text-destructive',
};

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentAnnotations, setCurrentAnnotations] = useState<Annotation[]>([]);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [productsData, materialsData, clientsData, quotationData] = await Promise.all([
        getProducts(),
        getMaterials(),
        getClients(),
        getQuotationById(id),
      ]);
      setProducts(productsData);
      setMaterials(materialsData);
      setClients(clientsData);

      if (quotationData) {
        setQuotation(quotationData);
        setCustomerName(quotationData.customer_name);
        setCustomerEmail(quotationData.customer_email || '');
        setCustomerPhone(quotationData.customer_phone || '');
        setItems(quotationData.items);

        if (quotationData.client_id) {
          const client = clientsData.find((c) => c.id === quotationData.client_id);
          if (client) setSelectedClient(client);
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [id]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCustomerName(client.name);
    setCustomerEmail(client.email || '');
    setCustomerPhone(client.phone || '');
    setShowClientSelector(false);
    setClientSearch('');
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
      (client.company && client.company.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const calculateItemPrice = (product: Product, annotations: Annotation[]) => {
    const materialUplifts = annotations.reduce((sum, ann) => sum + ann.material.price_uplift, 0);
    return product.base_price + materialUplifts;
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;

    const unitPrice = calculateItemPrice(selectedProduct, currentAnnotations);

    if (editingItemId) {
      setItems(items.map(item =>
        item.id === editingItemId
          ? {
              ...item,
              product: selectedProduct,
              product_id: selectedProduct.id,
              quantity: currentQuantity,
              unit_price: unitPrice,
              annotations: currentAnnotations,
              cbm: selectedProduct.cbm,
              total_cbm: selectedProduct.cbm * currentQuantity,
              total_price: unitPrice * currentQuantity,
            }
          : item
      ));
      setEditingItemId(null);
    } else {
      const newItem: QuotationItem = {
        id: crypto.randomUUID(),
        quotation_id: id,
        product_id: selectedProduct.id,
        product: selectedProduct,
        quantity: currentQuantity,
        unit_price: unitPrice,
        annotations: currentAnnotations,
        cbm: selectedProduct.cbm,
        total_cbm: selectedProduct.cbm * currentQuantity,
        total_price: unitPrice * currentQuantity,
      };
      setItems([...items, newItem]);
    }

    setSelectedProduct(null);
    setCurrentAnnotations([]);
    setCurrentQuantity(1);
  };

  const handleEditItem = (item: QuotationItem) => {
    setEditingItemId(item.id);
    setSelectedProduct(item.product);
    setCurrentAnnotations(item.annotations);
    setCurrentQuantity(item.quantity);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const vatAmount = subtotal * 0.05;
  const totalAmount = subtotal + vatAmount;
  const totalCbm = items.reduce((sum, item) => sum + item.total_cbm, 0);

  const getMaterialSpecifications = (annotations: Annotation[]) => {
    if (annotations.length === 0) return 'Standard';
    return annotations
      .map((ann, index) => `${index + 1}. ${ann.part_name}: ${ann.material.name}`)
      .join(', ');
  };

  const handleSave = async () => {
    if (items.length === 0 || !customerName || !quotation) return;

    setSaving(true);
    try {
      const result = await updateQuotation(id, {
        client_id: selectedClient?.id,
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        status: quotation.status,
        items,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        total_cbm: totalCbm,
      });

      if (result) {
        router.push('/quotations');
      } else {
        alert('Failed to save quotation. Please try again.');
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert('Failed to save quotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = async () => {
    if (items.length === 0 || !quotation) return;

    const blob = await exportQuotationToExcel({
      quotation: {
        reference_number: quotation.reference_number,
        customer_name: customerName || 'Customer',
        items,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
      },
    });

    const filename = `Nammos_Quotation_${customerName || 'Draft'}_${quotation.reference_number}.xlsx`;
    downloadBlob(blob, filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-nammos-muted">Loading quotation...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-nammos-muted">Quotation not found</p>
        <Link href="/quotations">
          <Button variant="outline">Back to Quotations</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-nammos-cream">
              {quotation.reference_number}
            </h1>
            <Badge className={`capitalize ${statusColors[quotation.status]}`}>
              {quotation.status}
            </Badge>
          </div>
          <p className="text-nammos-muted">
            Edit quotation details
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-nammos-charcoal border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-nammos-cream">
                Customer Information
              </CardTitle>
              {!selectedClient && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowClientSelector(!showClientSelector)}
                >
                  <Users className="h-4 w-4" />
                  Select Existing Client
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {showClientSelector && (
                <div className="p-4 bg-nammos-dark rounded-lg space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <Label>Select Client</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowClientSelector(false);
                        setClientSearch('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="bg-nammos-charcoal border-border"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredClients.length === 0 ? (
                      <p className="text-sm text-nammos-muted text-center py-4">
                        No clients found
                      </p>
                    ) : (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left p-2 rounded hover:bg-nammos-charcoal transition-colors"
                        >
                          <p className="font-medium text-nammos-cream text-sm">
                            {client.name}
                          </p>
                          <p className="text-xs text-nammos-muted">
                            {client.email || client.phone || client.company || 'No contact info'}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedClient && (
                <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary rounded-lg mb-4">
                  <div>
                    <p className="text-sm text-nammos-muted">Selected Client</p>
                    <p className="font-medium text-nammos-cream">{selectedClient.name}</p>
                    {selectedClient.company && (
                      <p className="text-xs text-nammos-muted">{selectedClient.company}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearClient}
                    className="text-nammos-muted hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="bg-nammos-dark border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="bg-nammos-dark border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+971 XX XXX XXXX"
                    className="bg-nammos-dark border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedProduct ? (
            <Card className="bg-nammos-charcoal border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-nammos-cream">
                  {editingItemId ? 'Edit' : 'Configure'}: {selectedProduct.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(null);
                    setCurrentAnnotations([]);
                    setCurrentQuantity(1);
                    setEditingItemId(null);
                  }}
                >
                  Cancel
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <AnnotationCanvas
                  product={selectedProduct}
                  materials={materials}
                  annotations={currentAnnotations}
                  onAnnotationsChange={setCurrentAnnotations}
                />
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={currentQuantity}
                      onChange={(e) =>
                        setCurrentQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-20 bg-nammos-dark border-border"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-nammos-muted">Unit Price</p>
                    <p className="text-xl font-semibold text-primary">
                      AED{' '}
                      {calculateItemPrice(
                        selectedProduct,
                        currentAnnotations
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button onClick={handleAddItem} className="w-full gap-2">
                  {editingItemId ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Update Item
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to Quotation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-nammos-charcoal border-border">
              <CardHeader>
                <CardTitle className="text-nammos-cream">Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                {showProductSelector ? (
                  <ProductSelector
                    products={products}
                    onSelect={(product) => {
                      setSelectedProduct(product);
                      setShowProductSelector(false);
                    }}
                    onCancel={() => setShowProductSelector(false)}
                  />
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-32 border-dashed gap-2"
                    onClick={() => setShowProductSelector(true)}
                  >
                    <Plus className="h-6 w-6" />
                    Select Product from Library
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {items.length > 0 && (
            <Card className="bg-nammos-charcoal border-border">
              <CardHeader>
                <CardTitle className="text-nammos-cream">
                  Quotation Items ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-4 bg-nammos-dark rounded-lg cursor-pointer hover:bg-nammos-dark/80 transition-colors ${editingItemId === item.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => handleEditItem(item)}
                    >
                      <div className="w-16 h-16 bg-nammos-charcoal rounded flex items-center justify-center overflow-hidden relative">
                        {item.product.image_url ? (
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            className="object-contain"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-nammos-muted" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-nammos-cream">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-nammos-muted">
                          {item.product.dimensions} cm | {item.cbm} CBM
                        </p>
                        <p className="text-sm text-primary mt-1">
                          {getMaterialSpecifications(item.annotations)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-nammos-muted">Qty</p>
                        <p className="font-medium text-nammos-cream">
                          {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-nammos-muted">Total</p>
                        <p className="font-medium text-primary">
                          AED {item.total_price.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-nammos-charcoal border-border sticky top-24">
            <CardHeader>
              <CardTitle className="text-nammos-cream">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-nammos-muted">Items</span>
                  <span className="text-nammos-cream">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-nammos-muted">Total CBM</span>
                  <span className="text-nammos-cream">
                    {totalCbm.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-nammos-muted">Subtotal</span>
                  <span className="text-nammos-cream">
                    AED {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-nammos-muted">VAT (5%)</span>
                  <span className="text-nammos-cream">
                    AED {vatAmount.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-nammos-cream">Total</span>
                  <span className="text-xl font-bold text-primary">
                    AED {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button
                  className="w-full gap-2"
                  disabled={items.length === 0 || !customerName || saving}
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={items.length === 0}
                  onClick={handleExportExcel}
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
