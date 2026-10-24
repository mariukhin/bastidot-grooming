export type UploadScope = 'pet' | 'avatar';

export type ImageSize = 'full' | 'preview';

export const SIZE_WIDTH: Record<ImageSize, number> = {
  full: 1200,
  preview: 400,
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export interface StoredImage {
  url: string;
  previewUrl: string;
}

export class UploadError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
