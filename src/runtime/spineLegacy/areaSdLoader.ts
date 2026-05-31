const arrayBufferCache = new Map<string, Promise<Uint8Array>>();
const textCache = new Map<string, Promise<string>>();
const imageCache = new Map<string, Promise<HTMLImageElement>>();

const normalizeNetworkUrl = (url: string): string => {
  if (/^https:\/[^/]/iu.test(url)) {
    return url.replace(/^https:\//iu, 'https://');
  }

  if (/^http:\/[^/]/iu.test(url)) {
    return url.replace(/^http:\//iu, 'http://');
  }

  return url;
};

const assertOk = (response: Response, url: string): void => {
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
};

const shouldRetryAkitoUnit = (url: string): boolean =>
  /\/area_sd\/sd_11akito_unit\//iu.test(url);

const withCacheBust = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_retry=${Date.now()}`;
};

export const loadBinary = (url: string): Promise<Uint8Array> => {
  const cached = arrayBufferCache.get(url);

  if (cached) {
    return cached;
  }

  const request = fetch(normalizeNetworkUrl(url))
    .then(async (response) => {
      assertOk(response, url);

      return new Uint8Array(await response.arrayBuffer());
    })
    .catch((error) => {
      arrayBufferCache.delete(url);
      throw error;
    });

  arrayBufferCache.set(url, request);

  return request;
};

export const loadText = (url: string): Promise<string> => {
  const cached = textCache.get(url);

  if (cached) {
    return cached;
  }

  const request = fetch(normalizeNetworkUrl(url))
    .then(async (response) => {
      assertOk(response, url);

      return response.text();
    })
    .catch((error) => {
      textCache.delete(url);
      throw error;
    });

  textCache.set(url, request);

  return request;
};

export const loadImage = (url: string): Promise<HTMLImageElement> => {
  const cached = imageCache.get(url);

  if (cached) {
    return cached;
  }

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const normalized = normalizeNetworkUrl(url);
    let retried = false;

    const assignSource = (src: string): void => {
      image.src = src;
    };

    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => {
      if (!retried && shouldRetryAkitoUnit(normalized)) {
        retried = true;
        assignSource(withCacheBust(normalized));
        return;
      }

      reject(new Error(`Failed to load ${url}`));
    };
    assignSource(normalized);
  }).catch((error) => {
    imageCache.delete(url);
    throw error;
  });

  imageCache.set(url, request);

  return request;
};
