/**
 * Utility to preload and decode an image into browser cache
 */
export function preloadImage(url: string, noReferrer: boolean = false): Promise<boolean> {
  if (!url || typeof url !== 'string') return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const img = new Image();
      if (noReferrer) {
        img.referrerPolicy = 'no-referrer';
      }
      const finish = (ok: boolean) => {
        if (ok && typeof img.decode === 'function') {
          img.decode().then(() => resolve(true)).catch(() => resolve(true));
        } else {
          resolve(ok);
        }
      };
      img.onload = () => finish(true);
      img.onerror = () => resolve(false); // Don't block on 404 or network errors
      img.src = url;
      if (img.complete && img.naturalWidth > 0) {
        finish(true);
      }
    } catch {
      resolve(false);
    }
  });
}

/**
 * Preload and decode a deduplicated list of image URLs so all thumbnails can
 * be revealed together in a single frame without staggered image popping.
 */
export async function preloadImageUrls(
  urls: Array<string | null | undefined>,
  maxWaitMs: number = 5000
): Promise<void> {
  const uniqueUrls = Array.from(
    new Set(
      urls
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim())
    )
  );
  if (uniqueUrls.length === 0) return;

  const loadPromises = uniqueUrls.map((url) => preloadImage(url, true));
  const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs));

  await Promise.race([
    Promise.all(loadPromises),
    timeoutPromise
  ]);
}

/**
 * Preload all thumbnails for a batch of anime cards so they can be revealed
 * simultaneously without staggered, piecemeal, or incremental image popping.
 */
export async function preloadAnimeThumbnails(
  animeList: any[],
  orientation: 'portrait' | 'landscape' = 'portrait',
  maxWaitMs: number = 2400
): Promise<void> {
  if (!Array.isArray(animeList) || animeList.length === 0) return;

  const urls: string[] = animeList
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      const target = item.node || item.anime || item;
      if (orientation === 'landscape' && target.bannerImage) {
        return target.bannerImage;
      }
      const cover = target.coverImage;
      if (typeof cover === 'string') return cover;
      return (
        cover?.large ||
        cover?.extraLarge ||
        cover?.medium ||
        target.posterImage?.large ||
        target.posterImage?.original ||
        target.thumbnail ||
        ''
      );
    })
    .filter((url) => typeof url === 'string' && url.trim().length > 0);

  if (urls.length === 0) return;

  const loadPromises = urls.map((url) => preloadImage(url));
  const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs));

  await Promise.race([
    Promise.all(loadPromises),
    timeoutPromise
  ]);
}
