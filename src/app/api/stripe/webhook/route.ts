import type Stripe from "stripe";
import { getStripe, syncSubscription } from "@/lib/billing/stripe";

// Mantém a tabela subscriptions igual ao Stripe. O Stripe reenvia o evento se a
// resposta não for 2xx, então erros de banco devolvem 500.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Assinatura ausente", { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return new Response("Assinatura inválida", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          await syncSubscription(await stripe.subscriptions.retrieve(session.subscription));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
    }
  } catch (e) {
    console.error(`Falha ao processar ${event.type}:`, e);
    return new Response("Erro ao processar", { status: 500 });
  }
  return Response.json({ received: true });
}
