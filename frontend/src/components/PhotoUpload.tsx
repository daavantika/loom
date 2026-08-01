import { useState, type ChangeEvent } from 'react';
import { uploadFile } from '../lib/upload';

export default function PhotoUpload({
  label,
  onUploaded,
  accept = 'image/jpeg,image/png,image/webp',
}: {
  label: string;
  onUploaded: (url: string) => void;
  /** Defaults to images only — pass the wider FSSAI-document set explicitly where a PDF is valid. */
  accept?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photo-upload">
      <label className="outline-button" style={{ display: 'inline-block', cursor: uploading ? 'default' : 'pointer' }}>
        {uploading ? 'Uploading…' : label}
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <p style={{ color: '#c0392b', fontSize: 12, marginTop: 4 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
