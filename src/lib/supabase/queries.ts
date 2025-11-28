import { createClient as createSupabaseClient } from './client';
import type { Database } from './database.types';
import type { Product, Material, AnnotatablePart, MaterialType, Client, Quotation, QuotationItem } from '@/types';

type DbProduct = Database['public']['Tables']['products']['Row'];
type DbMaterial = Database['public']['Tables']['materials']['Row'];
type DbAnnotatablePart = Database['public']['Tables']['annotatable_parts']['Row'];

function transformProduct(
  dbProduct: DbProduct,
  parts: DbAnnotatablePart[]
): Product {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    category: dbProduct.category,
    base_price: dbProduct.base_price,
    dimensions: dbProduct.dimensions || '',
    cbm: dbProduct.cbm || 0,
    image_url: dbProduct.image_url || '',
    annotatable_parts: parts.map((part) => ({
      id: part.id,
      name: part.name,
      x: part.x,
      y: part.y,
      width: part.width,
      height: part.height,
      allowed_material_types: part.allowed_material_types as MaterialType[],
    })),
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at,
  };
}

function transformMaterial(dbMaterial: DbMaterial): Material {
  return {
    id: dbMaterial.id,
    name: dbMaterial.name,
    code: dbMaterial.code,
    type: dbMaterial.type,
    swatch_image_url: dbMaterial.swatch_image_url || '',
    price_uplift: dbMaterial.price_uplift,
    supplier: dbMaterial.supplier || undefined,
    availability: dbMaterial.availability,
    tags: dbMaterial.tags || [],
    created_at: dbMaterial.created_at,
    updated_at: dbMaterial.updated_at,
  };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = createSupabaseClient();

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (productsError) {
    console.error('Error fetching products:', productsError);
    return [];
  }

  const { data: parts, error: partsError } = await supabase
    .from('annotatable_parts')
    .select('*');

  if (partsError) {
    console.error('Error fetching parts:', partsError);
    return [];
  }

  return products.map((product) =>
    transformProduct(
      product,
      parts.filter((part) => part.product_id === product.id)
    )
  );
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createSupabaseClient();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return null;
  }

  const { data: parts, error: partsError } = await supabase
    .from('annotatable_parts')
    .select('*')
    .eq('product_id', id);

  if (partsError) {
    console.error('Error fetching parts:', partsError);
    return null;
  }

  return transformProduct(product, parts || []);
}

export async function getMaterials(): Promise<Material[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('type')
    .order('name');

  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }

  return data.map(transformMaterial);
}

export async function getMaterialsByType(type: MaterialType): Promise<Material[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('type', type)
    .order('name');

  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }

  return data.map(transformMaterial);
}

export async function searchMaterials(
  query: string,
  options?: {
    tags?: string[];
    types?: MaterialType[];
    limit?: number;
  }
): Promise<Material[]> {
  const supabase = createSupabaseClient();

  let queryBuilder = supabase.from('materials').select('*');

  if (query.trim()) {
    const searchTerm = `%${query.trim()}%`;
    queryBuilder = queryBuilder.or(
      `name.ilike.${searchTerm},code.ilike.${searchTerm},supplier.ilike.${searchTerm}`
    );
  }

  if (options?.types && options.types.length > 0) {
    queryBuilder = queryBuilder.in('type', options.types);
  }

  if (options?.tags && options.tags.length > 0) {
    queryBuilder = queryBuilder.overlaps('tags', options.tags);
  }

  queryBuilder = queryBuilder.order('name');

  if (options?.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching materials:', error);
    return [];
  }

  return data.map(transformMaterial);
}

export async function getAllTags(): Promise<string[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('materials')
    .select('tags');

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  const allTags = new Set<string>();
  data.forEach((row) => {
    if (row.tags) {
      row.tags.forEach((tag: string) => allTags.add(tag));
    }
  });

  return Array.from(allTags).sort();
}

