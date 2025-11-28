'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Download, Package, Pencil, Users, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ProductSelector from '@/components/product-selector';
import AnnotationCanvas from '@/components/annotation-canvas';
import type { Product, Material, Annotation, QuotationItem, Client } from '@/types';
import { exportQuotationToExcel, downloadBlob } from '@/lib/excel/export-quotation';
import { getProducts, getMaterials, getClients, createQuotation, generateReferenceNumber } from '@/lib/supabase/queries';
import { useRouter } from 'next/navigation';

export default function NewQuotationPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [, setLoading] = useState(true);
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

  useEffect(() => {
    async function fetchData() {
      const [productsData, materialsData, clientsData] = await Promise.all([
        getProducts(),
        getMaterials(),
        getClients(),
      ]);
      setProducts(productsData);
      setMaterials(materialsData);
      setClients(clientsData);
      setLoading(false);
    }
    fetchData();
  }, []);

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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
        quotation_id: '',
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

  const handleSaveDraft = async () => {
    if (items.length === 0 || !customerName) return;

    setSaving(true);
    try {
      const referenceNumber = await generateReferenceNumber();

      const result = await createQuotation({
        reference_number: referenceNumber,
        client_id: selectedClient?.id,
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        status: 'draft',
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

  const handleSaveAndExport = async () => {
    if (items.length === 0 || !customerName) return;

    setSaving(true);
    try {
      const referenceNumber = await generateReferenceNumber();

      const result = await createQuotation({
        reference_number: referenceNumber,
        client_id: selectedClient?.id,
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        status: 'draft',
        items,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        total_cbm: totalCbm,
      });

      if (result) {
        const blob = await exportQuotationToExcel({
          quotation: {
            reference_number: referenceNumber,
            customer_name: customerName,
            items,
            subtotal,
            vat_amount: vatAmount,
            total_amount: totalAmount,
          },
        });

        const filename = `Nammos_Quotation_${customerName}_${referenceNumber}.xlsx`;
        downloadBlob(blob, filename);

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
    if (items.length === 0) return;

    const referenceNumber = `NQ-${Date.now().toString().slice(-6)}`;

    const blob = await exportQuotationToExcel({
      quotation: {
        reference_number: referenceNumber,
        customer_name: customerName || 'Customer',
        items,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
      },
    });

    const filename = `Nammos_Quotation_${customerName || 'Draft'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadBlob(blob, filename);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-nammos-cream">
            New Quotation
          </h1>
          <p className="text-nammos-muted">
            Create a new furniture quotation
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
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-lg font-bold"
                        onClick={() => setCurrentQuantity(Math.max(1, currentQuantity - 1))}
                        disabled={currentQuantity <= 1}
                      >
                        −
                      </Button>
                      <Input
                        id="quantity"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={currentQuantity === 0 ? '' : currentQuantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setCurrentQuantity(0);
                          } else {
                            const num = parseInt(val);
                            if (!isNaN(num) && num >= 0) {
                              setCurrentQuantity(num);
                            }
                          }
                        }}
                        onBlur={() => {
                          if (currentQuantity < 1) setCurrentQuantity(1);
                        }}
                        className="w-20 bg-nammos-dark border-border text-center text-lg font-medium"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-lg font-bold"
                        onClick={() => setCurrentQuantity(currentQuantity + 1)}
                      >
                        +
                      </Button>
                    </div>
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
                  className="w-full"
                  disabled={items.length === 0 || !customerName || saving}
                  onClick={handleSaveDraft}
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  disabled={items.length === 0 || !customerName || saving}
                  onClick={handleSaveAndExport}
                >
                  <Download className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save & Export'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={items.length === 0}
                  onClick={handleExportExcel}
                >
                  <Download className="h-4 w-4" />
                  Export Only
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
