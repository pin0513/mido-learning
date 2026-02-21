'use client';

import { useRouter } from 'next/navigation';
import { ComponentUploadForm } from '@/components/learning/ComponentUploadForm';

export default function AdminNewComponentPage() {
  const router = useRouter();
  return (
    <ComponentUploadForm
      backHref="/admin/components"
      backLabel="返回教材管理"
      onSuccess={(id) => router.push(`/teacher/components/${id}/edit`)}
    />
  );
}
