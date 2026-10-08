import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// Railway Bucket stellt diese Variablen per Reference bereit:
// BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION, ENDPOINT
const env = process.env;
const bucket = env.BUCKET || env.S3_BUCKET || env.AWS_S3_BUCKET_NAME;
const endpoint = env.ENDPOINT || env.S3_ENDPOINT || env.AWS_ENDPOINT_URL;
const accessKeyId = env.ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
const secretAccessKey = env.SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY;
const region = env.REGION || env.AWS_REGION || env.AWS_DEFAULT_REGION || 'auto';

const client =
  bucket && endpoint && accessKeyId && secretAccessKey
    ? new S3Client({
        endpoint,
        region,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      })
    : null;

export function hasStorage() {
  return Boolean(client);
}

export async function putObject(key, body, contentType) {
  if (!client) throw new Error('Railway Bucket ist nicht konfiguriert');
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

export async function getObject(key) {
  if (!client) throw new Error('Railway Bucket ist nicht konfiguriert');
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteObject(key) {
  if (!client) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
