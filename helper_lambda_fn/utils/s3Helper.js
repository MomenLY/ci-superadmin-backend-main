import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_S3_KEY = process.env.AWS_S3_KEY;
const AWS_S3_REGION = process.env.AWS_S3_REGION;
const AWS_S3_SECRET = process.env.AWS_S3_SECRET;

const s3 = new S3Client({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_S3_KEY,
    secretAccessKey: AWS_S3_SECRET
  }
});

export const putObject = (key, body, type) => {
  const uploadParams = {
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: type,
    Body: body
  };

  const uploadCommand = new PutObjectCommand(uploadParams);
  return s3.send(uploadCommand);
}