const SCHEMA_TYPE_BY_CATEGORY: Record<string, string> = {
  BARBERSHOP: "HairSalon",
  HAIR_SALON: "HairSalon",
  NAIL_SALON: "NailSalon",
  BEAUTY_SALON: "BeautySalon",
  MEDICAL: "MedicalBusiness",
  DENTAL: "Dentist",
  ELECTRICIAN: "Electrician",
  CONSTRUCTION: "GeneralContractor",
  OTHER: "LocalBusiness",
};

type Location = {
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  phone: string | null;
} | null;

type Service = { name: string; durationMinutes: number; priceInCents: number; currency: string };

/**
 * JSON-LD LocalBusiness — pro Google Local Pack e pra engines de IA
 * (ChatGPT/Perplexity/AI Overviews) que dependem de dados estruturados,
 * não só do HTML visível. Sem query nova: reusa organization/location/
 * services já carregados em page.tsx.
 */
export function StructuredData({
  organizationName,
  category,
  url,
  location,
  services,
  image,
}: {
  organizationName: string;
  category: string;
  url: string;
  location: Location;
  services: Service[];
  image?: string | null;
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE_BY_CATEGORY[category] ?? "LocalBusiness",
    name: organizationName,
    url,
    ...(image ? { image } : {}),
    ...(location
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: location.addressLine1,
            postalCode: location.postalCode,
            addressLocality: location.city,
            addressCountry: location.countryCode,
          },
          ...(location.phone ? { telephone: location.phone } : {}),
        }
      : {}),
    ...(services.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: services.map((service) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: service.name,
                ...(Number.isFinite(service.durationMinutes)
                  ? { duration: `PT${service.durationMinutes}M` }
                  : {}),
              },
              priceSpecification: {
                "@type": "PriceSpecification",
                price: (service.priceInCents / 100).toFixed(2),
                priceCurrency: service.currency,
              },
            })),
          },
        }
      : {}),
  };

  // JSON.stringify não escapa "<" — um valor de negócio/serviço/endereço
  // (texto livre controlado pelo dono no dashboard, ex.: organizationName)
  // contendo literalmente "</script>" fecharia esta tag prematuramente e
  // injetaria HTML/script arbitrário na página pública. < é decodificado
  // de volta a "<" por qualquer parser de JSON válido (incluindo o Google),
  // mas o parser de HTML nunca vê o caractere "<" real, então não pode
  // fechar a tag. Mesma mitigação usada pelos exemplos oficiais do Next.js
  // pra JSON-LD.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />;
}
