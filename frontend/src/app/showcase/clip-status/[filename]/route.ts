import { realpath, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const ALLOWED_EXTENSIONS = new Set([".webm", ".mp4", ".webp", ".png", ".jpg", ".jpeg"]);

function isWithinDirectory(directory: string, filePath: string): boolean {
  const pathFromDirectory = relative(directory, filePath);
  return pathFromDirectory !== "" && !pathFromDirectory.startsWith("..");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (
    !/^[\w.-]+$/.test(filename) ||
    filename.startsWith(".") ||
    !ALLOWED_EXTENSIONS.has(extname(filename).toLowerCase())
  ) {
    return Response.json({ exists: false });
  }

  const clipsDirectory = resolve(process.cwd(), "public", "clips");
  const filePath = resolve(clipsDirectory, filename);
  if (!isWithinDirectory(clipsDirectory, filePath)) {
    return Response.json({ exists: false });
  }

  try {
    const [realDirectory, realFile] = await Promise.all([
      realpath(clipsDirectory),
      realpath(filePath),
    ]);
    if (!isWithinDirectory(realDirectory, realFile)) {
      return Response.json({ exists: false });
    }
    return Response.json({ exists: (await stat(realFile)).isFile() });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return Response.json({ exists: false });
    }
    throw error;
  }
}
