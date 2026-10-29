import { useState } from "react";
import type { ExerciseSpec } from "@/types";
import { TEACHERS } from "@/teachers/registry";
import { lessonExercises, lessonLength } from "@/teachers/resolve";
import type { Teacher } from "@/teachers/types";
import { getScaleDef } from "@/theory/catalog";
import { Badge, Button, Card } from "@/components/ui";

export function TeachersPage({ onPractice }: { onPractice: (q: ExerciseSpec[]) => void }) {
  const [selected, setSelected] = useState<Teacher | null>(null);

  if (selected) {
    return <TeacherDetail teacher={selected} onBack={() => setSelected(null)} onPractice={onPractice} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TEACHERS.map((t) => (
        <Card
          key={t.id}
          className="flex cursor-pointer flex-col gap-2 transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-slate-900"
              style={{ backgroundColor: t.color }}
            >
              {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="font-bold">{t.name}</div>
              <div className="text-xs text-slate-400">
                {t.style}
                {t.era ? ` · ${t.era}` : ""}
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-300">{t.tagline}</p>
          <div className="mt-auto flex items-center justify-between pt-2">
            <Badge>{t.lessons.length} lessons</Badge>
            <Button variant="subtle" onClick={() => setSelected(t)}>
              Open
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TeacherDetail({
  teacher,
  onBack,
  onPractice,
}: {
  teacher: Teacher;
  onBack: () => void;
  onPractice: (q: ExerciseSpec[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="w-fit" onClick={onBack}>
        &larr; All teachers
      </Button>

      <Card>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-slate-900"
            style={{ backgroundColor: teacher.color }}
          >
            {teacher.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{teacher.name}</h2>
            <div className="text-sm text-slate-400">
              {teacher.style}
              {teacher.era ? ` · ${teacher.era}` : ""}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{teacher.bio}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{teacher.philosophy}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {teacher.scalarVocab.map((id) => (
            <Badge key={id} className="bg-sky-500/15 text-sky-200">
              {getScaleDef(id).name}
            </Badge>
          ))}
        </div>

        {teacher.signatureTips.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {teacher.signatureTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Lessons</h3>
        {teacher.lessons.map((lesson, i) => (
          <Card key={lesson.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{i + 1}</span>
                  <h4 className="font-semibold">{lesson.title}</h4>
                </div>
                <p className="mt-1 text-sm text-slate-400">{lesson.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge>{lessonLength(lesson)} drills</Badge>
                <Button onClick={() => onPractice(lessonExercises(teacher, lesson))}>Start</Button>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {lesson.steps.map((step, si) => (
                <div key={si} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                  <span className="font-medium text-slate-100">{getScaleDef(step.scaleId).name}</span>{" "}
                  — {step.instruction}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
