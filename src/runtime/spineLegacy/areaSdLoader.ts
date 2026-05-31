const arrayBufferCache = new Map<string, Promise<Uint8Array>>();
const textCache = new Map<string, Promise<string>>();
const imageCache = new Map<string, Promise<HTMLImageElement>>();

const assertOk = (response: Response, url: string): void => {
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
};

export const loadBinary = (url: string): Promise<Uint8Array> => {
  const cached = arrayBufferCache.get(url);

  if (cached) {
    return cached;
  }

  const request = fetch(url).then(async (response) => {
    assertOk(response, url);

    return new Uint8Array(await response.arrayBuffer());
  });

  arrayBufferCache.set(url, request);

  return request;
};

export const loadText = (url: string): Promise<string> => {
  const cached = textCache.get(url);

  if (cached) {
    return cached;
  }

  const request = fetch(url).then(async (response) => {
    assertOk(response, url);

    return response.text();
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

    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });

  imageCache.set(url, request);

  return request;
};
