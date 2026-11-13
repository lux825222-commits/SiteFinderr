// Shrinks an uploaded photo in the browser so it can live inside the HTML file.
export async function compressImage(file: File, maxSide = 1200, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("O arquivo precisa ser uma imagem.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não foi possível ler esta imagem."));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const keepAlpha = file.type === "image/png" || file.type === "image/webp";
    return canvas.toDataURL(keepAlpha ? "image/webp" : "image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
