import { EducatorShellBoundary } from '../../../components/educator-shell-boundary';
import { EducatorShell } from '../../../components/educator-shell';

export default function EducatorPricePage() {
  return (
    <EducatorShellBoundary>
      <EducatorShell mode="tutor" screen="dashboard" initialView="price" />
    </EducatorShellBoundary>
  );
}
