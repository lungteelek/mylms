import { EducatorShellBoundary } from '../../components/educator-shell-boundary';
import { EducatorShell } from '../../components/educator-shell';

export default function EducatorPage() {
  return (
    <EducatorShellBoundary>
      <EducatorShell mode="tutor" screen="dashboard" />
    </EducatorShellBoundary>
  );
}
