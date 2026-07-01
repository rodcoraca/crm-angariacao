import React from "react";
import { useTheme } from "./theme/ThemeContext";

export default function UploadDocumentos({ file, setFile, onUpload, uploading, progresso }) {
  const theme = useTheme();
  return (
    <div>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} />
      <button style={{ marginTop: 10, background: theme.colors.primary, color: theme.colors.textLight, border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }} onClick={onUpload}>Upload</button>
      {uploading && (
        <div style={{ marginTop: 10, color: theme.colors.muted }}>
          A carregar ficheiro... {progresso}%
          <div style={{ width: "100%", height: 12, background: theme.colors.border, borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
            <div style={{ height: "100%", background: theme.colors.secondary, width: `${progresso}%`, transition: "0.3s" }} />
          </div>
        </div>
      )}
    </div>
  );
}
