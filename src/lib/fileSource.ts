import { IMAGE_TYPES, LIMITS, type Source } from "@/lib/validation/plan";

const MAX_IMAGE_SIDE = 1600;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Reduz fotos grandes (celular) para no máximo 1600 px e JPEG, o que basta para ler texto. */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000 && (IMAGE_TYPES as readonly string[]).includes(file.type)) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("imagem"))), "image/jpeg", 0.85),
  );
}

export class FileSourceError extends Error {}

/** Converte o arquivo escolhido em material para a IA. */
export async function fileToSource(file: File): Promise<Source> {
  if (file.type === "application/pdf") {
    const data = toBase64(await file.arrayBuffer());
    if (data.length > LIMITS.sourceFileMax) throw new FileSourceError("O PDF tem mais de 3 MB. Envie só as páginas que quer estudar.");
    return { kind: "pdf", data };
  }
  if ((IMAGE_TYPES as readonly string[]).includes(file.type) || file.type.startsWith("image/")) {
    const blob = await shrinkImage(file);
    const mediaType = (IMAGE_TYPES as readonly string[]).includes(blob.type) ? blob.type : "image/jpeg";
    const data = toBase64(await blob.arrayBuffer());
    if (data.length > LIMITS.sourceFileMax) throw new FileSourceError("A imagem é grande demais. Tente uma foto menor.");
    return { kind: "image", mediaType: mediaType as (typeof IMAGE_TYPES)[number], data };
  }
  throw new FileSourceError("Envie um PDF ou uma foto (JPG, PNG ou WebP).");
}

/** Nome do arquivo sem extensão, para sugerir como tema. */
export function topicFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, LIMITS.topicMax);
}
