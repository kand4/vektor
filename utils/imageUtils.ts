export const resizeAndCompressImage = (file: File): Promise<{ base64: string, mimeType: string, preview: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ base64: '', mimeType: 'image/jpeg', preview: '' });
    };
    reader.onload = (e) => {
      const result = e.target?.result as string || '';
      let mimeType = file.type || 'image/jpeg';
      if (result.startsWith('data:')) {
        const part = result.split(';')[0];
        if (part && part.includes(':')) {
          mimeType = part.split(':')[1] || mimeType;
        }
      }

      const img = new Image();
      img.onerror = () => {
        const base64 = result.includes(',') ? result.split(',')[1] : '';
        resolve({ base64, mimeType, preview: result });
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 1200;
        const max_height = 1200;
        let width = img.width;
        let height = img.height;

        if (width > max_width || height > max_height) {
          if (width > height) {
            height = Math.round((height * max_width) / width);
            width = max_width;
          } else {
            width = Math.round((width * max_height) / height);
            height = max_height;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedResult = canvas.toDataURL('image/jpeg', 0.8);
          const base64 = compressedResult.split(',')[1] || '';
          resolve({ base64, mimeType: 'image/jpeg', preview: compressedResult });
        } else {
          const base64 = result.includes(',') ? result.split(',')[1] : '';
          resolve({ base64, mimeType, preview: result });
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
};
