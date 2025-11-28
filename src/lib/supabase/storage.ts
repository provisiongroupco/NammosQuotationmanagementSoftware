import { createClient } from './client';

export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient();

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from('images').getPublicUrl(filePath);

  return data.publicUrl;
}

export async function uploadMaterialSwatch(file: File): Promise<string> {
  const supabase = createClient();

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `materials/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading swatch:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from('images').getPublicUrl(filePath);

  return data.publicUrl;
}

export async function deleteImage(url: string): Promise<boolean> {
  const supabase = createClient();

  const path = url.split('/images/')[1];
  if (!path) return false;

  const { error } = await supabase.storage.from('images').remove([path]);

  if (error) {
    console.error('Error deleting image:', error);
    return false;
  }

  return true;
}
