import { SCENE_BACKGROUND } from './sceneOpening';
import manifest from './scenePoster.manifest.json';

// The poster: a still of the live scene's opening frame, rendered on a real
// GPU by scripts/render-scene-poster.mjs, which writes the manifest. The
// scene holds that frame until it wakes, so the crossfade into the canvas
// shows one picture; touch devices never run the scene and keep this.
//
// Framing: the scene's camera has a fixed vertical field of view and looks
// at the black hole, so its frame at any viewport is the centre crop, one
// viewport-height tall, of a wider frame. The image is therefore laid out
// by height and centred (never object-fit), and each art-directed variant
// is at least as wide as the viewports its media query admits.

type PosterFile = { src: string; width: number; height: number; bytes: number };
type PosterVariant = {
  name: string;
  media: string | null;
  aspect: number;
  avif: PosterFile[];
  webp: PosterFile[];
};

const PERCENT = 100;
const SIZES_DECIMALS = 2;

const variants = manifest.variants as PosterVariant[];
const fallback = variants[variants.length - 1];

const srcSet = (files: PosterFile[]) => files.map((file) => `${file.src} ${file.width}w`).join(', ');
// laid out by height, the image is aspect x viewport height wide
const sizes = (variant: PosterVariant) => `${Number((variant.aspect * PERCENT).toFixed(SIZES_DECIMALS))}vh`;
const largest = (files: PosterFile[]) => files[files.length - 1];

export function ScenePoster() {
  const fallbackImage = largest(fallback.webp);
  return (
    <div
      aria-hidden="true"
      data-scene-poster=""
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: SCENE_BACKGROUND }}
    >
      <picture>
        {variants.flatMap((variant) =>
          (variant === fallback ? (['avif'] as const) : (['avif', 'webp'] as const)).map((format) => (
            <source
              key={`${variant.name}-${format}`}
              media={variant.media ?? undefined}
              type={`image/${format}`}
              srcSet={srcSet(variant[format])}
              sizes={sizes(variant)}
              width={largest(variant[format]).width}
              height={largest(variant[format]).height}
            />
          )),
        )}
        <img
          src={fallbackImage.src}
          srcSet={srcSet(fallback.webp)}
          sizes={sizes(fallback)}
          width={fallbackImage.width}
          height={fallbackImage.height}
          alt=""
          fetchPriority="high"
          // a synchronous decode would hold the first paint (and the heading) back
          decoding="async"
          draggable={false}
          className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-1/2 select-none"
        />
      </picture>
    </div>
  );
}
