import type { Metadata } from "next";
import { ContactLine, LegalPage, ProviderLine } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados o Estuda-AI coleta, para quê, com quem compartilha e como exercer seus direitos pela LGPD.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade">
      <p>
        Esta política explica quais dados pessoais o Estuda-AI trata, por que e quais são os seus direitos, de acordo
        com a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
      </p>

      <h2>Quem é o responsável pelos seus dados</h2>
      <p>
        O controlador dos dados é <ProviderLine />. O canal para qualquer assunto de privacidade é <ContactLine />.
        Por ser agente de tratamento de pequeno porte, não há encarregado (DPO) nomeado, conforme a Resolução CD/ANPD
        nº 2/2022; este canal atende os titulares.
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> e-mail e, se você entrar com Google ou GitHub, o identificador e o nome fornecidos por
          eles.
        </li>
        <li>
          <strong>Estudos:</strong> planos, cartões, revisões, configurações (meta diária, fuso horário, lembretes) e o
          número de gerações com IA usadas no mês.
        </li>
        <li>
          <strong>Assinatura:</strong> plano, situação da assinatura e identificadores do cliente na Stripe. Os dados do
          cartão ficam só com a Stripe; o Estuda-AI nunca os recebe.
        </li>
        <li>
          <strong>Material enviado:</strong> textos, PDFs e fotos que você manda para gerar cartões. Eles são enviados
          à IA só para essa geração e não são guardados no Estuda-AI.
        </li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Prestar o serviço: gerar cartões, agendar revisões e mostrar suas estatísticas (execução de contrato);</li>
        <li>Cobrar a assinatura e controlar a cota do plano (execução de contrato);</li>
        <li>Enviar o lembrete diário por e-mail, que você pode desligar em Configurações;</li>
        <li>Prevenir abuso e manter a segurança do site (legítimo interesse);</li>
        <li>Cumprir obrigações legais, como guardar registros de cobrança.</li>
      </ul>
      <p>Não vendemos seus dados e não usamos seus dados para publicidade.</p>

      <h2>3. Com quem compartilhamos</h2>
      <p>Usamos fornecedores que tratam dados em nosso nome, alguns fora do Brasil:</p>
      <ul>
        <li>
          <strong>Supabase</strong>: banco de dados e login;
        </li>
        <li>
          <strong>Vercel</strong>: hospedagem do site;
        </li>
        <li>
          <strong>Anthropic</strong>: modelo de IA que gera os cartões a partir do tema ou material enviado. Pela
          política comercial da API, a Anthropic não usa esse conteúdo para treinar seus modelos;
        </li>
        <li>
          <strong>Stripe</strong>: pagamentos;
        </li>
        <li>
          <strong>Resend</strong>: envio dos e-mails de lembrete.
        </li>
      </ul>
      <p>
        Esses fornecedores guardam ou processam dados principalmente nos Estados Unidos. As transferências
        internacionais seguem as garantias da LGPD (art. 33), como as cláusulas contratuais de proteção de dados dos
        próprios fornecedores.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Usamos apenas cookies necessários para manter você conectado. Não usamos cookies de publicidade nem de
        rastreamento de terceiros.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Guardamos seus dados enquanto a conta existir. Se você pedir a exclusão da conta, apagamos sua conta, planos,
        cartões e revisões em até 15 dias. Registros de cobrança podem ser mantidos pelo prazo exigido em lei.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Pela LGPD, você pode a qualquer momento:</p>
      <ul>
        <li>Confirmar se tratamos seus dados e pedir uma cópia deles;</li>
        <li>Corrigir dados incompletos ou desatualizados;</li>
        <li>Pedir a exclusão da conta e dos dados;</li>
        <li>Levar seus cartões para outro serviço (exportação para o Anki em Configurações);</li>
        <li>Revogar consentimentos, como o lembrete por e-mail.</li>
      </ul>
      <p>
        Para exercer esses direitos, fale conosco <ContactLine />. Respondemos em até 15 dias. Você também pode
        reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>7. Segurança</h2>
      <p>
        Os dados trafegam com criptografia (HTTPS), e o banco usa regras que impedem um usuário de ver dados de outro.
        Chaves e senhas dos serviços ficam só no servidor.
      </p>

      <h2>8. Crianças e adolescentes</h2>
      <p>
        O serviço é para maiores de 13 anos. Não coletamos de propósito dados de menores de 13 anos; se isso acontecer,
        apagaremos a conta ao saber. Menores de 18 anos devem usar o site com conhecimento dos responsáveis, e
        assinaturas pagas devem ser feitas por maiores de 18 anos ou pelo responsável legal.
      </p>

      <h2>9. Mudanças nesta política</h2>
      <p>Se esta política mudar de forma importante, avisaremos no site ou por e-mail.</p>
    </LegalPage>
  );
}
