import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function UnsavedChangesDialog({ open, saving, onSave, onDiscard, onContinueEditing }) {
  return (
    <Modal
      open={open}
      title="Alterações não guardadas"
      onClose={onContinueEditing}
      closeOnBackdrop={!saving}
      hideCloseButton={saving}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="light" onClick={onContinueEditing} disabled={saving}>Continuar a editar</Button>
          <Button variant="danger" onClick={onDiscard} disabled={saving}>Descartar</Button>
          <Button variant="primary" onClick={onSave} loading={saving}>Guardar</Button>
        </div>
      }
    >
      <p style={{ margin: 0 }}>Existem alterações por guardar.</p>
      <p style={{ margin: "8px 0 0" }}>Pretende guardar antes de sair?</p>
    </Modal>
  );
}
