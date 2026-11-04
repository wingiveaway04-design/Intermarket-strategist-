-- Broaden supported chart-image uploads while keeping SVG excluded from public image storage.
-- Supabase Free projects support a maximum global upload size of 50 MB.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/heic',
      'image/heif',
      'image/bmp',
      'image/tiff',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ]
where id in ('trade-journal', 'public-trade-images');
