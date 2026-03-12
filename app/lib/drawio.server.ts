/**
 * Draw.io rendering utilities.
 *
 * Constructs URLs for the draw.io embed viewer and raw GitHub file access.
 */

/**
 * Build the raw.githubusercontent.com URL for a file in a GitHub repo.
 */
export function getDrawioRawUrl(
  repo: string,
  path: string,
  branch = "main",
): string {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

/**
 * Build the draw.io embed viewer URL that renders a .drawio file hosted on
 * GitHub via an iframe.
 *
 * URL format:
 *   https://viewer.diagrams.net/?tags={}&target=blank&highlight=0000ff
 *     &edit=_blank&layers=1&nav=1&title=<filename>#U<rawUrl>
 */
export function getDrawioEmbedUrl(
  repo: string,
  path: string,
  branch = "main",
): string {
  const rawUrl = getDrawioRawUrl(repo, path, branch);
  const filename = path.split("/").pop() ?? "diagram";

  return (
    `https://viewer.diagrams.net/` +
    `?tags=%7B%7D` +
    `&target=blank` +
    `&highlight=0000ff` +
    `&edit=_blank` +
    `&layers=1` +
    `&nav=1` +
    `&title=${encodeURIComponent(filename)}` +
    `#U${encodeURIComponent(rawUrl)}`
  );
}