export async function createProduct(
  product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'annotatable_parts'>,
  parts?: Omit<AnnotatablePart, 'id'>[]
): Promise<Product | null> {
  const supabase = createSupabaseClient();

  const { data: newProduct, error: productError } = await supabase
    .from('products')
    .insert({
      name: product.name,
      category: product.category,
      base_price: product.base_price,
      dimensions: product.dimensions || null,
      cbm: product.cbm || null,
      image_url: product.image_url || null,
    })
    .select()
    .single();

  if (productError || !newProduct) {
    console.error('Error creating product:', productError);
    return null;
  }

  if (parts && parts.length > 0) {
    const { error: partsError } = await supabase.from('annotatable_parts').insert(
      parts.map((part) => ({
        product_id: newProduct.id,
        name: part.name,
        x: part.x,
        y: part.y,
        width: part.width,
        height: part.height,
        allowed_material_types: part.allowed_material_types,
      }))
    );

    if (partsError) {
      console.error('Error creating parts:', partsError);
    }
  }

  return getProductById(newProduct.id);
}

export async function createMaterial(
  material: Omit<Material, 'id' | 'created_at' | 'updated_at'>
): Promise<Material | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('materials')
    .insert({
      name: material.name,
      code: material.code,
      type: material.type,
      swatch_image_url: material.swatch_image_url || null,
      price_uplift: material.price_uplift,
      supplier: material.supplier || null,
      availability: material.availability,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating material:', error);
    return null;
  }

  return transformMaterial(data);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    return false;
  }

  return true;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase.from('materials').delete().eq('id', id);

  if (error) {
    console.error('Error deleting material:', error);
    return false;
  }

  return true;
}

export async function getClients(): Promise<Client[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return data.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email || undefined,
    phone: client.phone || undefined,
    company: client.company || undefined,
    address: client.address || undefined,
    notes: client.notes || undefined,
    created_at: client.created_at,
    updated_at: client.updated_at,
  }));
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching client:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    company: data.company || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function createClient(
  client: Omit<Client, 'id' | 'created_at' | 'updated_at'>
): Promise<Client | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: client.name,
      email: client.email || null,
      phone: client.phone || null,
      company: client.company || null,
      address: client.address || null,
      notes: client.notes || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating client:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    company: data.company || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updateClient(
  id: string,
  client: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>
): Promise<Client | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: client.name,
      email: client.email || null,
      phone: client.phone || null,
      company: client.company || null,
      address: client.address || null,
      notes: client.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating client:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    company: data.company || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function deleteClient(id: string): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase.from('clients').delete().eq('id', id);

  if (error) {
    console.error('Error deleting client:', error);
    return false;
  }

  return true;
}

