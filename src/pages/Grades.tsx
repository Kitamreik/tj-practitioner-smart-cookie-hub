import { useLMS } from "@/context/LMSContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function Grades() {
  const { students, assignments, grades } = useLMS();

  const getGrade = (studentId: string, assignmentId: string) =>
    grades.find((g) => g.studentId === studentId && g.assignmentId === assignmentId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Grades</h1>
        <p className="text-sm text-muted-foreground mt-1">View assignment scores and submission status.</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Student</TableHead>
                {assignments.map((a) => (
                  <TableHead key={a.id} className="min-w-[120px] text-center">
                    <div>{a.title}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Max: {a.maxScore}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
