import { readFile } from "fs/promises";
import path from "path";

const IMAGE_PATH = path.join(process.cwd(), "public", "1.jpg");

export async function GET() {
  try {
    const image = await readFile(IMAGE_PATH);

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("welcome-image read failed:", (err as Error).message);
    return new Response("Not found", { status: 404 });
  }
}