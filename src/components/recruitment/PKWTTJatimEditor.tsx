import EmploymentDocumentEditor from '@/components/recruitment/EmploymentDocumentEditor';
export default function PKWTTJatimEditor(props: { draft: Record<string, string>; onChange: (next: Record<string, string>) => void; onSave: () => void; onCancel: () => void }) {
  return <EmploymentDocumentEditor kind="pkwtt-jatim" {...props} />;
}
