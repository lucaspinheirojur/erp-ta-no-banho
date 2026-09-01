import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidade | Tá no Banho" };

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <article>
        <p className="kicker">TÁ NO BANHO</p>
        <h1>Política de Privacidade</h1>
        <p>
          Utilizamos os dados da reserva exclusivamente para cadastrar o tutor e
          o pet, organizar o atendimento, confirmar pagamentos e entrar em
          contato sobre o serviço contratado.
        </p>
        <p>
          Os pagamentos on-line são processados no ambiente seguro da
          InfinitePay. O Tá no Banho não armazena os dados completos do cartão.
        </p>
        <p>
          Para solicitar correção ou exclusão dos seus dados, entre em contato
          diretamente com a equipe do Tá no Banho.
        </p>
        <a href="/agendar">Voltar para reservas</a>
      </article>
    </main>
  );
}
