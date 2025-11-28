-- Nammos Furniture Quotation System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  dimensions VARCHAR(50),
  cbm DECIMAL(6, 3) NOT NULL DEFAULT 0,
  image_url TEXT,
  annotatable_parts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials table
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('fabric', 'wood', 'metal', 'leather', 'glass', 'stone')),
  swatch_image_url TEXT,
  price_uplift DECIMAL(10, 2) NOT NULL DEFAULT 0,
  supplier VARCHAR(255),
  availability VARCHAR(20) NOT NULL DEFAULT 'in_stock' CHECK (availability IN ('in_stock', 'limited', 'out_of_stock')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotations table
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  sales_rep VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotation Items table
CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  annotations JSONB DEFAULT '[]'::jsonb,
  custom_dimensions VARCHAR(50),
  notes TEXT,
  cbm DECIMAL(6, 3) NOT NULL DEFAULT 0,
  total_cbm DECIMAL(6, 3) NOT NULL DEFAULT 0,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_materials_code ON materials(code);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_customer ON quotations(customer_name);
CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, restrict based on auth later)
CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all access to materials" ON materials FOR ALL USING (true);
CREATE POLICY "Allow all access to quotations" ON quotations FOR ALL USING (true);
CREATE POLICY "Allow all access to quotation_items" ON quotation_items FOR ALL USING (true);

-- Sample Data: Products
INSERT INTO products (name, category, base_price, dimensions, cbm, annotatable_parts) VALUES
('Dining Chair', 'Seating', 2500, '50×55×90', 0.25, '[
  {"id": "seat", "name": "Seat", "x": 30, "y": 40, "width": 40, "height": 20, "allowed_material_types": ["fabric", "leather"]},
  {"id": "back", "name": "Back", "x": 30, "y": 15, "width": 40, "height": 25, "allowed_material_types": ["fabric", "leather"]},
  {"id": "legs", "name": "Legs", "x": 25, "y": 70, "width": 50, "height": 25, "allowed_material_types": ["wood", "metal"]}
]'),
('Sofa 3-Seater', 'Seating', 8500, '220×95×85', 1.78, '[
  {"id": "cushions", "name": "Cushions", "x": 10, "y": 30, "width": 80, "height": 30, "allowed_material_types": ["fabric", "leather"]},
  {"id": "frame", "name": "Frame", "x": 10, "y": 65, "width": 80, "height": 20, "allowed_material_types": ["wood"]},
  {"id": "legs", "name": "Legs", "x": 15, "y": 85, "width": 70, "height": 10, "allowed_material_types": ["wood", "metal"]}
]'),
('Coffee Table', 'Tables', 3200, '120×60×45', 0.32, '[
  {"id": "top", "name": "Table Top", "x": 10, "y": 20, "width": 80, "height": 40, "allowed_material_types": ["wood", "glass", "stone"]},
  {"id": "legs", "name": "Legs", "x": 20, "y": 70, "width": 60, "height": 25, "allowed_material_types": ["wood", "metal"]}
]'),
('Dining Table', 'Tables', 6500, '200×100×75', 1.5, '[
  {"id": "top", "name": "Table Top", "x": 5, "y": 15, "width": 90, "height": 50, "allowed_material_types": ["wood", "glass", "stone"]},
  {"id": "legs", "name": "Legs", "x": 15, "y": 70, "width": 70, "height": 25, "allowed_material_types": ["wood", "metal"]}
]'),
('Armchair', 'Seating', 4200, '85×90×95', 0.73, '[
  {"id": "seat", "name": "Seat Cushion", "x": 20, "y": 45, "width": 60, "height": 25, "allowed_material_types": ["fabric", "leather"]},
  {"id": "back", "name": "Back", "x": 20, "y": 10, "width": 60, "height": 35, "allowed_material_types": ["fabric", "leather"]},
  {"id": "arms", "name": "Arms", "x": 5, "y": 30, "width": 90, "height": 20, "allowed_material_types": ["fabric", "leather", "wood"]},
  {"id": "legs", "name": "Legs", "x": 25, "y": 75, "width": 50, "height": 20, "allowed_material_types": ["wood", "metal"]}
]');

-- Sample Data: Materials
INSERT INTO materials (name, code, type, price_uplift, availability) VALUES
-- Fabrics
('Furla-42', 'FURLA-42', 'fabric', 350, 'in_stock'),
('Velvet Royal Blue', 'VEL-RB-01', 'fabric', 500, 'in_stock'),
('Linen Natural', 'LIN-NAT-03', 'fabric', 280, 'limited'),
('Cotton Blend Cream', 'COT-CR-01', 'fabric', 200, 'in_stock'),
('Boucle Ivory', 'BOU-IV-01', 'fabric', 650, 'in_stock'),
-- Woods
('Dark Brown Ash', 'WOOD-DBA-01', 'wood', 0, 'in_stock'),
('Natural Oak', 'WOOD-NOK-01', 'wood', 200, 'in_stock'),
('Walnut', 'WOOD-WAL-01', 'wood', 450, 'limited'),
('Ebony Black', 'WOOD-EBN-01', 'wood', 600, 'in_stock'),
-- Leather
('Italian Tan', 'LTH-IT-01', 'leather', 1200, 'in_stock'),
('Black Premium', 'LTH-BK-01', 'leather', 1000, 'in_stock'),
('Cognac', 'LTH-COG-01', 'leather', 1100, 'limited'),
-- Metal
('Brushed Gold', 'MTL-BGD-01', 'metal', 300, 'in_stock'),
('Matte Black', 'MTL-MBK-01', 'metal', 150, 'in_stock'),
('Chrome', 'MTL-CHR-01', 'metal', 200, 'in_stock'),
('Antique Brass', 'MTL-ABR-01', 'metal', 350, 'limited'),
-- Glass
('Clear Tempered', 'GLS-CLR-01', 'glass', 0, 'in_stock'),
('Smoked', 'GLS-SMK-01', 'glass', 300, 'in_stock'),
-- Stone
('Carrara Marble', 'STN-CRM-01', 'stone', 2500, 'limited'),
('Nero Marquina', 'STN-NMQ-01', 'stone', 2800, 'limited');
