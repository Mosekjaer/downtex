import { describe, it, expect } from "vitest";
import { getDrawioRawUrl } from "~/lib/drawio.server";

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
});
