// Mede quanto tempo leva gravar respostas do formulário com a sessão de um
// cliente (RLS ativo) comparado com a secret key (sem RLS). Usado para
// decidir se o portal pode voltar a gravar com a sessão do cliente depois da
// migração 20261015120000_rls_initplan_performance.sql.
//
// Só mexe em dado de demonstração (is_demo = true) e desfaz tudo no final:
// cria um usuário cliente temporário (@kmp.test), dá acesso a um cliente
// demo, grava 8 respostas no formulário do visto 600 de um processo demo,
// e depois restaura as respostas, remove o acesso, o usuário e o formulário
// (se foi criado aqui). Imprime só tempos, contagens e códigos de erro —
// nenhum nome, e-mail ou resposta. Ficam só os registros de auditoria.
//
// Uso: node scripts/measure-form-rls.mjs [rodadas=3]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const RODADAS = Number(process.argv[2] ?? 3);
const BLOCO = 8; // mesmo tamanho de lib/case-forms/save.ts
const TEMPLATE = "Formulário Visto de Turista (Subclass 600) — Coleta de Dados";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, opts);

const ms = (t0) => Math.round(performance.now() - t0);
const desfazer = [];

async function cronometrar(rotulo, cliente, linhas) {
  const tempos = [];
  for (let i = 0; i < RODADAS; i++) {
    const t0 = performance.now();
    const { error } = await cliente
      .from("case_form_responses")
      .upsert(linhas, { onConflict: "case_form_id,field_id" });
    tempos.push(error ? `erro ${error.code}` : `${ms(t0)} ms`);
  }
  console.log(`${rotulo.padEnd(34)} ${tempos.join(" | ")}`);
}

try {
  const { data: tpl } = await admin.from("case_form_templates").select("id").eq("nome", TEMPLATE).single();
  const { data: steps } = await admin.from("case_form_steps").select("id").eq("template_id", tpl.id);
  const { data: campos } = await admin
    .from("case_form_fields")
    .select("id")
    .in("step_id", steps.map((s) => s.id))
    .eq("tipo", "text")
    .limit(BLOCO);
  if (!campos || campos.length < BLOCO) throw new Error("modelo do 600 sem campos de texto suficientes");

  const { data: caso } = await admin
    .from("cases")
    .select("id, client_id")
    .eq("is_demo", true)
    .limit(1)
    .maybeSingle();
  if (!caso) throw new Error("nenhum processo demo — rode scripts/seed-demo.mjs antes");

  // Formulário do 600 neste processo demo (cria se não houver).
  let { data: form } = await admin
    .from("case_forms")
    .select("id")
    .eq("case_id", caso.id)
    .eq("template_id", tpl.id)
    .maybeSingle();
  if (!form) {
    const r = await admin
      .from("case_forms")
      .insert({ case_id: caso.id, template_id: tpl.id, status: "em_preenchimento" })
      .select("id")
      .single();
    if (r.error) throw new Error(`criar formulário: ${r.error.code}`);
    form = r.data;
    desfazer.push(() => admin.from("case_forms").delete().eq("id", form.id));
  }

  // Guarda as respostas atuais desses campos para restaurar no final.
  const { data: anteriores } = await admin
    .from("case_form_responses")
    .select("field_id, valor")
    .eq("case_form_id", form.id)
    .in("field_id", campos.map((c) => c.id));
  desfazer.push(async () => {
    const ja = new Set((anteriores ?? []).map((a) => a.field_id));
    const novos = campos.map((c) => c.id).filter((id) => !ja.has(id));
    if (novos.length) {
      await admin.from("case_form_responses").delete().eq("case_form_id", form.id).in("field_id", novos);
    }
    if (anteriores?.length) {
      await admin
        .from("case_form_responses")
        .upsert(anteriores.map((a) => ({ ...a, case_form_id: form.id })), { onConflict: "case_form_id,field_id" });
    }
  });

  // Usuário cliente temporário com acesso ao cliente demo.
  const email = `medicao-rls-${randomUUID().slice(0, 8)}@kmp.test`;
  const { data: criado, error: eUser } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome: "Medição RLS (temporário)", role: "client" },
  });
  if (eUser) throw new Error(`criar usuário: ${eUser.code ?? eUser.message}`);
  const userId = criado.user.id;
  desfazer.push(() => admin.auth.admin.deleteUser(userId));

  const { data: acesso, error: eAcesso } = await admin
    .from("client_access")
    .insert({ client_id: caso.client_id, client_user_id: userId })
    .select("id")
    .single();
  if (eAcesso) throw new Error(`criar acesso: ${eAcesso.code}`);
  desfazer.push(() => admin.from("client_access").delete().eq("id", acesso.id));

  // Sessão do cliente sem e-mail: link gerado pelo admin, validado aqui.
  const { data: link, error: eLink } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (eLink) throw new Error(`gerar link: ${eLink.code ?? eLink.message}`);
  const cliente = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, opts);
  const { error: eOtp } = await cliente.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (eOtp) throw new Error(`abrir sessão: ${eOtp.code ?? eOtp.message}`);

  const linhas = (sufixo) =>
    campos.map((c, i) => ({ case_form_id: form.id, field_id: c.id, valor: `medicao ${sufixo} ${i}` }));

  // Prova de que o RLS está mesmo valendo para essa sessão.
  const { count } = await cliente.from("cases").select("id", { count: "exact", head: true });
  console.log(`processos visíveis para o cliente temporário: ${count}`);
  console.log(`${RODADAS} rodadas de upsert com ${BLOCO} linhas:`);

  let t0 = performance.now();
  const { error: eSel } = await cliente.from("case_form_responses").select("field_id").eq("case_form_id", form.id);
  console.log(`${"leitura das respostas (cliente)".padEnd(34)} ${eSel ? `erro ${eSel.code}` : `${ms(t0)} ms`}`);

  await cronometrar("upsert com sessão do cliente", cliente, linhas("cliente"));
  await cronometrar("upsert com secret key", admin, linhas("admin"));
} catch (e) {
  console.error("Falhou:", e.message);
  process.exitCode = 1;
} finally {
  for (const passo of desfazer.reverse()) {
    try {
      await passo();
    } catch (e) {
      console.error("Limpeza falhou num passo:", e.message);
      process.exitCode = 1;
    }
  }
  console.log("limpeza concluída");
}
