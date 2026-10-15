import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  sampleColumns: string[];
  sampleDataExample: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  sampleColumns,
  sampleDataExample
}) => {
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }
    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      handlePreview(content);
    };
    reader.readAsText(file);
  };

  const handlePreview = async (textToParse?: string) => {
    const raw = textToParse || csvText;
    if (!raw.trim()) {
      setStatusMessage('Please enter or upload CSV data first.');
      return;
    }

    const records = parseCSV(raw);
    if (records.length === 0) {
      setStatusMessage('Could not parse any valid data rows. Check header format.');
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setErrors([]);

    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, previewOnly: true })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error || 'Preview validation failed.');
      } else {
        setPreviewData(data.preview);
        setErrors(data.errors || []);
        setStatusMessage(`Validated ${records.length} records: ${data.validCount} valid, ${data.errorCount} conflicts/errors.`);
      }
    } catch (err) {
      setStatusMessage('Failed to validate records with server.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSubmit = async () => {
    const records = parseCSV(csvText);
    if (records.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, previewOnly: false, currentUser: 'Admin' })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error || 'Import failed.');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setStatusMessage('Import failed due to server error.');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setCsvText(sampleDataExample);
    handlePreview(sampleDataExample);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="text-xs text-slate-600 bg-sky-50 border border-sky-100 rounded-lg p-3">
            <p className="font-semibold text-sky-900">Supported Headers:</p>
            <p className="mt-0.5 font-mono text-sky-800">{sampleColumns.join(', ')}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Upload CSV / Excel File or Paste Text</label>
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-sky-600 hover:text-sky-800 font-medium"
              >
                Insert Sample Template
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
            </div>

            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste raw CSV content here..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => handlePreview()}
              disabled={loading || !csvText.trim()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50"
            >
              {loading ? 'Validating...' : 'Preview & Validate Records'}
            </button>
          </div>

          {/* Validation Status */}
          {statusMessage && (
            <div className="p-3 rounded-lg text-xs bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Errors list */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 max-h-32 overflow-y-auto space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Found {errors.length} validation errors:
              </p>
              {errors.map((err, i) => (
                <p key={i}>Row {err.row}: {err.error} {err.reg_no ? `(${err.reg_no})` : ''}</p>
              ))}
            </div>
          )}

          {/* Preview Table */}
          {previewData && previewData.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Preview (First 10 records)</p>
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48 text-xs">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-medium text-slate-600">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Reg No</th>
                      <th className="px-3 py-1.5 text-left">Name</th>
                      <th className="px-3 py-1.5 text-left">Dept</th>
                      <th className="px-3 py-1.5 text-left">Sem</th>
                      <th className="px-3 py-1.5 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {previewData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono font-medium">{row.reg_no}</td>
                        <td className="px-3 py-1.5">{row.name}</td>
                        <td className="px-3 py-1.5">{row.department}</td>
                        <td className="px-3 py-1.5">{row.semester}</td>
                        <td className="px-3 py-1.5 text-slate-500">{row.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={loading || !previewData || previewData.length === 0}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Confirm & Import to Database'}
          </button>
        </div>

      </div>
    </div>
  );
};
