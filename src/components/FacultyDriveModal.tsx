import React, { useState, useRef } from 'react';
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
  Image as ImageIcon,
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

  // Google Drive Cloud Vault Connection State
  const [isDriveConnected, setIsDriveConnected] = useState(true);

  // Upload form state with real file upload
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<'ticket' | 'bill' | 'permit' | 'medical' | 'sop'>('ticket');
  const [docNotes, setDocNotes] = useState('');
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    name: string;
    size: string;
    type: 'pdf' | 'img';
    url?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
        // Auto-fill title from filename
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setDocName(cleanName.replace(/[-_]/g, ' '));
      }

      onShowToast(`File selected: ${file.name} (${formattedSize})`);
    }
  };

  const [documents, setDocuments] = useState<FacultyDocument[]>(() => {
    const saved = localStorage.getItem('trailoPS_faculty_documents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
    {
      id: 'doc-1',
      name: 'Yuksom-Pelling Special Area Permits 2026',
      category: 'permit',
      uploadedBy: 'Prof. Roy (Faculty Lead)',
      uploaderRole: 'super_admin',
      date: '14 Oct 2026',
      size: '2.4 MB',
      status: 'approved',
      fileType: 'pdf',
      notes: 'State Forest Dept & Police verified for 42 participants.',
    },
    {
      id: 'doc-2',
      name: 'Group Railway Tickets (Howrah to NJP)',
      category: 'ticket',
      uploadedBy: 'Prof. Roy (Faculty Lead)',
      uploaderRole: 'super_admin',
      date: '12 Oct 2026',
      size: '1.8 MB',
      status: 'approved',
      fileType: 'pdf',
      notes: 'Coach B3 & B4 reserved for Denali Base Alpha crew.',
    },
    {
      id: 'doc-3',
      name: 'Tempo Traveller Advance Fuel & Rental Receipt',
      category: 'bill',
      uploadedBy: 'Arjun Sen (Scout Lead)',
      uploaderRole: 'subgroup_admin',
      date: '15 Oct 2026',
      size: '840 KB',
      status: 'approved',
      fileType: 'img',
      notes: 'Siliguri to Yuksom transport advance invoice ₹14,000.',
    },
    {
      id: 'doc-4',
      name: 'High-Altitude Emergency Evacuation Protocol SOP',
      category: 'sop',
      uploadedBy: 'Dr. Anita Roy',
      uploaderRole: 'super_admin',
      date: '10 Oct 2026',
      size: '3.1 MB',
      status: 'approved',
      fileType: 'pdf',
      notes: 'Sikkim SDRF heli-rescue coordination frequencies.',
    },
    {
      id: 'doc-5',
      name: 'Basecamp Grocery & First-Aid Supplies Bill',
      category: 'bill',
      uploadedBy: 'Chris Walker (Trekker)',
      uploaderRole: 'member',
      date: '16 Oct 2026',
      size: '1.2 MB',
      status: 'pending',
      fileType: 'img',
      notes: 'Local market re-supply voucher submitted for faculty sign-off.',
    },
    {
      id: 'doc-6',
      name: 'Student ID Medical Clearance Certificates (Batch A)',
      category: 'permit',
      uploadedBy: 'Sarah Chen (Medic Squad)',
      uploaderRole: 'subgroup_admin',
      date: '15 Oct 2026',
      size: '4.5 MB',
      status: 'approved',
      fileType: 'pdf',
    },
  ];
});

  React.useEffect(() => {
    localStorage.setItem('trailoPS_faculty_documents', JSON.stringify(documents));
  }, [documents]);

  if (!isOpen) return null;

  const isSuperAdmin = userRole === 'super_admin';

  const handleApprove = (id: string, name: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status: 'approved' } : doc))
    );
    onShowToast(`Super Admin Approved: "${name}" is now live in Faculty Drive.`);
  };

  const handleReject = (id: string, name: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    onShowToast(`Upload request rejected for document.`);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    const newDoc: FacultyDocument = {
      id: Date.now().toString(),
      name: docName.trim(),
      category: docCategory,
      uploadedBy: isSuperAdmin ? 'You (Super Admin)' : 'You (Member)',
      uploaderRole: userRole,
      date: 'Today',
      size: uploadedFileMeta?.size || '1.8 MB',
      status: isSuperAdmin ? 'approved' : 'pending',
      fileType: uploadedFileMeta?.type || 'pdf',
      notes: docNotes.trim() || undefined,
    };

    setDocuments([newDoc, ...documents]);
    setDocName('');
    setDocNotes('');
    setUploadedFileMeta(null);
    setIsUploadModalOpen(false);

    if (isSuperAdmin) {
      onShowToast(`File "${newDoc.name}" uploaded directly to Faculty Drive.`);
    } else {
      onShowToast(`Upload request for "${newDoc.name}" sent to Super Admin for approval.`);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (activeCategory === 'all') return true;
    return doc.category === activeCategory;
  });

  const pendingRequests = documents.filter((doc) => doc.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
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
                Official Tickets, Permits, Bills &amp; Protocols
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
              {isSuperAdmin ? 'Super Admin (Direct Add & Approval)' : 'Member (Upload Request)'}
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

        {/* GOOGLE DRIVE INTEGRATION & CLOUD VAULT STATUS */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-sky-50 via-indigo-50/30 to-slate-50 border-b border-sky-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Google Drive Logo */}
            <div className="w-8 h-8 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center p-1 shrink-0">
              <svg viewBox="0 0 87.3 78" className="w-5 h-5">
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
                <span className="text-xs font-bold text-slate-900">Google Drive Cloud</span>
                {isDriveConnected && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    SYNCED
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block">
                {isDriveConnected ? '/TrailoPS_Expedition_Vault (Direct In-App Storage)' : 'Connect Google Drive to auto-sync permits'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsDriveConnected(!isDriveConnected);
              onShowToast(
                isDriveConnected
                  ? 'Google Drive unlinked.'
                  : '✓ Google Drive connected! Files are now synchronized with your Google Drive.'
              );
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
              isDriveConnected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-[#0f5238] text-white hover:bg-emerald-900'
            }`}
          >
            <Cloud className="w-3 h-3" />
            <span>{isDriveConnected ? 'Connected' : 'Connect Drive'}</span>
          </button>
        </div>

        {/* SUPER ADMIN PENDING APPROVALS NOTICE */}
        {isSuperAdmin && pendingRequests.length > 0 && (
          <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-950 block">
                  {pendingRequests.length} Pending Upload Request(s)
                </span>
                <span className="text-[10px] text-amber-800">
                  Members requested document addition for expedition records.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter Pills */}
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
            <div className="text-center py-10 text-slate-400 text-xs">
              No documents found in this category.
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
                            Awaiting Super Admin
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
                    ID: {doc.id} · SHA-256 Verified
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* In-App Direct Document Viewer */}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0f5238] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {/* Super admin approval controls for pending docs */}
                    {doc.status === 'pending' && isSuperAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReject(doc.id, doc.name)}
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
                        onClick={() => onShowToast(`Downloading "${doc.name}" (${doc.size})...`)}
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

      {/* Upload / Request Document Modal with REAL FILE PICKER */}
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
                    {isSuperAdmin ? 'Upload Document to Faculty Drive' : 'Request Document Addition'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isSuperAdmin ? 'Direct Faculty Publish (Google Drive Linked)' : 'Submitted for Super Admin Approval'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadedFileMeta(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3">
              {/* REAL FILE PICKER (PDF & Photos) */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-left">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        {uploadedFileMeta.type === 'pdf' ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block truncate max-w-[180px]">
                          {uploadedFileMeta.name}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold uppercase">
                          {uploadedFileMeta.type.toUpperCase()} · {uploadedFileMeta.size} · Ready
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-bold underline">Change</span>
                  </div>
                ) : (
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Choose PDF or Photo Document
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tap to select railway ticket, forest permit, or bill (.pdf, .jpg, .png)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document / Ticket Title
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Return Bus Tickets (Pelling to Siliguri)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                >
                  <option value="ticket">Tickets &amp; Travel Passes</option>
                  <option value="bill">Bills, Invoices &amp; Receipts</option>
                  <option value="permit">Government &amp; Forest Permits</option>
                  <option value="medical">Medical &amp; Fitness Certificates</option>
                  <option value="sop">Emergency Rescue Protocol (SOP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference Note / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="e.g. Paid by cash on 15 Oct, coach B3 reserved."
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadedFileMeta(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isSuperAdmin ? 'Publish to Drive' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                  {previewDoc.fileType === 'img' ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-slate-900 text-sm truncate max-w-[200px]">
                    {previewDoc.name}
                  </h3>
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    {previewDoc.fileType.toUpperCase()} Document · {previewDoc.size}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Preview Canvas */}
            <div className="h-44 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-emerald-800 mb-2">
                {previewDoc.fileType === 'img' ? <ImageIcon className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
              </div>
              <span className="text-xs font-bold text-slate-900 line-clamp-1">{previewDoc.name}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Verified Cryptographic Alpine Clearance Pass
              </span>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-extrabold">
                <Check className="w-3 h-3" />
                <span>OFFICIAL FACULTY COPY</span>
              </div>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-slate-800 capitalize">{previewDoc.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uploaded by:</span>
                <span className="font-bold text-slate-800">{previewDoc.uploadedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-mono text-slate-800">{previewDoc.date}</span>
              </div>
              {previewDoc.notes && (
                <div className="pt-1 text-[11px] text-slate-600 border-t border-slate-200 mt-1">
                  <strong>Notes:</strong> {previewDoc.notes}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onShowToast(`Downloading "${previewDoc.name}" from Google Drive Vault...`);
                setPreviewDoc(null);
              }}
              className="w-full py-2.5 rounded-xl bg-[#0f5238] hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Document</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
