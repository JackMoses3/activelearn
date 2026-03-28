"use client";

import { Session } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function isActive(session: Session): boolean {
  if (session.ended_at) return false;
  return new Date(session.started_at) > new Date(Date.now() - 2 * 60 * 60 * 1000);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(min: number | null): string {
  if (!min) return "—";
  return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function SessionsTab({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant py-8 text-center">No sessions for this course yet.</p>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
            <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">Started</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">Duration</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">Concepts Covered</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id} className="hover:bg-surface-container-low/50">
              <TableCell className="text-sm text-on-surface-variant">{formatDate(session.started_at)}</TableCell>
              <TableCell className="text-sm text-on-surface-variant">{formatDuration(session.duration_minutes)}</TableCell>
              <TableCell className="text-sm text-on-surface-variant">{session.concepts_count}</TableCell>
              <TableCell>
                {isActive(session) ? (
                  <Badge className="bg-secondary/15 text-secondary border-0 text-[10px] font-bold uppercase tracking-wide">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    Ended
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
