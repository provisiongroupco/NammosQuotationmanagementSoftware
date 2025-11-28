# Nammos Quotation System

## Project Overview
Tablet-optimized web application for digitizing Nammos furniture quotation workflow.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Image Annotation**: SVG-based interactive parts (Fabric.js available if needed)
- **Excel Export**: ExcelJS (supports image embedding)

## Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint check
```

## Project Structure
```
src/
├── app/(dashboard)/     # Dashboard routes (products, materials, quotations)
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── product-selector/
│   ├── annotation-canvas/
│   └── quotation-builder/
├── lib/
│   ├── supabase/        # Supabase client + schema
│   └── excel/           # Excel export utilities
└── types/               # TypeScript definitions
```

## Brand Colors
- Primary Gold: #C4A962
- Cream: #F2EADE
- Dark: #1a1a1a
- Charcoal: #2d2d2d

## Database Setup
1. Create Supabase project at supabase.com
2. Copy `.env.local.example` to `.env.local` and fill in credentials
3. Run `src/lib/supabase/schema.sql` in Supabase SQL Editor

## Key Features
1. **Visual Annotation**: Click furniture parts → assign materials
2. **Excel Export**: Images embedded in cells, VAT calculation
3. **Material Library**: Fabrics, woods, leathers, metals with price uplifts
