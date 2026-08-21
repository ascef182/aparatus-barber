# Bladiq Product

## Audience and promise

Bladiq serves owner-operated barbershops, hair salons, nail studios, and beauty salons in Germany and the wider DACH region, with an initial emphasis on multilingual teams and immigrant-led businesses.

**Promise:** own your customer relationship, take bookings and deposits around the clock, and protect the working day without marketplace commission on customers you bring yourself.

## Product principles

- Make the next operational decision obvious on desktop and mobile.
- Protect revenue through reliable availability, deposits, reminders, and clear cancellation rules.
- Treat tenant isolation, payment integrity, and explainable financial data as product features.
- Keep the business and customer experience usable in German, English, and Portuguese.
- Prefer a focused workflow over a generic local-business feature grid.
- Meet WCAG AA, keyboard, reduced-motion, and non-color-only status expectations.

## Commercial model

- Assisted beta: 30-day pilot, then Founder Plan at €29/month for 12 months for the first 20 partners.
- General availability: 7-day self-service trial; Starter €39, Growth €79, Pro €149. (7 days is the value implemented in code — `TRIAL_DAYS` in `lib/services/organization-service.ts` — and the one the published Terms commit to. This document said 14 until 2026-08-21; do not quote 14 in sales material.)
- No directory commission during validation. The directory is a free SEO/discovery surface, not a guaranteed lead source.
- Stripe processing fees remain transparent and separate.

## Boundaries

- Public onboarding supports `BARBERSHOP`, `HAIR_SALON`, `NAIL_SALON`, and `BEAUTY_SALON`.
- POS/TSE, inventory, native mobile apps, construction quotes, and regulated medical workflows are outside the launch scope.
- AI returns only after evidence supports a safe receptionist product connected to real availability, booking changes, and human escalation.

## Measures

North star: confirmed/protected revenue processed through Bladiq per active business.

Activation is a published booking page in under 15 minutes and a first booking within 7 days. Supporting measures are weekly active owners, payment attachment, no-show rate, completed bookings, 4/12-week tenant retention, notification reliability, and support incidents per 100 bookings.
