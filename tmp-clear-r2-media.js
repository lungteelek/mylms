const path = require('path');
require(path.join(__dirname, 'backend/node_modules/dotenv')).config({ path: path.join(__dirname, 'backend/.env') });
const { DeleteObjectCommand, ListObjectsV2Command, S3Client } = require(path.join(__dirname, 'backend/node_modules/@aws-sdk/client-s3'));

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const bucket = process.env.CLOUDFLARE_R2_BUCKET || '';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';

if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2 credentials');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  const prefix = 'media/';
  const keys = [];
  let continuationToken;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const item of response.Contents || []) {
      if (item.Key) keys.push(item.Key);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  for (const key of keys) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`deleted ${key}`);
  }

  console.log(`deleted ${keys.length} objects under ${prefix}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
