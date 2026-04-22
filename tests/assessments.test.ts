import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
const mockExecute = vi.fn();
const mockBatch = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: () => ({ execute: mockExecute, batch: mockBatch }),
}));

import {
  getAssessmentsForCourse,
  getStudyPlan,
} from "@/lib/queries";

describe("Assessment queries", () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockBatch.mockReset();
  });

  describe("getAssessmentsForCourse", () => {
    it("returns empty array if course not owned by user", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] }); // course ownership check

      const result = await getAssessmentsForCourse("course-1", "user-B");
      expect(result).toEqual([]);
      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("user_id = ?");
    });

    it("returns assessments with readiness scores", async () => {
      // Course ownership check
      mockExecute.mockResolvedValueOnce({ rows: [{ id: "course-1" }] });
      // Assessments query
      mockExecute.mockResolvedValueOnce({
        rows: [
          { id: 1, name: "Midterm", date: "2026-05-15", type: "exam", notes: null },
        ],
      });
      // Concept links for assessment 1
      mockExecute.mockResolvedValueOnce({
        rows: [
          { concept_id: "concept_a", mastery_score: 0.8 },
          { concept_id: "concept_b", mastery_score: 0.4 },
        ],
      });

      const result = await getAssessmentsForCourse("course-1", "user-A");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Midterm");
      expect(result[0].readiness).toBe(0.6); // mean(0.8, 0.4)
      expect(result[0].floor).toBe(0.4); // min(0.8, 0.4)
      expect(result[0].concept_ids).toEqual(["concept_a", "concept_b"]);
    });

    it("returns null readiness when no concepts linked", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: "course-1" }] });
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Quiz", date: "2026-06-01", type: "quiz", notes: null }],
      });
      mockExecute.mockResolvedValueOnce({ rows: [] }); // no links

      const result = await getAssessmentsForCourse("course-1", "user-A");

      expect(result[0].readiness).toBeNull();
      expect(result[0].floor).toBeNull();
    });

    it("handles all-zero mastery without division error", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: "course-1" }] });
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Final", date: "2026-06-15", type: "exam", notes: null }],
      });
      mockExecute.mockResolvedValueOnce({
        rows: [
          { concept_id: "c1", mastery_score: 0 },
          { concept_id: "c2", mastery_score: 0 },
        ],
      });

      const result = await getAssessmentsForCourse("course-1", "user-A");
      expect(result[0].readiness).toBe(0);
      expect(result[0].floor).toBe(0);
    });

    it("readiness with single concept equals that concept's score", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: "course-1" }] });
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Quiz", date: "2026-06-01", type: "quiz", notes: null }],
      });
      mockExecute.mockResolvedValueOnce({
        rows: [{ concept_id: "c1", mastery_score: 0.75 }],
      });

      const result = await getAssessmentsForCourse("course-1", "user-A");
      expect(result[0].readiness).toBe(0.75);
      expect(result[0].floor).toBe(0.75);
    });
  });

  describe("getStudyPlan", () => {
    it("returns empty array when no assessments exist", async () => {
      // Assessments query
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await getStudyPlan("user-A");
      expect(result).toEqual([]);
    });

    it("scopes assessments to user via courses.user_id", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await getStudyPlan("user-A");

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("c.user_id = ?");
      expect(call.args[0]).toBe("user-A");
    });

    it("returns items sorted by priority descending, capped at 10", async () => {
      // Create 12 assessments to test the cap
      const rows = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Assessment ${i + 1}`,
        date: `2026-05-${String(i + 1).padStart(2, "0")}`,
        course_id: "course-1",
        course_name: "Math",
      }));

      mockExecute.mockResolvedValueOnce({ rows });

      // Each assessment has one concept with increasing mastery
      for (let i = 0; i < 12; i++) {
        mockExecute.mockResolvedValueOnce({
          rows: [{ concept_id: `c${i}`, mastery_score: i * 0.08 }],
        });
      }

      const result = await getStudyPlan("user-A");
      expect(result.length).toBeLessThanOrEqual(10);

      // Check sorting: highest priority first
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].priority).toBeGreaterThanOrEqual(result[i].priority);
      }
    });

    it("skips assessments with zero linked concepts", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Empty Exam", date: "2026-05-10", course_id: "c1", course_name: "Math" }],
      });
      mockExecute.mockResolvedValueOnce({ rows: [] }); // no concept links

      const result = await getStudyPlan("user-A");
      expect(result).toEqual([]);
    });
  });
});

describe("Assessment user isolation", () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it("getAssessmentsForCourse verifies course ownership", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await getAssessmentsForCourse("course-1", "user-B");

    const call = mockExecute.mock.calls[0][0];
    expect(call.sql).toContain("user_id = ?");
    expect(call.args).toContain("user-B");
  });

  it("getStudyPlan filters by user_id on courses join", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await getStudyPlan("user-A");

    const call = mockExecute.mock.calls[0][0];
    expect(call.sql).toContain("c.user_id = ?");
    expect(call.args).toContain("user-A");
  });
});
