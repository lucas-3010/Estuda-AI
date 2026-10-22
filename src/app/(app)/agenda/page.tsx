import { AgendaView } from "@/components/agenda/AgendaView";

export default function AgendaPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Agenda do dia</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          O roteiro de hoje, montado pelo que você está esquecendo, pelo peso no edital e pela data da prova.
        </p>
      </div>
      <AgendaView />
    </div>
  );
}
