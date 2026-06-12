import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

export interface UploadedImageUrls {
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: this.configService.get<string>("aws.region") ?? "default",
      endpoint: this.configService.get<string>("aws.endpoint"),

      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>("aws.accessKeyId") ?? "",
        secretAccessKey:
          this.configService.get<string>("aws.secretAccessKey") ?? "",
      },
    });
    this.bucket = this.configService.get<string>("aws.s3BucketImages") ?? "";
  }

  private getUrl(key: string): string {
    return `${this.bucket}.${this.configService.get<string>(
      "aws.endpoint",
    )}//${key}`;
  }
  private async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType = "image/webp",
  ): Promise<string> {
    const result = await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    console.log(result);
    return this.getUrl(key);
  }

  async uploadImage(file: Express.Multer.File): Promise<UploadedImageUrls> {
    const id = uuidv4();
    const prefix = `products/${id}`;

    const [thumbnail, medium, large, original] = await Promise.all([
      sharp(file.buffer)
        .resize(150, 150, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(file.buffer)
        .resize(500, 500, { fit: "inside" })
        .webp({ quality: 85 })
        .toBuffer(),
      sharp(file.buffer)
        .resize(1200, 1200, { fit: "inside" })
        .webp({ quality: 90 })
        .toBuffer(),
      sharp(file.buffer).webp({ quality: 95 }).toBuffer(),
    ]);

    const [thumbnailUrl, mediumUrl, largeUrl, originalUrl] = await Promise.all([
      this.uploadBuffer(thumbnail, `${prefix}/thumbnail.webp`),
      this.uploadBuffer(medium, `${prefix}/medium.webp`),
      this.uploadBuffer(large, `${prefix}/large.webp`),
      this.uploadBuffer(original, `${prefix}/original.webp`),
    ]);

    return {
      original: originalUrl,
      thumbnail: thumbnailUrl,
      medium: mediumUrl,
      large: largeUrl,
    };
  }

  async uploadImages(
    files: Express.Multer.File[],
  ): Promise<UploadedImageUrls[]> {
    return Promise.all(files.map((file) => this.uploadImage(file)));
  }
  async deleteImage(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }
}
