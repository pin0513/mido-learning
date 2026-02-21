import type { Metadata } from 'next';
import type { LearningComponent } from '@/types/component';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://mido-learning-api-24mwb46hra-de.a.run.app';

async function fetchComponentForMeta(id: string): Promise<LearningComponent | null> {
  try {
    const res = await fetch(`${API_URL}/api/components/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as LearningComponent | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ componentId: string }>;
}): Promise<Metadata> {
  const { componentId } = await params;
  const component = await fetchComponentForMeta(componentId);

  if (!component) {
    return { title: 'Mido Learning' };
  }

  const description =
    component.description?.trim() ||
    `${component.category} 學習教材 - Mido Learning`;

  const images = component.thumbnailUrl
    ? [{ url: component.thumbnailUrl, alt: component.title }]
    : [{ url: '/images/logo.png', alt: 'Mido Learning' }];

  return {
    title: component.title,
    description,
    openGraph: {
      title: component.title,
      description,
      url: `https://learn.paulfun.net/materials/${componentId}`,
      type: 'article',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: component.title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export default function MaterialLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