export async function getQuotations(): Promise<(Quotation & { items_count: number })[]> {
  const supabase = createSupabaseClient();

  const { data: quotations, error } = await supabase
    .from('quotations')
    .select('*, quotation_items(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotations:', error);
    return [];
  }

  return quotations.map((q) => ({
    id: q.id,
    reference_number: q.reference_number,
    client_id: q.client_id || undefined,
    customer_name: q.customer_name,
    customer_email: q.customer_email || undefined,
    customer_phone: q.customer_phone || undefined,
    status: q.status,
    items: [],
    items_count: (q.quotation_items as { count: number }[])?.[0]?.count || 0,
    subtotal: q.subtotal,
    vat_amount: q.vat_amount,
    total_amount: q.total_amount,
    total_cbm: q.total_cbm || 0,
    notes: q.notes || undefined,
    created_at: q.created_at,
    updated_at: q.updated_at,
  }));
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  const supabase = createSupabaseClient();

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .single();

  if (quotationError || !quotation) {
    console.error('Error fetching quotation:', quotationError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', id);

  if (itemsError) {
    console.error('Error fetching quotation items:', itemsError);
    return null;
  }

  const { data: annotations, error: annotationsError } = await supabase
    .from('annotations')
    .select('*')
    .in('quotation_item_id', items?.map((i) => i.id) || []);

  if (annotationsError) {
    console.error('Error fetching annotations:', annotationsError);
  }

  const quotationItems: QuotationItem[] = (items || []).map((item) => {
    const itemAnnotations = (annotations || [])
      .filter((a) => a.quotation_item_id === item.id)
      .map((a) => ({
        id: a.id,
        part_id: a.part_id,
        part_name: a.part_name,
        material_id: a.material_id,
        material: a.material_snapshot as unknown as Material,
        x: a.x,
        y: a.y,
      }));

    return {
      id: item.id,
      quotation_id: item.quotation_id,
      product_id: item.product_id,
      product: item.product_snapshot as unknown as Product,
      quantity: item.quantity,
      unit_price: item.unit_price,
      annotations: itemAnnotations,
      custom_dimensions: item.custom_dimensions || undefined,
      notes: item.notes || undefined,
      cbm: item.cbm || 0,
      total_cbm: item.total_cbm || 0,
      total_price: item.total_price,
    };
  });

  return {
    id: quotation.id,
    reference_number: quotation.reference_number,
    client_id: quotation.client_id || undefined,
    customer_name: quotation.customer_name,
    customer_email: quotation.customer_email || undefined,
    customer_phone: quotation.customer_phone || undefined,
    status: quotation.status,
    items: quotationItems,
    subtotal: quotation.subtotal,
    vat_amount: quotation.vat_amount,
    total_amount: quotation.total_amount,
    total_cbm: quotation.total_cbm || 0,
    notes: quotation.notes || undefined,
    created_at: quotation.created_at,
    updated_at: quotation.updated_at,
  };
}

export async function createQuotation(
  quotation: Omit<Quotation, 'id' | 'created_at' | 'updated_at'>
): Promise<Quotation | null> {
  const supabase = createSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: newQuotation, error: quotationError } = await supabase
    .from('quotations')
    .insert({
      reference_number: quotation.reference_number,
      client_id: quotation.client_id || null,
      customer_name: quotation.customer_name,
      customer_email: quotation.customer_email || null,
      customer_phone: quotation.customer_phone || null,
      status: quotation.status,
      subtotal: quotation.subtotal,
      vat_amount: quotation.vat_amount,
      total_amount: quotation.total_amount,
      total_cbm: quotation.total_cbm,
      notes: quotation.notes || null,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (quotationError || !newQuotation) {
    console.error('Error creating quotation:', quotationError);
    return null;
  }

  for (const item of quotation.items) {
    const { data: newItem, error: itemError } = await supabase
      .from('quotation_items')
      .insert({
        quotation_id: newQuotation.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cbm: item.cbm,
        total_cbm: item.total_cbm,
        total_price: item.total_price,
        custom_dimensions: item.custom_dimensions || null,
        notes: item.notes || null,
        product_snapshot: item.product as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (itemError || !newItem) {
      console.error('Error creating quotation item:', itemError);
      continue;
    }

    if (item.annotations && item.annotations.length > 0) {
      const { error: annotationsError } = await supabase
        .from('annotations')
        .insert(
          item.annotations.map((ann) => ({
            quotation_item_id: newItem.id,
            part_id: ann.part_id,
            part_name: ann.part_name,
            material_id: ann.material_id,
            x: ann.x,
            y: ann.y,
            material_snapshot: ann.material as unknown as Record<string, unknown>,
          }))
        );

      if (annotationsError) {
        console.error('Error creating annotations:', annotationsError);
      }
    }
  }

  return getQuotationById(newQuotation.id);
}

export async function updateQuotationStatus(
  id: string,
  status: Quotation['status']
): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('quotations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating quotation status:', error);
    return false;
  }

  return true;
}

export async function updateQuotation(
  id: string,
  quotation: Omit<Quotation, 'id' | 'created_at' | 'updated_at' | 'reference_number'>
): Promise<Quotation | null> {
  const supabase = createSupabaseClient();

  const { error: quotationError } = await supabase
    .from('quotations')
    .update({
      client_id: quotation.client_id || null,
      customer_name: quotation.customer_name,
      customer_email: quotation.customer_email || null,
      customer_phone: quotation.customer_phone || null,
      status: quotation.status,
      subtotal: quotation.subtotal,
      vat_amount: quotation.vat_amount,
      total_amount: quotation.total_amount,
      total_cbm: quotation.total_cbm,
      notes: quotation.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (quotationError) {
    console.error('Error updating quotation:', quotationError);
    return null;
  }

  const { data: existingItems } = await supabase
    .from('quotation_items')
    .select('id')
    .eq('quotation_id', id);

  if (existingItems && existingItems.length > 0) {
    await supabase
      .from('annotations')
      .delete()
      .in('quotation_item_id', existingItems.map((i) => i.id));
  }

  await supabase.from('quotation_items').delete().eq('quotation_id', id);

  for (const item of quotation.items) {
    const { data: newItem, error: itemError } = await supabase
      .from('quotation_items')
      .insert({
        quotation_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cbm: item.cbm,
        total_cbm: item.total_cbm,
        total_price: item.total_price,
        custom_dimensions: item.custom_dimensions || null,
        notes: item.notes || null,
        product_snapshot: item.product as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (itemError || !newItem) {
      console.error('Error creating quotation item:', itemError);
      continue;
    }

    if (item.annotations && item.annotations.length > 0) {
      const { error: annotationsError } = await supabase
        .from('annotations')
        .insert(
          item.annotations.map((ann) => ({
            quotation_item_id: newItem.id,
            part_id: ann.part_id,
            part_name: ann.part_name,
            material_id: ann.material_id,
            x: ann.x,
            y: ann.y,
            material_snapshot: ann.material as unknown as Record<string, unknown>,
          }))
        );

      if (annotationsError) {
        console.error('Error creating annotations:', annotationsError);
      }
    }
  }

  return getQuotationById(id);
}

export async function deleteQuotation(id: string): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { error } = await supabase.from('quotations').delete().eq('id', id);

  if (error) {
    console.error('Error deleting quotation:', error);
    return false;
  }

  return true;
}

export async function generateReferenceNumber(): Promise<string> {
  const supabase = createSupabaseClient();

  const year = new Date().getFullYear();
  const prefix = `NQ-${year}-`;

  const { data, error } = await supabase
    .from('quotations')
    .select('reference_number')
    .like('reference_number', `${prefix}%`)
    .order('reference_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error generating reference number:', error);
    return `${prefix}0001`;
  }

  if (!data || data.length === 0) {
    return `${prefix}0001`;
  }

  const lastNumber = parseInt(data[0].reference_number.replace(prefix, ''), 10);
  const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

  return `${prefix}${nextNumber}`;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalQuotations: number;
  approvedQuotations: number;
  pendingQuotations: number;
  revenueChange: number;
  quotationsChange: number;
  conversionChange: number;
  aovChange: number;
  totalCBM: number;
  avgCBMPerQuotation: number;
  totalItems: number;
  sentThisMonth: number;
  approvedThisMonth: number;
  rejectionRate: number;
  revenueTrend: { date: string; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
  topProducts: { name: string; count: number }[];
  popularMaterials: { name: string; type: string; count: number }[];
  topCustomers: { name: string; quotations: number; revenue: number }[];
}

export async function getAnalytics(): Promise<AnalyticsData | null> {
  const supabase = createSupabaseClient();

  try {
    const { data: quotations, error: quotationsError } = await supabase
      .from('quotations')
      .select('*');

    if (quotationsError) {
      console.error('Error fetching quotations for analytics:', quotationsError);
      return null;
    }

    const { data: items, error: itemsError } = await supabase
      .from('quotation_items')
      .select('*, quotation_id');

    if (itemsError) {
      console.error('Error fetching items for analytics:', itemsError);
    }

    const { data: annotations, error: annotationsError } = await supabase
      .from('annotations')
      .select('*');

    if (annotationsError) {
      console.error('Error fetching annotations for analytics:', annotationsError);
    }

    const approvedQuotations = quotations?.filter((q) => q.status === 'approved') || [];
    const totalRevenue = approvedQuotations.reduce((sum, q) => sum + q.total_amount, 0);
    const totalQuotations = quotations?.length || 0;
    const pendingQuotations = quotations?.filter((q) => q.status === 'draft').length || 0;
    const rejectedQuotations = quotations?.filter((q) => q.status === 'rejected').length || 0;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthQuotations = quotations?.filter((q) => {
      const d = new Date(q.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }) || [];

    const lastMonthQuotations = quotations?.filter((q) => {
      const d = new Date(q.created_at);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }) || [];

    const thisMonthRevenue = thisMonthQuotations
      .filter((q) => q.status === 'approved')
      .reduce((sum, q) => sum + q.total_amount, 0);

    const lastMonthRevenue = lastMonthQuotations
      .filter((q) => q.status === 'approved')
      .reduce((sum, q) => sum + q.total_amount, 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0;

    const quotationsChange = lastMonthQuotations.length > 0
      ? ((thisMonthQuotations.length - lastMonthQuotations.length) / lastMonthQuotations.length) * 100
      : thisMonthQuotations.length > 0 ? 100 : 0;

    const thisMonthApproved = thisMonthQuotations.filter((q) => q.status === 'approved').length;
    const lastMonthApproved = lastMonthQuotations.filter((q) => q.status === 'approved').length;
    const thisMonthConversion = thisMonthQuotations.length > 0
      ? (thisMonthApproved / thisMonthQuotations.length) * 100
      : 0;
    const lastMonthConversion = lastMonthQuotations.length > 0
      ? (lastMonthApproved / lastMonthQuotations.length) * 100
      : 0;
    const conversionChange = lastMonthConversion > 0
      ? thisMonthConversion - lastMonthConversion
      : thisMonthConversion;

    const thisMonthAOV = thisMonthApproved > 0 ? thisMonthRevenue / thisMonthApproved : 0;
    const lastMonthAOV = lastMonthApproved > 0 ? lastMonthRevenue / lastMonthApproved : 0;
    const aovChange = lastMonthAOV > 0
      ? ((thisMonthAOV - lastMonthAOV) / lastMonthAOV) * 100
      : thisMonthAOV > 0 ? 100 : 0;

    const totalCBM = quotations?.reduce((sum, q) => sum + (q.total_cbm || 0), 0) || 0;
    const avgCBMPerQuotation = totalQuotations > 0 ? totalCBM / totalQuotations : 0;
    const totalItems = items?.length || 0;

    const sentThisMonth = thisMonthQuotations.filter((q) => q.status === 'sent').length;
    const approvedThisMonth = thisMonthApproved;
    const rejectionRate = totalQuotations > 0
      ? (rejectedQuotations / totalQuotations) * 100
      : 0;

    const revenueTrend: { date: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      const month = d.getMonth();
      const year = d.getFullYear();

      const monthRevenue = (quotations || [])
        .filter((q) => {
          const qd = new Date(q.created_at);
          return qd.getMonth() === month && qd.getFullYear() === year && q.status === 'approved';
        })
        .reduce((sum, q) => sum + q.total_amount, 0);

      revenueTrend.push({ date: monthName, revenue: monthRevenue });
    }

    const statusBreakdown = [
      { status: 'draft', count: quotations?.filter((q) => q.status === 'draft').length || 0 },
      { status: 'sent', count: quotations?.filter((q) => q.status === 'sent').length || 0 },
      { status: 'approved', count: approvedQuotations.length },
      { status: 'rejected', count: rejectedQuotations },
    ];

    const productCounts: Record<string, number> = {};
    (items || []).forEach((item) => {
      const snapshot = item.product_snapshot as { name?: string } | null;
      const name = snapshot?.name || 'Unknown';
      productCounts[name] = (productCounts[name] || 0) + item.quantity;
    });

    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const materialCounts: Record<string, { type: string; count: number }> = {};
    (annotations || []).forEach((ann) => {
      const snapshot = ann.material_snapshot as { name?: string; type?: string } | null;
      const name = snapshot?.name || 'Unknown';
      const type = snapshot?.type || 'fabric';
      if (!materialCounts[name]) {
        materialCounts[name] = { type, count: 0 };
      }
      materialCounts[name].count++;
    });

    const popularMaterials = Object.entries(materialCounts)
      .map(([name, { type, count }]) => ({ name, type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const customerStats: Record<string, { quotations: number; revenue: number }> = {};
    (quotations || []).forEach((q) => {
      const name = q.customer_name;
      if (!customerStats[name]) {
        customerStats[name] = { quotations: 0, revenue: 0 };
      }
      customerStats[name].quotations++;
      if (q.status === 'approved') {
        customerStats[name].revenue += q.total_amount;
      }
    });

    const topCustomers = Object.entries(customerStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalQuotations,
      approvedQuotations: approvedQuotations.length,
      pendingQuotations,
      revenueChange,
      quotationsChange,
      conversionChange,
      aovChange,
      totalCBM,
      avgCBMPerQuotation,
      totalItems,
      sentThisMonth,
      approvedThisMonth,
      rejectionRate,
      revenueTrend,
      statusBreakdown,
      topProducts,
      popularMaterials,
      topCustomers,
    };
  } catch (error) {
    console.error('Error computing analytics:', error);
    return null;
  }
}
