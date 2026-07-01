import React from "react";

export default function UploadDocumentos({ file, setFile, onUpload, uploading, progresso }) {
  return (
    <div>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} />
      <button style={{ marginTop: 10 }} onClick={onUpload}>Upload</button>
      {uploading && (
        <div style={{ marginTop: 10 }}>
          A carregar ficheiro... {progresso}%
          <div style={{ width: "100%", height: 12, background: "#e2e8f0", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
            <div style={{ height: "100%", background: "#22c55e", width: `${progresso}%`, transition: "0.3s" }} />
          </div>
        </div>
      )}
    </div>
  );
}
