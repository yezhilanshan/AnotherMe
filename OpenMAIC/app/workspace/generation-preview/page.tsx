'use client';

import { Suspense } from 'react';
import { GenerationPreviewContent } from '../../generation-preview/page';

export default function WorkspaceGenerationPreviewPage() {
	return (
		<Suspense
			fallback={
				<div className="workspace-panel min-h-[50vh] flex items-center justify-center">
					<div className="animate-pulse space-y-4 text-center">
						<div className="mx-auto h-8 w-48 rounded-full bg-[rgba(151,118,75,0.12)]" />
						<div className="mx-auto h-4 w-64 rounded-full bg-[rgba(151,118,75,0.12)]" />
					</div>
				</div>
			}
		>
			<GenerationPreviewContent />
		</Suspense>
	);
}
