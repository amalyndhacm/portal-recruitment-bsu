import EmploymentDocumentEditor from '@/components/recruitment/EmploymentDocumentEditor';
export default function ContractStatementEditor(props: { draft: Record<string, string>; onChange: (next: Record<string, string>) => void; onSave: () => void; onCancel: () => void }) {
  return <EmploymentDocumentEditor kind="kontrak" {...props} />;
}
