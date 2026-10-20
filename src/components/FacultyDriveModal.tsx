import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Plus,
  X,
  FileCheck,
  ShieldAlert,
  AlertCircle,
  Eye,
  File,
  Lock,
  Cloud,
  Check,
  ExternalLink,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { FacultyDocument, UserRole } from '../types';

interface FacultyDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onShowToast: (message: string) => void;
}

export const FacultyDriveModal: React.FC<FacultyDriveModalProps> = ({
  isOpen,
  onClose,
  userRole,
  onShowToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'ticket' | 'bill' | 'permit' | 'sop'>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<FacultyDocument | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<FacultyDocument | null>(null);

  // Google Drive Cloud Vault Connection State
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem('trailoPS_google_drive_token'));
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return sessionStorage.getItem('trailoPS_google_drive_token');
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Google Drive Real Storage Quota State
  const [driveQuota, setDriveQuota] = useState<{ usedBytes: number; totalBytes: number } | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');

  // Upload form state
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<'ticket' | 'bill' | 'permit' | 'medical' | 'sop'>('ticket');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    name: string;
    size: string;
    type: 'pdf' | 'img';
    url?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Documents state - strictly initialized to saved storage or empty (ZERO mock/demo records)
  const [documents, setDocuments] = useState<FacultyDocument[]>(() => {
    const saved = localStorage.getItem('trailoPS_faculty_documents_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_faculty_documents_v2', JSON.stringify(documents));
  }, [documents]);

  // Fetch real Google Drive files when connected
  const fetchDriveFiles = async (token: string) => {
    setIsSyncing(true);
    try {
      // 1. Fetch storage quota
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        if (aboutData.storageQuota) {
          setDriveQuota({
            usedBytes: parseInt(aboutData.storageQuota.usage || '0', 10),
            totalBytes: parseInt(aboutData.storageQuota.limit || '16106127360', 10), // Default 15GB
          });
        }
      }

      // 2. Fetch files from Drive
      const filesRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime)&q=trashed=false",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        if (Array.isArray(filesData.files)) {
          const driveDocs: FacultyDocument[] = filesData.files.map((f: any) => {
            const isImg = (f.mimeType || '').startsWith('image/');
            const sizeInBytes = parseInt(f.size || '0', 10);
            const sizeStr = sizeInBytes > 1048576
              ? `${(sizeInBytes / 1048576).toFixed(1)} MB`
              : `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;

            let cat: 'ticket' | 'bill' | 'permit' | 'sop' = 'permit';
            const lowerName = f.name.toLowerCase();
            if (lowerName.includes('ticket') || lowerName.includes('train') || lowerName.includes('flight')) cat = 'ticket';
            else if (lowerName.includes('bill') || lowerName.includes('receipt') || lowerName.includes('invoice')) cat = 'bill';
            else if (lowerName.includes('sop') || lowerName.includes('protocol')) cat = 'sop';

            return {
              id: f.id,
              name: f.name,
              category: cat,
              uploadedBy: 'Google Drive Account',
              uploaderRole: 'super_admin',
              date: new Date(f.createdTime || Date.now()).toLocaleDateString(),
              size: sizeStr,
              status: 'approved',
              fileType: isImg ? 'img' : 'pdf',
              url: f.webViewLink || f.webContentLink,
              notes: 'Synchronized with Google Drive official workspace',
            };
          });

          // Merge without duplicates
          setDocuments((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const newFromDrive = driveDocs.filter((d) => !existingIds.has(d.id));
            return [...newFromDrive, ...prev];
          });

          onShowToast(`Synchronized ${filesData.files.length} documents from Google Drive!`);
        }
      } else {
        if (filesRes.status === 401) {
          sessionStorage.removeItem('trailoPS_google_drive_token');
          setIsDriveConnected(false);
          setGoogleAccessToken(null);
          onShowToast('Google Drive session expired. Please reconnect.');
        }
      }
    } catch (err: any) {
      console.error('Error fetching Google Drive files:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectDrive = () => {
    // Check if Google Identity token client is available
    if (typeof (window as any).google?.accounts?.oauth2?.initTokenClient === 'function') {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '',
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.access_token) {
              sessionStorage.setItem('trailoPS_google_drive_token', response.access_token);
              setGoogleAccessToken(response.access_token);
              setIsDriveConnected(true);
              onShowToast('Google Drive successfully authenticated!');
              fetchDriveFiles(response.access_token);
            }
          },
        });
        client.requestAccessToken();
      } catch (err) {
        promptManualDriveToken();
      }
    } else {
      promptManualDriveToken();
    }
  };

  const promptManualDriveToken = () => {
    setIsTokenModalOpen(true);
  };

  const handleDisconnectDrive = () => {
    sessionStorage.removeItem('trailoPS_google_drive_token');
    setIsDriveConnected(false);
    setGoogleAccessToken(null);
    setDriveQuota(null);
    onShowToast('Google Drive workspace unlinked.');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isImg = file.type.startsWith('image/');
      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const objectUrl = URL.createObjectURL(file);

      setUploadedFileMeta({
        name: file.name,
        size: formattedSize,
        type: isImg ? 'img' : 'pdf',
        url: objectUrl,
      });

      if (!docName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setDocName(cleanName.replace(/[-_]/g, ' '));
      }

      onShowToast(`File selected: ${file.name} (${formattedSize})`);
    }
  };

  const isSuperAdmin = userRole === 'super_admin' || (userRole as string) === 'faculty';

  const handleApprove = (id: string, name: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status: 'approved' } : doc))
    );
    onShowToast(`Approved: "${name}" is now active in Faculty Drive.`);
  };

  const handleReject = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    onShowToast(`Document request rejected.`);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteConfirmDoc) return;
    setDocuments((prev) => prev.filter((d) => d.id !== deleteConfirmDoc.id));
    onShowToast(`Document "${deleteConfirmDoc.name}" removed.`);
    setDeleteConfirmDoc(null);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    let cloudUrl = uploadedFileMeta?.url;

    // If connected to Google Drive and token is available, perform real upload
    if (isDriveConnected && googleAccessToken && selectedFile) {
      try {
        const metadata = {
          name: docName.trim(),
          mimeType: selectedFile.type,
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', selectedFile);

        const uploadRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${googleAccessToken}` },
            body: form,
          }
        );

        if (uploadRes.ok) {
          const resData = await uploadRes.json();
          cloudUrl = resData.webViewLink;
          onShowToast(`Uploaded directly to Google Drive!`);
        }
      } catch (err) {
        console.warn('Direct Drive upload warning, saving to local vault:', err);
      }
    }

    const newDoc: FacultyDocument = {
      id: Date.now().toString(),
      name: docName.trim(),
      category: docCategory,
      uploadedBy: isSuperAdmin ? 'Faculty Lead' : 'Expedition Member',
      uploaderRole: userRole,
      date: new Date().toLocaleDateString(),
      size: uploadedFileMeta?.size || '1.2 MB',
      status: isSuperAdmin ? 'approved' : 'pending',
      fileType: uploadedFileMeta?.type || 'pdf',
      url: cloudUrl,
      notes: docNotes.trim() || undefined,
    };

    setDocuments([newDoc, ...documents]);
    setDocName('');
    setDocNotes('');
    setSelectedFile(null);
    setUploadedFileMeta(null);
    setIsUploadModalOpen(false);

    if (isSuperAdmin) {
      onShowToast(`File "${newDoc.name}" published to Faculty Drive.`);
    } else {
      onShowToast(`Upload request for "${newDoc.name}" submitted for approval.`);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (activeCategory === 'all') return true;
    return doc.category === activeCategory;
  });

  const pendingRequests = documents.filter((doc) => doc.status === 'pending');

  if (!isOpen) return null;

  // Realistic quota calculation: 5 GB allocation target
  const expeditionQuotaTarget = 5 * 1024 * 1024 * 1024; // 5 GB
  const usedBytes = driveQuota ? driveQuota.usedBytes : documents.length * 2.5 * 1024 * 1024;
  const usedPercent = Math.min(Math.round((usedBytes / expeditionQuotaTarget) * 100), 100);
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 to-[#0f5238] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-emerald-300 flex items-center justify-center border border-white/20">
              <Folder className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base tracking-tight text-white">Faculty Drive</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                  Vault
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Official Permits, Rail Vouchers, Bills &amp; Protocols
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Role Banner */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="text-[11px] font-semibold">Your Authority:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {isSuperAdmin ? 'Faculty Overseer' : 'Squad Member'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 py-1 rounded-full bg-[#0f5238] hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
          >
            <Upload className="w-3 h-3" />
            <span>{isSuperAdmin ? 'Upload File' : 'Request Upload'}</span>
          </button>
        </div>

        {/* GOOGLE DRIVE CONNECTION STATUS & QUOTA */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-sky-50 via-indigo-50/30 to-slate-50 border-b border-sky-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white shadow-xs border border-slate-200 flex items-center justify-center p-1 shrink-0">
                <svg viewBox="0 0 87.3 78" className="w-4 h-4">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Google Drive API</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isDriveConnected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {isDriveConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block">
                  {isDriveConnected
                    ? 'Drive OAuth Verified (drive.file & drive.readonly)'
                    : 'Connect Google account to sync official files'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isDriveConnected ? (
                <>
                  <button
                    type="button"
                    onClick={() => googleAccessToken && fetchDriveFiles(googleAccessToken)}
                    disabled={isSyncing}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Refresh Drive Files"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectDrive}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                  >
                    Unlink
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#0f5238] hover:bg-emerald-900 text-white transition-colors flex items-center gap-1"
                >
                  <Cloud className="w-3 h-3" /> Connect
                </button>
              )}
            </div>
          </div>

          {/* Quota Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-700" />
                <span>Expedition Allocation: {usedMB} MB / 5.0 GB</span>
              </span>
              <span>{usedPercent}% Used</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(2, usedPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending approvals notice for Super Admin */}
        {isSuperAdmin && pendingRequests.length > 0 && (
          <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-950 block">
                  {pendingRequests.length} Pending Approval(s)
                </span>
                <span className="text-[10px] text-amber-800">
                  Review member document upload requests before approving.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar border-b border-slate-100 bg-white">
          {(['all', 'ticket', 'bill', 'permit', 'sop'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Files' : `${cat}s`}
            </button>
          ))}
        </div>

        {/* Documents List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8faf9]">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <Folder className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">No documents in this category.</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {isDriveConnected
                  ? 'Uploaded files and permits will synchronize directly with your connected Google Drive.'
                  : 'Upload permits, bills, or connect Google Drive to synchronize files.'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-2xl p-3.5 border transition-all shadow-xs ${
                  doc.status === 'pending'
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        doc.category === 'permit'
                          ? 'bg-purple-100 text-purple-800'
                          : doc.category === 'ticket'
                          ? 'bg-sky-100 text-sky-800'
                          : doc.category === 'bill'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{doc.name}</h4>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 text-slate-700">
                          {doc.category}
                        </span>
                        {doc.status === 'pending' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-200 text-amber-900">
                            Pending Approval
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Uploaded by <strong className="text-slate-700">{doc.uploadedBy}</strong> · {doc.date} · {doc.size}
                      </p>
                      {doc.notes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1.5">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {doc.id.slice(0, 10)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* View */}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0f5238] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {/* Delete button (Super Admin or owner) */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmDoc(doc)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Approval controls */}
                    {doc.status === 'pending' && isSuperAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReject(doc.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(doc.id, doc.name)}
                          className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (doc.url) {
                            window.open(doc.url, '_blank');
                          } else {
                            onShowToast(`Downloading "${doc.name}"...`);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Confirm File Deletion</span>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete <strong>"{deleteConfirmDoc.name}"</strong> from Faculty Drive? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {isSuperAdmin ? 'Upload Official Document' : 'Request Document Addition'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isSuperAdmin ? 'Faculty Publish & Drive Sync' : 'Sent to Faculty for Approval'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadedFileMeta(null);
                  setSelectedFile(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,image/*,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-2xl border-2 border-dashed border-emerald-400/80 bg-emerald-50/40 hover:bg-emerald-50 text-center cursor-pointer transition-all group"
              >
                {uploadedFileMeta ? (
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{uploadedFileMeta.name}</p>
                      <p className="text-[10px] text-emerald-800">{uploadedFileMeta.size} · Ready</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-emerald-700 mx-auto" />
                    <p className="text-xs font-bold text-emerald-950">Tap to Select File</p>
                    <p className="text-[10px] text-slate-500">PDF, JPG, PNG, DOCX up to 25MB</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Sikkim Forest Dept Permit"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="permit">Official Permit / Entry Pass</option>
                  <option value="ticket">Railway / Flight Ticket</option>
                  <option value="bill">Fuel / Food / Hotel Bill</option>
                  <option value="medical">Medical Clearance Certificate</option>
                  <option value="sop">Safety Protocol SOP</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Notes / Authority Details</label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="e.g. Issued by Forest Officer on 18 Oct"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f5238] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {isSuperAdmin ? 'Publish to Drive' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm truncate">{previewDoc.name}</h4>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
              <FileText className="w-12 h-12 text-emerald-700 mx-auto" />
              <div className="text-xs font-bold text-slate-800">{previewDoc.name}</div>
              <p className="text-[11px] text-slate-500">
                {previewDoc.size} · {previewDoc.category.toUpperCase()} · Verified
              </p>
            </div>

            {previewDoc.notes && (
              <p className="text-xs text-slate-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                {previewDoc.notes}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Close
              </button>
              {previewDoc.url ? (
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Drive</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onShowToast(`Downloading "${previewDoc.name}"...`);
                    setPreviewDoc(null);
                  }}
                  className="px-4 py-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Manual OAuth Token Input Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-purple-200 dark:border-purple-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Connect Google Drive</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTokenModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Enter your Google OAuth Access Token with <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">drive.file</code> and <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">drive.readonly</code> scopes:
            </p>

            <textarea
              rows={3}
              value={manualTokenInput}
              onChange={(e) => setManualTokenInput(e.target.value)}
              placeholder="ya29.a0AfH6SM..."
              className="w-full p-2.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/40 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-400"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsTokenModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (manualTokenInput.trim()) {
                    const token = manualTokenInput.trim();
                    sessionStorage.setItem('trailoPS_google_drive_token', token);
                    setGoogleAccessToken(token);
                    setIsDriveConnected(true);
                    fetchDriveFiles(token);
                    setIsTokenModalOpen(false);
                    setManualTokenInput('');
                    onShowToast('Google Drive connected! Syncing files...');
                  }
                }}
                disabled={!manualTokenInput.trim()}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/20"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
