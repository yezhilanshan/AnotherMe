import { redirect } from 'next/navigation';

interface WorkspaceClassroomPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspaceClassroomPage({ params }: WorkspaceClassroomPageProps) {
  const { id } = await params;
  redirect(`/classroom/${encodeURIComponent(id)}`);
}
