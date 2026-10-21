import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, ProviderLine } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso do Estuda-AI: conta, planos, pagamentos, conteúdo gerado por IA e cancelamento.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso">
      <p>
        Estes termos valem para quem usa o Estuda-AI, um site de estudos com flashcards gerados por inteligência
        artificial e revisão por repetição espaçada. Ao criar uma conta, você concorda com eles.
      </p>
      <p>
        O Estuda-AI é oferecido por <ProviderLine />. Contato: <ContactLine />.
      </p>

      <h2>1. Conta</h2>
      <p>
        Você entra com Google, GitHub ou um link enviado ao seu e-mail. A conta é pessoal: não compartilhe o acesso.
        O plano Grátis pode ser usado a partir de 13 anos, com conhecimento dos responsáveis no caso de menores de 18
        anos. A assinatura de planos pagos deve ser feita por maior de 18 anos ou pelo responsável legal, que assume
        os pagamentos.
      </p>

      <h2>2. O que o serviço oferece</h2>
      <ul>
        <li>Geração de planos de estudo e flashcards com IA a partir de um tema ou do seu material;</li>
        <li>Agenda de revisões pelo algoritmo FSRS, quiz, estatísticas, importação e exportação do Anki;</li>
        <li>Lembretes por e-mail para assinantes que os mantiverem ligados.</li>
      </ul>

      <h2>3. Planos e pagamentos</h2>
      <p>
        O plano Grátis tem um número limitado de gerações com IA por mês. Os planos pagos (Básico, Pro e Max) são
        assinaturas mensais cobradas no cartão de crédito pela Stripe, renovadas automaticamente até você cancelar. Os
        preços e limites atuais estão na página de <Link href="/precos">preços</Link>. A cota de gerações renova no
        dia 1 de cada mês e não acumula.
      </p>
      <p>
        Você pode cancelar a qualquer momento em Configurações. O plano pago continua até o fim do período já pago e
        não há multa. Se mudarmos um preço, avisaremos por e-mail com pelo menos 30 dias de antecedência. Se não
        concordar, você pode cancelar antes da nova cobrança, sem custo.
      </p>
      <p>
        Direito de arrependimento: se você assinou e se arrepender em até 7 dias da primeira cobrança, devolvemos o
        valor integral, conforme o art. 49 do Código de Defesa do Consumidor. Peça <ContactLine />.
      </p>

      <h2>4. Conteúdo gerado por IA</h2>
      <p>
        Os cartões são criados por um modelo de inteligência artificial e podem conter erros. Revise o conteúdo antes
        de estudar e confira leis, datas e números em fontes oficiais. O Estuda-AI não garante aprovação em provas ou
        concursos.
      </p>

      <h2>5. Seu material e seus cartões</h2>
      <p>
        Você continua dono do que envia e dos cartões que cria. Só envie material que você tem direito de usar para
        estudo. Você pode exportar seus cartões a qualquer momento.
      </p>

      <h2>6. Uso aceitável</h2>
      <p>Não é permitido usar o serviço para:</p>
      <ul>
        <li>Enviar conteúdo ilegal, ofensivo ou que viole direitos de terceiros;</li>
        <li>Tentar burlar os limites dos planos, automatizar gerações ou revender o serviço;</li>
        <li>Atacar, sobrecarregar ou tentar acessar dados de outros usuários.</li>
      </ul>
      <p>
        Contas que violarem estas regras podem ser suspensas. Antes de suspender, avisaremos por e-mail, salvo em caso
        de risco à segurança de outros usuários. Se a suspensão for injustificada, devolveremos o valor proporcional ao
        período não usado.
      </p>

      <h2>7. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o site no ar, mas podem ocorrer interrupções, por exemplo em manutenções ou falhas de
        fornecedores. Se a geração com IA falhar, a geração não é descontada da sua cota.
      </p>

      <h2>8. Natureza do serviço</h2>
      <p>
        O Estuda-AI é uma ferramenta de apoio ao estudo. O conteúdo gerado por IA não substitui livros, aulas, a
        legislação ou outras fontes oficiais. Nada nestes termos limita os seus direitos como consumidor.
      </p>

      <h2>9. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos. Mudanças importantes serão avisadas no site ou por e-mail antes de valerem.
      </p>

      <h2>10. Contato e foro</h2>
      <p>
        Dúvidas sobre estes termos podem ser enviadas <ContactLine />. Vale a lei brasileira, e o foro é o do
        domicílio do consumidor.
      </p>
      <p>
        Veja também a <Link href="/privacidade">política de privacidade</Link>.
      </p>
    </LegalPage>
  );
}
