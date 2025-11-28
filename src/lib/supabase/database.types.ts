export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          base_price: number;
          dimensions: string | null;
          cbm: number | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          base_price: number;
          dimensions?: string | null;
          cbm?: number | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          base_price?: number;
          dimensions?: string | null;
          cbm?: number | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      annotatable_parts: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          x: number;
          y: number;
          width: number;
          height: number;
          allowed_material_types: string[];
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          x: number;
          y: number;
          width: number;
          height: number;
          allowed_material_types: string[];
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          allowed_material_types?: string[];
        };
      };
      materials: {
        Row: {
          id: string;
          name: string;
          code: string;
          type: 'fabric' | 'leather' | 'wood' | 'metal' | 'glass' | 'stone';
          swatch_image_url: string | null;
          price_uplift: number;
          supplier: string | null;
          availability: 'in_stock' | 'limited' | 'out_of_stock';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          type: 'fabric' | 'leather' | 'wood' | 'metal' | 'glass' | 'stone';
          swatch_image_url?: string | null;
          price_uplift?: number;
          supplier?: string | null;
          availability?: 'in_stock' | 'limited' | 'out_of_stock';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          type?: 'fabric' | 'leather' | 'wood' | 'metal' | 'glass' | 'stone';
          swatch_image_url?: string | null;
          price_uplift?: number;
          supplier?: string | null;
          availability?: 'in_stock' | 'limited' | 'out_of_stock';
          created_at?: string;
          updated_at?: string;
        };
      };
      quotations: {
        Row: {
          id: string;
          reference_number: string;
          client_id: string | null;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          status: 'draft' | 'sent' | 'approved' | 'rejected';
          subtotal: number;
          vat_amount: number;
          total_amount: number;
          total_cbm: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_number: string;
          client_id?: string | null;
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          status?: 'draft' | 'sent' | 'approved' | 'rejected';
          subtotal: number;
          vat_amount: number;
          total_amount: number;
          total_cbm?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference_number?: string;
          client_id?: string | null;
          customer_name?: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          status?: 'draft' | 'sent' | 'approved' | 'rejected';
          subtotal?: number;
          vat_amount?: number;
          total_amount?: number;
          total_cbm?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotation_items: {
        Row: {
          id: string;
          quotation_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          cbm: number | null;
          total_cbm: number | null;
          total_price: number;
          custom_dimensions: string | null;
          notes: string | null;
          product_snapshot: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          product_id: string;
          quantity?: number;
          unit_price: number;
          cbm?: number | null;
          total_cbm?: number | null;
          total_price: number;
          custom_dimensions?: string | null;
          notes?: string | null;
          product_snapshot: Record<string, unknown>;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          cbm?: number | null;
          total_cbm?: number | null;
          total_price?: number;
          custom_dimensions?: string | null;
          notes?: string | null;
          product_snapshot?: Record<string, unknown>;
        };
      };
      annotations: {
        Row: {
          id: string;
          quotation_item_id: string;
          part_id: string;
          part_name: string;
          material_id: string;
          x: number;
          y: number;
          material_snapshot: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          quotation_item_id: string;
          part_id: string;
          part_name: string;
          material_id: string;
          x: number;
          y: number;
          material_snapshot: Record<string, unknown>;
        };
        Update: {
          id?: string;
          quotation_item_id?: string;
          part_id?: string;
          part_name?: string;
          material_id?: string;
          x?: number;
          y?: number;
          material_snapshot?: Record<string, unknown>;
        };
      };
    };
  };
};
