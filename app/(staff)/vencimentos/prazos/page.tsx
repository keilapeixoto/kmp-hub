import { getCurrentUserRole } from "@/lib/auth";
import {
  getActiveCaseOptions,
  getCaseDeadlines,
  getDueReminders,
} from "@/lib/case-deadlines/data";
import { VencimentosTabs } from "../_components/vencimentos-tabs";
import { DeadlineForm } from "./_components/deadline-form";
import { DeadlinesList } from "./_components/deadlines-list";
import { DueRemindersPanel } from "./_components/due-reminders-panel";

export default async function PrazosPage() {
  const role = await getCurrentUserRole();
  const canSend = role === "admin" || role === "director";

  const [deadlines, cases, dueReminders] = await Promise.all([
    getCaseDeadlines(),
    getActiveCaseOptions(),
    canSend ? getDueReminders() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Vencimento de vistos
        </h1>
        <p className="text-sm text-kmp-graphite/60">
          Pedidos do Department com janela de 28 dias para resposta — exame
          médico, informação adicional, skills assessment pendente.
        </p>
      </div>

      <VencimentosTabs />

      {canSend ? <DueRemindersPanel dueReminders={dueReminders} canSend={canSend} /> : null}

      <DeadlineForm cases={cases} />

      <DeadlinesList deadlines={deadlines} />
    </div>
  );
}
