import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function UnsavedChangesDialog({
  open,
  saving,
  hasUnsavedChanges,
  onSave,
  onDiscard,
  onCancelEditing,
  onContinueEditing
}) {
  const isDirty = Boolean(hasUnsavedChanges);

  return (
    <Modal
      open={open}
      title={isDirty ? "Alterações não guardadas" : "Lead em edição"}
      onClose={onContinueEditing}
      closeOnBackdrop={!saving}
      hideCloseButton={saving}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="light" onClick={onContinueEditing} disabled={saving}>Continuar a editar</Button>
          {isDirty ? (
            <>
              <Button variant="danger" onClick={onDiscard} disabled={saving}>Descartar</Button>
              <Button variant="primary" onClick={onSave} loading={saving}>Guardar</Button>
            </>
          ) : (
            <Button variant="danger" onClick={onCancelEditing} disabled={saving}>Cancelar edição</Button>
          )}
        </div>
      }
    >
      {isDirty ? (
        <>
          <p style={{ margin: 0 }}>Existem alterações por guardar.</p>
          <p style={{ margin: "8px 0 0" }}>Pretende guardar antes de sair?</p>
        </>
      ) : (
        <>
          <p style={{ margin: 0 }}>Existe uma Lead em edição.</p>
          <p style={{ margin: "8px 0 0" }}>Pretende cancelar a edição?</p>
        </>
      )}
    </Modal>
  );
}
