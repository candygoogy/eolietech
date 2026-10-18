/** image-resize worker: JPG / PNG / WebP / AVIF in, resampled to the requested size, any of those out. */
import { serve } from "../image-shared/run-job";

serve(["jpg", "png", "webp", "avif"]);
