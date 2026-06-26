export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&\s/]+)/,
    /youtube\.com\/watch\?v=([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s/]+)/,
    /youtube\.com\/shorts\/([^?&\s/]+)/,
    /youtube\.com\/v\/([^?&\s/]+)/,
    /youtube\.com\/live\/([^?&\s/]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&enablejsapi=1`;
}

export async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j?.title === "string" ? j.title : null;
  } catch {
    return null;
  }
}
