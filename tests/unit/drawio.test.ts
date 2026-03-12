import { describe, it, expect } from "vitest";
import { getDrawioRawUrl, getDrawioEmbedUrl } from "~/lib/drawio.server";

describe("drawio", () => {
  describe("getDrawioRawUrl", () => {
    it("generates correct raw URL with default branch", () => {
      const url = getDrawioRawUrl("owner/repo", "diagrams/arch.drawio");
      expect(url).toBe(
        "https://raw.githubusercontent.com/owner/repo/main/diagrams/arch.drawio",
      );
    });

    it("default branch is main", () => {
      const url = getDrawioRawUrl("user/project", "file.drawio");
      expect(url).toContain("/main/");
    });

    it("uses custom branch when provided", () => {
      const url = getDrawioRawUrl("owner/repo", "file.drawio", "develop");
      expect(url).toBe(
        "https://raw.githubusercontent.com/owner/repo/develop/file.drawio",
      );
    });

    it("handles paths with special characters", () => {
      const url = getDrawioRawUrl("owner/repo", "path with spaces/my diagram.drawio");
      expect(url).toBe(
        "https://raw.githubusercontent.com/owner/repo/main/path with spaces/my diagram.drawio",
      );
    });

    it("handles nested paths", () => {
      const url = getDrawioRawUrl("owner/repo", "a/b/c/d.drawio");
      expect(url).toBe(
        "https://raw.githubusercontent.com/owner/repo/main/a/b/c/d.drawio",
      );
    });
  });

  describe("getDrawioEmbedUrl", () => {
    it("generates correct embed URL", () => {
      const url = getDrawioEmbedUrl("owner/repo", "diagrams/arch.drawio");

      expect(url).toContain("https://viewer.diagrams.net/");
      expect(url).toContain("tags=%7B%7D");
      expect(url).toContain("target=blank");
      expect(url).toContain("highlight=0000ff");
      expect(url).toContain("edit=_blank");
      expect(url).toContain("layers=1");
      expect(url).toContain("nav=1");
    });

    it("includes encoded filename in title param", () => {
      const url = getDrawioEmbedUrl("owner/repo", "diagrams/arch.drawio");
      expect(url).toContain("title=arch.drawio");
    });

    it("includes encoded raw URL after #U", () => {
      const url = getDrawioEmbedUrl("owner/repo", "file.drawio");
      const rawUrl = "https://raw.githubusercontent.com/owner/repo/main/file.drawio";
      expect(url).toContain(`#U${encodeURIComponent(rawUrl)}`);
    });

    it("handles paths with special characters in embed URL", () => {
      const url = getDrawioEmbedUrl("owner/repo", "my dir/my file.drawio");
      // The filename extracted should be "my file.drawio"
      expect(url).toContain(`title=${encodeURIComponent("my file.drawio")}`);
    });

    it("default branch is main for embed URL", () => {
      const url = getDrawioEmbedUrl("owner/repo", "file.drawio");
      const rawUrl = "https://raw.githubusercontent.com/owner/repo/main/file.drawio";
      expect(url).toContain(encodeURIComponent(rawUrl));
    });

    it("uses custom branch in embed URL", () => {
      const url = getDrawioEmbedUrl("owner/repo", "file.drawio", "feature");
      const rawUrl = "https://raw.githubusercontent.com/owner/repo/feature/file.drawio";
      expect(url).toContain(encodeURIComponent(rawUrl));
    });
  });
});
