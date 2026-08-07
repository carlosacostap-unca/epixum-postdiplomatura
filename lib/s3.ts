import { S3Client, PutObjectCommand, GetObjectCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  endpoint: process.env.IDRIVE_ENDPOINT,
  region: process.env.IDRIVE_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.IDRIVE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.IDRIVE_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // Needed for iDrive/MinIO
});

export async function configureBucketCors() {
    const bucketName = process.env.IDRIVE_BUCKET_NAME;
    if (!bucketName) throw new Error("Bucket name not configured");

    const corsRules = [
        {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"], // For development; restrict in production
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
        },
    ];

    try {
        const command = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: corsRules,
            },
        });

        await s3Client.send(command);
        console.log(`CORS configured successfully for bucket: ${bucketName}`);
        return true;
    } catch (error) {
        console.error("Error configuring CORS:", error);
        return false;
    }
}

export async function getPresignedUploadUrl(filename: string, fileType: string) {
  const bucketName = process.env.IDRIVE_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("Bucket name not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return { url, fields: { key: filename } };
}

export async function getPresignedDownloadUrl(filename: string) {
  const bucketName = process.env.IDRIVE_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("Bucket name not configured");
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: filename,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}
