/** Dados públicos do site usados nas páginas institucionais. */
export const SITE = {
  name: "Estuda-AI",
  /** E-mail de contato e de privacidade (LGPD). Vazio = ainda não definido. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  /**
   * Quem oferece o serviço (Decreto 7.962/2013, art. 2º): nome ou razão social, CPF ou CNPJ e endereço.
   * Vazios = ainda não definidos; as páginas mostram só o que estiver preenchido.
   */
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "",
  legalDocument: process.env.NEXT_PUBLIC_LEGAL_DOCUMENT ?? "",
  legalAddress: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "",
  legalUpdatedAt: "21 de outubro de 2026",
};

/** Linha de identificação do fornecedor, por exemplo "Fulano de Tal · CNPJ 00.000.000/0001-00 · São Paulo/SP". */
export function providerLine(): string {
  return [SITE.legalName, SITE.legalDocument, SITE.legalAddress].filter(Boolean).join(" · ");
}
