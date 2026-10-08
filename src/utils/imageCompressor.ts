export async function compressImageFile(
  file: File,
  maxWidth = 850,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('خطا در پردازش تصویر'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('فایل تصویر معتبر نیست'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsDataURL(file);
  });
}

export function formatPersianNumber(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, (d) => persianDigits[Number(d)]);
}

export function getNavigationLinks(lat: number, lng: number, title: string, locationName: string) {
  const query = encodeURIComponent(`${title} ${locationName}`);
  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    googleSearch: `https://www.google.com/maps/search/?api=1&query=${query}`,
    neshan: `https://nshn.ir/?lat=${lat}&lng=${lng}`,
    balad: `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=16`,
  };
}
