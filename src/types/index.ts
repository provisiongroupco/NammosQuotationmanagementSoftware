export interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  dimensions: string;
  cbm: number;
  image_url: string;
  annotatable_parts: AnnotatablePart[];
  created_at: string;
  updated_at: string;
}

export interface AnnotatablePart {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  allowed_material_types: MaterialType[];
}

export type MaterialType = 'fabric' | 'wood' | 'metal' | 'leather' | 'glass' | 'stone';

export interface Material {
  id: string;
  name: string;
  code: string;
  type: MaterialType;
  swatch_image_url: string;
  price_uplift: number;
  supplier?: string;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  reference_number: string;
  client_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  items: QuotationItem[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  total_cbm: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number;
  annotations: Annotation[];
  custom_dimensions?: string;
  notes?: string;
  cbm: number;
  total_cbm: number;
  total_price: number;
}

export interface Annotation {
  id: string;
  part_id: string;
  part_name: string;
  material_id: string;
  material: Material;
  x: number;
  y: number;
}

export interface ExcelQuotationRow {
  image: string;
  item_name: string;
  descriptions_size: string;
  quantity: number;
  material_specifications: string;
  cbm: number;
  total_cbm: number;
  price: number;
  total_amount: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
