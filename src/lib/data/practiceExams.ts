import { createBrowserSupabase } from "@/lib/supabase/client";
import { importedExamSchema, type ImportedExam, type ImportedQuestion } from "@/lib/validation/plan";

export type PracticeExam = { id: string; title: string; questions: ImportedQuestion[]; createdAt: string };

function toExam(row: { id: string; title: string; questions: unknown; created_at: string }): PracticeExam {
  const parsed = importedExamSchema.safeParse({ title: row.title, questions: row.questions });
  return { id: row.id, title: row.title, questions: parsed.success ? parsed.data.questions : [], createdAt: row.created_at };
}

export async function listPracticeExams(): Promise<PracticeExam[]> {
  const { data, error } = await createBrowserSupabase()
    .from("practice_exams")
    .select("id, title, questions, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toExam);
}

export async function savePracticeExam(exam: ImportedExam): Promise<PracticeExam> {
  const { data, error } = await createBrowserSupabase()
    .from("practice_exams")
    .insert({ title: exam.title.slice(0, 200), questions: exam.questions })
    .select("id, title, questions, created_at")
    .single();
  if (error) throw error;
  return toExam(data);
}

export async function deletePracticeExam(id: string): Promise<void> {
  const { error } = await createBrowserSupabase().from("practice_exams").delete().eq("id", id);
  if (error) throw error;
}
