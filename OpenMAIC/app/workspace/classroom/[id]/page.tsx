'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

export default function WorkspaceClassroomViewPage() {
  const params = useParams<{ id: string }>();
  const classroomId = params?.id;

  if (!classroomId) {
    return <div className="workspace-empty-box">缺少课堂编号，暂时无法打开回放。</div>;
  }

  return (
    <div className="workspace-cn-font space-y-4">
      <section className="workspace-panel flex items-center justify-between gap-3">
        <div>
          <p className="workspace-eyebrow">课堂回放</p>
          <h1 className="workspace-title text-2xl">在工作台里直接查看这节课的沉浸式播放。</h1>
          <p className="workspace-subtitle">如果你需要更大的画面，可以切到全屏页面继续查看。</p>
        </div>
        <Link href={`/classroom/${classroomId}`} className="workspace-secondary-btn" target="_blank">
          <ExternalLink className="h-4 w-4" />
          打开全屏
        </Link>
      </section>

      <section className="workspace-panel overflow-hidden p-0">
        <iframe
          src={`/classroom/${classroomId}`}
          title="课堂回放"
          className="h-[70vh] w-full border-0"
          allow="clipboard-write; autoplay"
        />
      </section>
    </div>
  );
}
