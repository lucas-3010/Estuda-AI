import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";
import { SITE, providerLine } from "@/lib/site";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Última atualização: {SITE.legalUpdatedAt}</p>
        <div className="legal mt-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function ContactLine() {
  return SITE.supportEmail ? (
    <>
      pelo e-mail <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
    </>
  ) : (
    <>pelo e-mail de contato indicado nesta página</>
  );
}

/** Quem é o fornecedor e o controlador dos dados, com o que estiver configurado. */
export function ProviderLine() {
  const line = providerLine();
  return line ? <>{line}</> : <>o responsável pelo {SITE.name}</>;
}
