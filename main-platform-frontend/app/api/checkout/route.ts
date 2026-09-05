import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo', {
  apiVersion: '2025-01-27.acacia',
});

export async function POST(req: Request) {
  try {
    const { priceStr, planName } = await req.json();
    
    // Extract numeric price from string like "$49"
    const parsedPrice = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
    
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'link'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${planName} Plan`,
              description: 'Subscription to AegisAuth security platform',
            },
            unit_amount: parsedPrice * 100, // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/membership/success`,
      cancel_url: `${req.headers.get('origin')}/membership`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating Stripe session:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: err.statusCode || 500 }
    );
  }
}
