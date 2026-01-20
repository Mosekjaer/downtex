import { describe, it, expect } from "vitest";
import { hasMinimumRole, requireRole, type Role } from "~/lib/permissions.server";

describe("permissions", () => {
  describe("hasMinimumRole", () => {
    const roles: Role[] = ["owner", "editor", "commenter", "viewer"];

    it("owner has minimum role for all roles", () => {
      for (const role of roles) {
        expect(hasMinimumRole("owner", role)).toBe(true);
      }
    });

    it("editor meets editor, commenter, and viewer", () => {
      expect(hasMinimumRole("editor", "editor")).toBe(true);
      expect(hasMinimumRole("editor", "commenter")).toBe(true);
      expect(hasMinimumRole("editor", "viewer")).toBe(true);
    });

    it("editor does not meet owner", () => {
      expect(hasMinimumRole("editor", "owner")).toBe(false);
    });

    it("commenter meets commenter and viewer", () => {
      expect(hasMinimumRole("commenter", "commenter")).toBe(true);
      expect(hasMinimumRole("commenter", "viewer")).toBe(true);
    });

    it("commenter does not meet editor or owner", () => {
      expect(hasMinimumRole("commenter", "editor")).toBe(false);
      expect(hasMinimumRole("commenter", "owner")).toBe(false);
    });

    it("viewer only meets viewer", () => {
      expect(hasMinimumRole("viewer", "viewer")).toBe(true);
      expect(hasMinimumRole("viewer", "commenter")).toBe(false);
      expect(hasMinimumRole("viewer", "editor")).toBe(false);
      expect(hasMinimumRole("viewer", "owner")).toBe(false);
    });

    it("null role fails all checks", () => {
      for (const role of roles) {
        expect(hasMinimumRole(null, role)).toBe(false);
      }
    });
  });

  describe("requireRole", () => {
    it("does not throw when role is sufficient", () => {
      expect(() => requireRole("owner", "viewer")).not.toThrow();
      expect(() => requireRole("owner", "owner")).not.toThrow();
      expect(() => requireRole("editor", "viewer")).not.toThrow();
      expect(() => requireRole("editor", "editor")).not.toThrow();
      expect(() => requireRole("commenter", "viewer")).not.toThrow();
      expect(() => requireRole("viewer", "viewer")).not.toThrow();
    });

    it("throws Response with 403 when role is insufficient", () => {
      try {
        requireRole("viewer", "editor");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(Response);
        const response = e as Response;
        expect(response.status).toBe(403);
      }
    });

    it("thrown response contains PERMISSION_DENIED error code", async () => {
      try {
        requireRole("commenter", "owner");
        expect.unreachable("should have thrown");
      } catch (e) {
        const response = e as Response;
        const body = await response.json();
        expect(body.code).toBe("PERMISSION_DENIED");
        expect(body.error).toBe("Insufficient permissions");
      }
    });

    it("throws for null role", () => {
      try {
        requireRole(null, "viewer");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(Response);
        expect((e as Response).status).toBe(403);
      }
    });
  });
});
