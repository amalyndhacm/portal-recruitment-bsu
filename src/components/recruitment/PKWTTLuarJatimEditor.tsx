import EmploymentDocumentEditor from '@/components/recruitment/EmploymentDocumentEditor';
export default function PKWTTLuarJatimEditor(props: { draft: Record<string, string>; onChange: (next: Record<string, string>) => void; onSave: () => void; onCancel: () => void }) {
  return <EmploymentDocumentEditor kind="pkwtt-luar" {...props} />;
}
