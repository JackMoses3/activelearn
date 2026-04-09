import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
const mockExecute = vi.fn();
const mockBatch = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: () => ({ execute: mockExecute, batch: mockBatch }),
}));

import {
  getCourses,
  getRecentSessions,
  getCourseById,
  getConceptsForCourse,
  getConceptHistory,
  getKnowledgeComponents,
  getSessionsForCourse,
} from "@/lib/queries";

describe("User isolation", () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockBatch.mockReset();
  });

  describe("getCourses", () => {
    it("filters by user_id", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await getCourses("user-A");

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("WHERE c.user_id = ?");
      expect(call.args).toContain("user-A");
    });

    it("does not return courses belonging to other users", async () => {
      // User A has courses
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: "course-1", name: "Math", updated_at: "2026-01-01",
            session_count: 0, total: 0, mastered: 0, partial: 0, seen: 0, unknown: 0, due_today: 0,
          },
        ],
      });

      const coursesA = await getCourses("user-A");
      expect(coursesA).toHaveLength(1);
      expect(coursesA[0].id).toBe("course-1");

      // User B gets empty
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const coursesB = await getCourses("user-B");
      expect(coursesB).toHaveLength(0);
    });
  });

  describe("getCourseById", () => {
    it("requires matching user_id", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const course = await getCourseById("course-1", "user-B");

      expect(course).toBeNull();
      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("AND user_id = ?");
      expect(call.args).toEqual(["course-1", "user-B"]);
    });

    it("returns course when user matches", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: "course-1", name: "Math" }],
      });

      const course = await getCourseById("course-1", "user-A");
      expect(course).not.toBeNull();
      expect(course!.id).toBe("course-1");
    });
  });

  describe("getRecentSessions", () => {
    it("filters sessions by course user_id", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await getRecentSessions("user-A", 5);

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("WHERE c.user_id = ?");
      expect(call.args[0]).toBe("user-A");
      expect(call.args[1]).toBe(5);
    });
  });

  describe("getConceptsForCourse", () => {
    it("joins courses table to verify ownership", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await getConceptsForCourse("course-1", "user-A");

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("JOIN courses c ON c.id = cm.course_id");
      expect(call.sql).toContain("c.user_id = ?");
      expect(call.args).toEqual(["course-1", "user-A"]);
    });
  });

  describe("getConceptHistory", () => {
    it("joins courses table to verify ownership", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await getConceptHistory("course-1", "concept-1", "user-A");

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("JOIN courses c ON c.id = mh.course_id");
      expect(call.sql).toContain("c.user_id = ?");
      expect(call.args).toEqual(["course-1", "concept-1", "user-A"]);
    });
  });

  describe("getKnowledgeComponents", () => {
    it("joins courses table to verify ownership", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await getKnowledgeComponents("course-1", "concept-1", "user-A");

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("JOIN courses c ON c.id = kc.course_id");
      expect(call.sql).toContain("c.user_id = ?");
      expect(call.args).toEqual(["course-1", "concept-1", "user-A"]);
    });
  });

  describe("getSessionsForCourse", () => {
    it("filters by course user_id", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await getSessionsForCourse("course-1", "user-A");

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("c.user_id = ?");
      expect(call.args).toEqual(["course-1", "user-A"]);
    });
  });
});
