-- 정총무 참가자 프로필 사진 Storage 설정
-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행하세요.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'participant-avatars',
  'participant-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow public read on participant avatars" ON storage.objects;
CREATE POLICY "Allow public read on participant avatars"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'participant-avatars');

DROP POLICY IF EXISTS "Allow public upload on participant avatars" ON storage.objects;
CREATE POLICY "Allow public upload on participant avatars"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'participant-avatars');

DROP POLICY IF EXISTS "Allow public update on participant avatars" ON storage.objects;
CREATE POLICY "Allow public update on participant avatars"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'participant-avatars')
WITH CHECK (bucket_id = 'participant-avatars');

DROP POLICY IF EXISTS "Allow public delete on participant avatars" ON storage.objects;
CREATE POLICY "Allow public delete on participant avatars"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'participant-avatars');
