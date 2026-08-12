import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config/env";
import {
  DOWNLOAD_URL_TTL_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
} from "@/modules/content/domain/file-policy";

export class R2ConfigurationError extends Error {
  constructor(message = "Cloudflare R2 no esta habilitado.") {
    super(message);
    this.name = "R2ConfigurationError";
  }
}

export function isR2UploadEnabled() {
  return env.R2_UPLOADS_ENABLED && env.VERCEL_ENV !== "preview";
}

function getR2Configuration() {
  if (
    !isR2UploadEnabled() ||
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME
  ) {
    throw new R2ConfigurationError();
  }

  return {
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET_NAME,
  };
}

let r2Client: S3Client | undefined;

function getR2Client() {
  const configuration = getR2Configuration();

  if (!r2Client) {
    r2Client = new S3Client({
      endpoint: configuration.endpoint,
      region: "auto",
      credentials: {
        accessKeyId: configuration.accessKeyId,
        secretAccessKey: configuration.secretAccessKey,
      },
    });
  }

  return { client: r2Client, bucket: configuration.bucket };
}

function encodeCopySource(bucket: string, key: string) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${bucket}/${encodedKey}`;
}

export async function createPresignedUploadUrl(input: {
  key: string;
  contentType: string;
}) {
  const { client, bucket } = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
}

export async function headR2Object(key: string) {
  const { client, bucket } = getR2Client();
  return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

export async function copyR2Object(input: {
  sourceKey: string;
  destinationKey: string;
  sourceEtag: string;
  contentType: string;
  originalName: string;
}) {
  const { client, bucket } = getR2Client();
  const safeName = input.originalName
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .slice(0, 180);

  return client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: input.destinationKey,
      CopySource: encodeCopySource(bucket, input.sourceKey),
      CopySourceIfMatch: input.sourceEtag,
      MetadataDirective: "REPLACE",
      ContentType: input.contentType,
      ContentDisposition: `inline; filename="${safeName.replaceAll('"', "")}"`,
    }),
  );
}

export async function deleteR2Object(key: string) {
  const { client, bucket } = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createPresignedDownloadUrl(input: {
  key: string;
  originalName: string;
  contentType: string;
}) {
  const { client, bucket } = getR2Client();
  const safeName = input.originalName
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .slice(0, 180);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ResponseContentType: input.contentType,
    ResponseContentDisposition: `inline; filename="${safeName.replaceAll(
      '"',
      "",
    )}"`,
  });

  return getSignedUrl(client, command, {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });
}

