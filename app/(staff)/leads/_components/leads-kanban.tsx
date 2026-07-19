"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LEAD_STATUSES } from "@/lib/leads/constants";
import type { ConsultantOption, Lead } from "@/lib/leads/types";
import { daysSinceLastContact, isLeadInactive } from "@/lib/leads/utils";
import { updateLeadStatus } from "../actions";
import { InactivityBadge } from "./status-badge";

export function LeadsKanban({
  leads: initialLeads,
  consultants,
}: {
  leads: Lead[];
  consultants: ConsultantOption[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const consultantName = (id: string) =>
    consultants.find((c) => c.user_id === id)?.nome ?? "—";

  function handleDrop(status: string, leadId: string) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status: status as Lead["status"] } : l,
      ),
    );
    startTransition(async () => {
      await updateLeadStatus(leadId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {LEAD_STATUSES.map((column) => {
        const columnLeads = leads.filter((l) => l.status === column.slug);
        return (
          <div
            key={column.slug}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const leadId = e.dataTransfer.getData("text/lead-id");
              if (leadId) handleDrop(column.slug, leadId);
            }}
            className="flex w-64 shrink-0 flex-col rounded-lg bg-black/5 p-3"
          >
            <h3 className="mb-3 flex items-center justify-between font-heading text-sm text-kmp-graphite">
              {column.label}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-kmp-graphite/60">
                {columnLeads.length}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {columnLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/lead-id", lead.id)
                  }
                  className="block rounded-md bg-white p-3 text-sm shadow-sm transition hover:shadow-md"
                >
                  <p className="font-medium text-kmp-graphite">{lead.nome}</p>
                  {lead.servico_interesse ? (
                    <p className="mt-1 text-xs text-kmp-graphite/60">
                      {lead.servico_interesse}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-kmp-graphite/60">
                      {consultantName(lead.consultor_id)}
                    </span>
                    {isLeadInactive(lead) ? (
                      <InactivityBadge days={daysSinceLastContact(lead)} />
                    ) : null}
                  </div>
                </Link>
              ))}
              {columnLeads.length === 0 ? (
                <p className="rounded-md border border-dashed border-black/10 p-3 text-center text-xs text-kmp-graphite/40">
                  Vazio
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
