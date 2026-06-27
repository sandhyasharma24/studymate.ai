import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdfsApi } from '../api/pdfs';
import { useUIStore } from '../store/uiStore';
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  Database,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';

interface PDFDoc {
  id: string;
  filename: string;
  fileSize: number;
  status: string;
  created_at?: string;
}

export const PDFs = () => {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<PDFDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useUIStore();

  const fetchPdfs = async () => {
    try {
      const data = await pdfsApi.list();
      setPdfs(data);
    } catch (err) {
      showToast('Failed to fetch uploaded PDFs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  useEffect(() => {
    const hasIndexing = pdfs.some(p => p.status === 'INDEXING' || p.status === 'UPLOADED');
    if (!hasIndexing) return;

    const interval = setInterval(fetchPdfs, 5000);
    return () => clearInterval(interval);
  }, [pdfs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are supported!', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      await pdfsApi.upload(file, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });
      showToast(`${file.name} uploaded successfully!`, 'success');
      fetchPdfs();
    } catch (err) {
      showToast('Failed to upload PDF file', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this PDF and its vector indexing?')) return;
    try {
      await pdfsApi.delete(id);
      showToast('PDF deleted successfully', 'info');
      fetchPdfs();
    } catch (err) {
      showToast('Failed to delete PDF', 'error');
    }
  };

  const handleTriggerIndex = async (id: string) => {
    try {
      await pdfsApi.triggerIndex(id);
      showToast('Indexing task scheduled over RabbitMQ!', 'success');
      fetchPdfs();
    } catch (err) {
      showToast('Failed to trigger indexing', 'error');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-r-2" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Upload Box */}
      <div 
        onClick={triggerFileSelect}
        className="glass-panel border-2 border-dashed border-slate-800 hover:border-primary/40 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 relative overflow-hidden group min-h-60"
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="text-sm font-semibold text-slate-300">Uploading File ({uploadProgress}%)</span>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-350"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 group-hover:scale-115 transition-transform duration-300">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 font-display">Drag & Drop course syllabus here</h3>
            <p className="text-xs text-slate-500 font-medium">Or click to select a PDF file from your device (Max 1GB)</p>
          </>
        )}
      </div>

      {/* PDFs List Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Your Course Documents</h2>
        
        {pdfs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm font-medium border border-dashed border-slate-850 rounded-2xl">
            You haven't uploaded any PDF files yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pdfs.map((pdf) => {
              const isIndexed = pdf.status === 'INDEXED';
              const isFailed = pdf.status === 'FAILED';
              const isProcessing = pdf.status === 'INDEXING' || pdf.status === 'UPLOADED';

              return (
                <div 
                  key={pdf.id}
                  onClick={() => {
                    if (isIndexed) {
                      navigate('/study', { state: { pdfId: pdf.id } });
                    }
                  }}
                  className={`glass-panel border border-slate-800/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 ${
                    isIndexed ? 'cursor-pointer hover:border-primary/30' : 'hover:border-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 text-slate-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate" title={pdf.filename}>
                        {pdf.filename}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {(pdf.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(pdf.id); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete PDF"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Status & Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-850/50">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                      {isIndexed && (
                        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> INDEXED
                        </span>
                      )}
                      {isFailed && (
                        <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <XCircle className="w-3 h-3" /> FAILED
                        </span>
                      )}
                      {isProcessing && (
                        <span className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 animate-pulse">
                          <Clock className="w-3 h-3" /> {pdf.status}
                        </span>
                      )}
                    </div>

                    {!isIndexed && !isProcessing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTriggerIndex(pdf.id); }}
                        className="flex items-center gap-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-all"
                      >
                        <Database className="w-3 h-3" />
                        <span>Build Index</span>
                      </button>
                    )}

                    {isIndexed && (
                      <span className="text-[10px] text-slate-550 font-medium">Ready for RAG Querying</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
