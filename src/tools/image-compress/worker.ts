/** image-compress worker: JPG / PNG / WebP / AVIF in, any of those out. Runs off the main thread. */
import { serve } from "../image-shared/run-job";

serve(["jpg", "png", "webp", "avif"]);
