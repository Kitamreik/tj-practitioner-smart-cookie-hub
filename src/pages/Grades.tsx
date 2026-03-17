import { useLMS } from "@/context/LMSContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function Grades() {
  const { students, assignments, grades } = useLMS();
  const { user, isStudent } = useAuth();

  const getGrade = (studentId: string, assignmentId: string) =>
    grades.find((g) => g.studentId === studentId && g.assignmentId === assignmentId);

  // Students only see their own grades (matched by name since mock IDs may differ)
  const visibleStudents = isStudent
    ? students.filter((s) => s.name === user?.name || s.email === user?.email)
    : students;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Grades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isStudent ? "Your assignment scores and submission status." : "View all student scores and submission status."}
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {!isStudent && <TableHead className="min-w-[160px]">Student</TableHead>}
                {assignments.map((a) => (
                  <TableHead key={a.id} className="min-w-[120px] text-center">
                    <div>{a.title}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Max: {a.maxScore}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={assignments.length + 1} className="text-center text-muted-foreground py-8">
                    No grade data found for your account.
                  </TableCell>
                </TableRow>
              ) : (
                visibleStudents.map((s) => (
                  <TableRow key={s.id}>
                    {!isStudent && <TableCell className="font-medium">{s.name}</TableCell>}
                    {assignments.map((a) => {
                      const g = getGrade(s.id, a.id);
                      return (
                        <TableCell key={a.id} className="text-center">
                          {g?.turnedIn ? (
                            <div>
                              <span className="font-semibold">{g.score ?? "—"}</span>
                              <span className="text-muted-foreground text-xs">/{a.maxScore}</span>
                              <Badge variant="outline" className="ml-2 text-[10px] border-success text-success">
                                Turned In
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
                              Missing
                            </Badge>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
