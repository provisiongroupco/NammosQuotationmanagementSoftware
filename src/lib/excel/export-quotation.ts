import ExcelJS from 'exceljs';
import type { QuotationItem, Annotation } from '@/types';

interface ExportOptions {
  quotation: {
    reference_number: string;
    customer_name: string;
    items: QuotationItem[];
    subtotal: number;
    vat_amount: number;
    total_amount: number;
  };
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; extension: 'jpeg' | 'png' | 'gif' } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const mimeType = blob.type;
    let extension: 'jpeg' | 'png' | 'gif' = 'jpeg';
    if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('gif')) extension = 'gif';

    return { base64, extension };
  } catch {
    return null;
  }
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function createAnnotatedImage(
  productImageUrl: string,
  annotations: Annotation[]
): Promise<{ base64: string; extension: 'png' } | null> {
  if (annotations.length === 0) {
    return fetchImageAsBase64(productImageUrl) as Promise<{ base64: string; extension: 'png' } | null>;
  }

  const productImg = await loadImage(productImageUrl);
  if (!productImg) return null;

  const swatchSize = 70;
  const labelWidth = 130;
  const rightPanelWidth = labelWidth + swatchSize + 40;
  const productAreaWidth = 300;
  const canvasWidth = productAreaWidth + rightPanelWidth;
  const minCanvasHeight = 350;
  const canvasHeight = Math.max(minCanvasHeight, annotations.length * (swatchSize + 15) + 40);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const scale = Math.min(productAreaWidth / productImg.width, canvasHeight / productImg.height) * 0.9;
  const imgWidth = productImg.width * scale;
  const imgHeight = productImg.height * scale;
  const imgX = (productAreaWidth - imgWidth) / 2;
  const imgY = (canvasHeight - imgHeight) / 2;

  ctx.drawImage(productImg, imgX, imgY, imgWidth, imgHeight);

  const sortedAnnotations = [...annotations].sort((a, b) => a.y - b.y);

  const swatchImages: (HTMLImageElement | null)[] = await Promise.all(
    sortedAnnotations.map((ann) => loadImage(ann.material.swatch_image_url))
  );

  const annotationSpacing = Math.max(swatchSize + 10, (canvasHeight - 40) / Math.max(1, sortedAnnotations.length));
  const startY = (canvasHeight - (sortedAnnotations.length - 1) * annotationSpacing) / 2;

  for (let i = 0; i < sortedAnnotations.length; i++) {
    const ann = sortedAnnotations[i];
    const swatchImg = swatchImages[i];

    const pointX = (ann.x / 100) * productAreaWidth;
    const pointY = (ann.y / 100) * canvasHeight;

    const rightX = productAreaWidth + 20;
    const rightY = startY + i * annotationSpacing;

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pointX, pointY);

    const controlX = productAreaWidth - 20;
    ctx.quadraticCurveTo(controlX, pointY, controlX, rightY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();

    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
    ctx.fill();

    const swatchX = rightX;
    const swatchY = rightY - swatchSize / 2;

    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);

    if (swatchImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(swatchX + swatchSize / 2, swatchY + swatchSize / 2, swatchSize / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(swatchImg, swatchX, swatchY, swatchSize, swatchSize);
      ctx.restore();

      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(swatchX + swatchSize / 2, swatchY + swatchSize / 2, swatchSize / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const typeColors: Record<string, string> = {
        fabric: '#8B7355',
        leather: '#654321',
        wood: '#DEB887',
        metal: '#C0C0C0',
        glass: '#E8E8E8',
        stone: '#808080',
      };
      ctx.fillStyle = typeColors[ann.material.type] || '#D3D3D3';
      ctx.beginPath();
      ctx.arc(swatchX + swatchSize / 2, swatchY + swatchSize / 2, swatchSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(swatchX + swatchSize / 2, swatchY + swatchSize / 2, swatchSize / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();
    }

    const textX = swatchX + swatchSize + 8;
    const textY = rightY;

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 11px Arial';
    ctx.textBaseline = 'middle';

    const materialName = ann.material.name.toUpperCase();
    const words = materialName.split(' ');
    const lineHeight = 13;

    if (words.length > 1 && ctx.measureText(materialName).width > labelWidth - 10) {
      const midPoint = Math.ceil(words.length / 2);
      const line1 = words.slice(0, midPoint).join(' ');
      const line2 = words.slice(midPoint).join(' ');
      ctx.fillText(line1, textX, textY - lineHeight / 2, labelWidth - 10);
      ctx.fillText(line2, textX, textY + lineHeight / 2, labelWidth - 10);
    } else {
      ctx.fillText(materialName, textX, textY, labelWidth - 10);
    }

    ctx.font = '9px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(ann.material.code, textX, textY + 16, labelWidth - 10);
  }

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];

  return { base64, extension: 'png' };
}

function getMaterialSpecs(annotations: Annotation[]): string {
  if (annotations.length === 0) return 'Standard';
  return annotations
    .map((ann) => `${ann.part_name}: ${ann.material.name} (${ann.material.code})`)
    .join('\n');
}

function copyRowStyle(sourceRow: ExcelJS.Row, targetRow: ExcelJS.Row) {
  targetRow.height = sourceRow.height;

  for (let col = 1; col <= 11; col++) {
    const sourceCell = sourceRow.getCell(col);
    const targetCell = targetRow.getCell(col);

    if (sourceCell.style) {
      targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
    }
  }
}

export async function exportQuotationToExcel({ quotation }: ExportOptions): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  const templateResponse = await fetch('/templates/Nammos Style 2 Quotation Template (1).xlsx');
  if (templateResponse.ok) {
    const templateBuffer = await templateResponse.arrayBuffer();
    await workbook.xlsx.load(templateBuffer);
  } else {
    workbook.addWorksheet('Quotation');
  }

  const worksheet = workbook.worksheets[0];

  worksheet.getRow(2).getCell(1).value = `${quotation.reference_number} - ${quotation.customer_name}`;

  const templateRow = worksheet.getRow(3);
  const dataStartRow = 3;

  for (let i = 0; i < quotation.items.length; i++) {
    const item = quotation.items[i];
    const rowNum = dataStartRow + i;

    if (i > 0) {
      worksheet.insertRow(rowNum, []);
      copyRowStyle(templateRow, worksheet.getRow(rowNum));
    }

    const row = worksheet.getRow(rowNum);
    const baseHeight = 260;
    const heightPerAnnotation = 60;
    const dynamicHeight = Math.max(baseHeight, item.annotations.length * heightPerAnnotation + 80);
    row.height = dynamicHeight;

    if (item.product.image_url) {
      const imageData = await createAnnotatedImage(item.product.image_url, item.annotations);
      if (imageData) {
        const imageId = workbook.addImage({
          base64: imageData.base64,
          extension: imageData.extension,
        });
        const imgHeight = Math.max(250, item.annotations.length * 55 + 60);
        worksheet.addImage(imageId, {
          tl: { col: 1.05, row: rowNum - 0.95 },
          ext: { width: 400, height: imgHeight },
        });
      }
    }

    row.getCell(3).value = item.product.name;

    const dims = item.product.dimensions.split('×');
    const dimText = dims.length === 3
      ? `W ${dims[0]} x D ${dims[1]} x H ${dims[2]} cm`
      : `${item.product.dimensions} cm`;
    row.getCell(4).value = `${item.product.category}\n${dimText}`;

    row.getCell(5).value = item.quantity;

    row.getCell(6).value = getMaterialSpecs(item.annotations);

    row.getCell(7).value = item.cbm;

    row.getCell(8).value = item.total_cbm;

    row.getCell(9).value = item.unit_price;

    row.getCell(10).value = item.total_price;
  }

  const summaryStartRow = dataStartRow + quotation.items.length;

  const subtotalRow = worksheet.getRow(summaryStartRow);
  subtotalRow.getCell(9).value = 'Subtotal:';
  subtotalRow.getCell(10).value = quotation.subtotal;

  const vatRow = worksheet.getRow(summaryStartRow + 1);
  vatRow.getCell(1).value = 'VAT 5%';
  vatRow.getCell(10).value = quotation.vat_amount;

  const totalRow = worksheet.getRow(summaryStartRow + 2);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(10).value = quotation.total_amount;

  worksheet.pageSetup.printArea = `A1:K${summaryStartRow + 2}`;
  worksheet.pageSetup.fitToPage = true;
  worksheet.pageSetup.fitToWidth = 1;
  worksheet.pageSetup.fitToHeight = 0;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
