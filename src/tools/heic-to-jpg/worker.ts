/**
 * heic-to-jpg worker. HEIC/HEIF is decoded by heic-to (./heic.ts) and encoded with MozJPEG (or
 * oxipng for PNG) in this worker. Files that are really JPEG/PNG/WebP/AVIF despite a .heic name are
 * decoded directly.
 */
import { serve } from "../image-shared/run-job";
import { decodeHeic } from "./heic";

serve(["heic", "jpg", "png", "webp", "avif"], decodeHeic);
