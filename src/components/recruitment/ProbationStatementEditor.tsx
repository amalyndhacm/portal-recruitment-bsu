import EmploymentDocumentEditor from '@/components/recruitment/EmploymentDocumentEditor';
export default function ProbationStatementEditor(props: { draft: Record<string, string>; onChange: (next: Record<string, string>) => void; onSave: () => void; onCancel: () => void }) {
  return <EmploymentDocumentEditor kind="probation" {...props} />;
}
