'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Search, FileText, MoreHorizontal, Download, Trash2, Loader2, Pencil, Eye, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { Quotation } from '@/types';

type QuotationWithCount = Quotation & { items_count: number };
import { getQuotations, deleteQuotation, updateQuotationStatus, getQuotationById } from '@/lib/supabase/queries';
import { exportQuotationToExcel, downloadBlob } from '@/lib/excel/export-quotation';

const statusColors = {
  draft: 'bg-nammos-muted/20 text-nammos-muted',
  sent: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-success/20 text-success',
  rejected: 'bg-destructive/20 text-destructive',
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    async function fetchQuotations() {
      setLoading(true);
      const data = await getQuotations();
      setQuotations(data);
      setLoading(false);
    }
    fetchQuotations();
  }, []);

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, status: Quotation['status']) => {
    const success = await updateQuotationStatus(id, status);
    if (success) {
      setQuotations(quotations.map((q) => (q.id === id ? { ...q, status } : q)));
    }
  };

  const handleDelete = async () => {
    if (!quotationToDelete) return;
    const success = await deleteQuotation(quotationToDelete);
    if (success) {
      setQuotations(quotations.filter((q) => q.id !== quotationToDelete));
    }
    setDeleteDialogOpen(false);
    setQuotationToDelete(null);
  };

  const handlePreview = async (quotationId: string) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    const quotation = await getQuotationById(quotationId);
    setPreviewQuotation(quotation);
    setPreviewLoading(false);
  };

  const handleExportExcel = async (quotationId: string) => {
    const quotation = await getQuotationById(quotationId);
    if (!quotation) return;

    const blob = await exportQuotationToExcel({
      quotation: {
        reference_number: quotation.reference_number,
        customer_name: quotation.customer_name,
        items: quotation.items,
        subtotal: quotation.subtotal,
        vat_amount: quotation.vat_amount,
        total_amount: quotation.total_amount,
      },
    });

    const filename = `Nammos_Quotation_${quotation.customer_name}_${quotation.reference_number}.xlsx`;
    downloadBlob(blob, filename);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMaterialSpecifications = (annotations: Quotation['items'][0]['annotations']) => {
    if (annotations.length === 0) return 'Standard';
    return annotations
      .map((ann, index) => `${index + 1}. ${ann.part_name}: ${ann.material.name}`)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nammos-cream">
            Quotations
          </h1>
          <p className="text-nammos-muted mt-1">
            Manage and track your quotations
          </p>
        </div>
        <Link href="/quotations/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nammos-muted" />
          <Input
            placeholder="Search by reference or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-nammos-charcoal border-border"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'All Status'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>All Status</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter('draft')}>Draft</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('sent')}>Sent</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('approved')}>Approved</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('rejected')}>Rejected</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border border-border bg-nammos-charcoal overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-nammos-muted">Reference</TableHead>
              <TableHead className="text-nammos-muted">Customer</TableHead>
              <TableHead className="text-nammos-muted">Items</TableHead>
              <TableHead className="text-nammos-muted">CBM</TableHead>
              <TableHead className="text-nammos-muted">Total</TableHead>
              <TableHead className="text-nammos-muted">Status</TableHead>
              <TableHead className="text-nammos-muted">Date</TableHead>
              <TableHead className="text-nammos-muted w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-nammos-muted" />
                    <span className="text-nammos-muted">Loading quotations...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-nammos-muted" />
                    <span className="text-nammos-muted">
                      {search || statusFilter ? 'No quotations found' : 'No quotations yet'}
                    </span>
                    {!search && !statusFilter && (
                      <Link href="/quotations/new">
                        <Button variant="outline" size="sm" className="mt-2">
                          Create your first quotation
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotations.map((quotation) => (
                <TableRow
                  key={quotation.id}
                  className="border-border hover:bg-nammos-dark/50 cursor-pointer"
                  onClick={() => handlePreview(quotation.id)}
                >
                  <TableCell className="font-medium text-nammos-cream">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {quotation.reference_number}
                    </div>
                  </TableCell>
                  <TableCell className="text-nammos-cream">
                    {quotation.customer_name}
                  </TableCell>
                  <TableCell className="text-nammos-muted">
                    {quotation.items_count} items
                  </TableCell>
                  <TableCell className="text-nammos-muted">
                    {quotation.total_cbm.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    AED {quotation.total_amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`capitalize ${
                        statusColors[quotation.status as keyof typeof statusColors]
                      }`}
                    >
                      {quotation.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-nammos-muted">
                    {formatDate(quotation.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePreview(quotation.id); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/quotations/${quotation.id}`} onClick={(e) => e.stopPropagation()}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleExportExcel(quotation.id); }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(quotation.id, 'sent'); }}
                          disabled={quotation.status === 'sent'}
                        >
                          Mark as Sent
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(quotation.id, 'approved'); }}
                          disabled={quotation.status === 'approved'}
                        >
                          Mark as Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(quotation.id, 'rejected'); }}
                          disabled={quotation.status === 'rejected'}
                        >
                          Mark as Rejected
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuotationToDelete(quotation.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewLoading ? (
            <>
              <DialogHeader>
                <DialogTitle>Loading Quotation...</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-nammos-muted" />
              </div>
            </>
          ) : previewQuotation ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">{previewQuotation.reference_number}</DialogTitle>
                    <p className="text-sm text-nammos-muted mt-1">
                      Created {formatDate(previewQuotation.created_at)}
                    </p>
                  </div>
                  <Badge className={`capitalize ${statusColors[previewQuotation.status]}`}>
                    {previewQuotation.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-nammos-dark rounded-lg">
                  <div>
                    <p className="text-sm text-nammos-muted">Customer</p>
                    <p className="font-medium text-nammos-cream">{previewQuotation.customer_name}</p>
                  </div>
                  {previewQuotation.customer_email && (
                    <div>
                      <p className="text-sm text-nammos-muted">Email</p>
                      <p className="text-nammos-cream">{previewQuotation.customer_email}</p>
                    </div>
                  )}
                  {previewQuotation.customer_phone && (
                    <div>
                      <p className="text-sm text-nammos-muted">Phone</p>
                      <p className="text-nammos-cream">{previewQuotation.customer_phone}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-medium text-nammos-cream mb-3">Items ({previewQuotation.items.length})</h3>
                  <div className="space-y-3">
                    {previewQuotation.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 p-4 bg-nammos-dark rounded-lg">
                        <div className="w-16 h-16 bg-nammos-charcoal rounded flex items-center justify-center overflow-hidden relative flex-shrink-0">
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
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-nammos-cream">{item.product.name}</h4>
                          <p className="text-sm text-nammos-muted">
                            {item.product.dimensions} | {item.cbm} CBM
                          </p>
                          <p className="text-sm text-primary mt-1 truncate">
                            {getMaterialSpecifications(item.annotations)}
                          </p>
                        </div>
                        <div className="text-center flex-shrink-0">
                          <p className="text-sm text-nammos-muted">Qty</p>
                          <p className="font-medium text-nammos-cream">{item.quantity}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-nammos-muted">Total</p>
                          <p className="font-medium text-primary">AED {item.total_price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-nammos-muted">Total CBM</span>
                    <span className="text-nammos-cream">{previewQuotation.total_cbm.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-nammos-muted">Subtotal</span>
                    <span className="text-nammos-cream">AED {previewQuotation.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-nammos-muted">VAT (5%)</span>
                    <span className="text-nammos-cream">AED {previewQuotation.vat_amount.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium text-nammos-cream">Total</span>
                    <span className="text-xl font-bold text-primary">
                      AED {previewQuotation.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleExportExcel(previewQuotation.id)}
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                  <Button asChild className="flex-1 gap-2">
                    <Link href={`/quotations/${previewQuotation.id}`}>
                      <Pencil className="h-4 w-4" />
                      Edit Quotation
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Quotation Not Found</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center h-64">
                <p className="text-nammos-muted">The quotation could not be loaded.</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
