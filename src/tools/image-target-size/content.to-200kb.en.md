---
title: "Compress a JPG to 200 KB | Eolietech"
description: "Bring photos under 200 KB for a forum, an older website or a lighter email, with plenty of detail left. JPG or WebP, up to 50 at a time, never uploaded."
h1: "Compress an image to 200 KB"
intro: "Forums, older content management systems and some upload forms stop at around 200 KB per image. That is enough for a photo that still looks good on a full laptop screen. Add your photos here and each one comes back under 200,000 bytes, compressed in your browser so nothing is uploaded."
howTo:
  - "Choose your photos or drop them on the box above. You can add up to 50 at a time."
  - "The size is already set to 200 KB. Type another number if the site gives a different limit."
  - "Leave the format on JPG for forums, email and older sites. Pick WebP only if the site accepts it."
  - "Check the weight and the size in pixels on each row and the total in the summary, then download the photos one by one or as a .zip."
faq:
  - q: "How sharp is a 200 KB photo?"
    a: "Sharp enough for most screens. A typical phone photo usually comes out somewhere around 1,600 to 2,200 px on its longest side, which fills a laptop screen. It is too small for a large print, so keep the original if you may want one."
  - q: "My JPG already weighs less than 200 KB. What happens to it?"
    a: "It is kept as it is, without being compressed again, so it loses no quality. Only the hidden metadata, such as GPS location and camera details, is removed, and the row says the image was already under the target."
  - q: "Can I use it for screenshots?"
    a: "Yes, but they become JPG or WebP. Text and sharp lines in a JPG can get faint smudges around them when the file has to shrink a lot. If the site accepts PNG, try the Compress images tool first, which keeps a screenshot as a lossless PNG, and come back here only if it is still too heavy."
  - q: "Is this the right page for emailing photos?"
    a: "It is when a service limits each attachment, because every photo ends up under the same 200 KB. To send a whole album, the page that resizes images for email keeps them at 1600 px and quality 85, which usually gives better-looking photos at a few hundred KB each."
  - q: "Should I pick WebP for my website?"
    a: "If your site accepts WebP, it is worth trying: at the same weight a WebP photo usually keeps a little more detail than a JPG. Some older content management systems and forums reject WebP uploads, so JPG is the safer choice when you are not sure."
ui:
  img.zipName: "images-200kb.zip"
---

## What 200 KB leaves you

Of the four sizes with their own page on this site, 200 KB is the most generous. A phone photo still has to be scaled down to reach it, though far less than for 20 or 50 KB. The result usually fills a laptop screen with no visible blocks, which suits a forum post, an article image on an older website or a photo shared in a group chat.

If a photo already fits at a quality between 40 and 92, it keeps every pixel and gets the highest quality that fits. If it does not, the tool scales it down to the largest size that fits at quality 40. Smaller photos often stay at their full size with a high quality, and JPGs already under 200 KB are kept as they are, with only their metadata removed.

## Many photos at once

You can add up to 50 photos at a time, and each one is handled on its own, so a busy landscape and a plain portrait each get the best result that fits. The summary shows the total weight before and after. Use Download all to get a single .zip, or download the photos you need one by one.

## How it works

Everything happens in a background worker inside this tab, with MozJPEG for JPG and libwebp for WebP, so the photos never leave your device. For an email full of holiday photos, [Resize images for email](/resize-image-for-email/) is usually the better fit. For a tighter limit, see [Compress an image to 100 KB](/compress-image-to-100kb/) or type any number in [Compress an image to a size in KB](/compress-image-to-kb/).
