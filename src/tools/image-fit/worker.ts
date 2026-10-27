/**
 * image-fit worker: JPG / PNG / WebP / AVIF in; the whole photo scaled into a frame of the chosen
 * ratio over a solid, transparent or blurred background; JPG / PNG / WebP (or the original format) out.
 * Decoding (EXIF orientation applied), encoding (no metadata) and errors come from the shared runJob.
 */
import { resizeTo } from "../image-shared/codecs";
import { serve } from "../image-shared/run-job";
import {
  BLUR_DARKEN,
  blurPlan,
  boxBlur,
  coverCrop,
  cropPixels,
  darken,
  drawOver,
  fill,
  flattenOnto,
  layout,
  type FitSpec,
} from "./fit";

/** The photo scaled to cover a w x h frame, blurred and darkened (small, then enlarged: fast at any size). */
async function blurredBackground(img: ImageData, width: number, height: number): Promise<ImageData> {
  const plan = blurPlan(width, height);
  const c = coverCrop(img.width, img.height, plan.width, plan.height);
  const part = new ImageData(cropPixels(img, c.x, c.y, c.width, c.height), c.width, c.height);
  const small = await resizeTo(part, plan.width, plan.height);
  // A transparent photo gets a white base first, so the background is always opaque.
  flattenOnto(small.data, [255, 255, 255]);
  boxBlur(small, plan.radius);
  darken(small.data, BLUR_DARKEN);
  return resizeTo(small, width, height);
}

serve(["jpg", "png", "webp", "avif"], undefined, async (img, settings) => {
  const spec = (settings as typeof settings & { fit: FitSpec }).fit;
  const at = layout(img.width, img.height, spec.aspect, spec.width);
  const photo = await resizeTo(img, at.photoWidth, at.photoHeight);
  let frame: ImageData;
  if (spec.background.kind === "blur") {
    frame = await blurredBackground(img, at.frameWidth, at.frameHeight);
  } else {
    frame = new ImageData(at.frameWidth, at.frameHeight);
    if (spec.background.kind === "color") fill(frame.data, spec.background.rgb);
  }
  drawOver(frame, photo, at.x, at.y);
  return frame;
});
