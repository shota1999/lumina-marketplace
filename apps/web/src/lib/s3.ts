import { S3Client } from '@aws-sdk/client-s3';

function createS3Client(): S3Client {
  const region = process.env['S3_REGION'] ?? 'us-east-1';
  const endpoint = process.env['S3_ENDPOINT'];
  const accessKeyId = process.env['S3_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['S3_SECRET_ACCESS_KEY'];

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required');
  }

  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

let s3Client: S3Client | undefined;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
}

export const S3_BUCKET = process.env['S3_BUCKET'] ?? 'lumina-uploads';
