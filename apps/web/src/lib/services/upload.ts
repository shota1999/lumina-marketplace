import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { getS3Client, S3_BUCKET } from '@/lib/s3';

export async function generatePresignedUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const s3 = getS3Client();

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  const endpoint = process.env['S3_ENDPOINT'];
  const publicUrl = endpoint
    ? `${endpoint}/${S3_BUCKET}/${key}`
    : `https://${S3_BUCKET}.s3.${process.env['S3_REGION'] ?? 'us-east-1'}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl };
}

export async function deleteObject(key: string): Promise<void> {
  const s3 = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3.send(command);
}
