import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(210 70% 55%)",
  "hsl(340 65% 55%)",
];

export default function AdminAnalytics() {
  const { assignments, grades, submissions, discussions } = useLMS();
  const { activeSemester } = useSemester();

  const semAssignments = assignments.filter((a) => a.semesterId === activeSemester.id);
  const semAssignmentIds = new Set(semAssignments.map((a) => a.id));
  const semGrades = grades.filter((g) => semAssignmentIds.has(g.assignmentId));
  const semSubmissions = submissions.filter((s) => semAssignmentIds.has(s.assignmentId));

  // --- Grade Distribution ---
  const gradeBuckets = [
    { range: "A (90-100)", min: 90, max: 100, count: 0 },
    { range: "B (80-89)", min: 80, max: 89, count: 0 },
    { range: "C (70-79)", min: 70, max: 79, count: 0 },
    { range: "D (60-69)", min: 60, max: 69, count: 0 },
    { range: "F (<60)", min: 0, max: 59, count: 0 },
  ];

  semGrades.forEach((g) => {
    if (g.score === null) return;
    const assignment = semAssignments.find((a) => a.id === g.assignmentId);
    if (!assignment || assignment.maxScore === 0) return;
    const pct = Math.round((g.score / assignment.maxScore) * 100);
    const bucket = gradeBuckets.find((b) => pct >= b.min && pct <= b.max);
    if (bucket) bucket.count++;
  });

  const gradeData = gradeBuckets.map((b) => ({ name: b.range, count: b.count }));

  const gradeConfig: ChartConfig = {
    count: { label: "Students", color: "hsl(var(--primary))" },
  };

  // --- Submission Trends (last 14 days) ---
  const today = startOfDay(new Date());
  const submissionTrend = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(today, 13 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const count = semSubmissions.filter(
      (s) => format(new Date(s.submittedAt), "yyyy-MM-dd") === dayStr
    ).length;
    return { date: format(day, "MMM d"), submissions: count };
  });

  const submissionConfig: ChartConfig = {
    submissions: { label: "Submissions", color: "hsl(var(--primary))" },
  };

  // --- Engagement: discussion posts & replies ---
  const totalPosts = discussions.length;
  const totalReplies = discussions.reduce((sum, d) => sum + d.replies.length, 0);
  const turnedIn = semGrades.filter((g) => g.turnedIn).length;
  const notTurnedIn = semGrades.length - turnedIn;

  const engagementData = [
    { name: "Discussion Posts", value: totalPosts },
    { name: "Replies", value: totalReplies },
    { name: "Submitted", value: turnedIn },
    { name: "Missing", value: notTurnedIn },
  ];

  const engagementConfig: ChartConfig = {
    value: { label: "Count" },
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg font-bold">Analytics</h2>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Grade Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={gradeConfig} className="h-[220px] w-full">
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Submission Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submission Trends (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={submissionConfig} className="h-[220px] w-full">
              <LineChart data={submissionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="var(--color-submissions)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Student Engagement */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Student Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={engagementConfig} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={engagementData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {engagementData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
