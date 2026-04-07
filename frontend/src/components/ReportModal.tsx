import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { adminService } from '../services/admin.service';

interface ReportModalProps {
  postId: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Spam',
  'Ảnh khỏa thân hoặc hoạt động tình dục',
  'Bạo lực',
  'Quấy rối hoặc bắt nạt',
  'Thông tin sai sự thật',
  'Ngôn từ gây thù ghét',
  'Vấn đề khác'
];

export const ReportModal: React.FC<ReportModalProps> = ({ postId, onClose }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const finalReason = selectedReason === 'Vấn đề khác' ? otherReason.trim() : selectedReason;
    if (!finalReason) {
      toast.error('Vui lòng chọn lý do báo cáo');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createReport('post', postId, finalReason);
      toast.success('Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét bài viết này.');
      onClose();
    } catch {
      toast.error('Lỗi khi gửi báo cáo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-bold text-gray-900">Báo cáo bài viết</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
             <svg viewBox="0 0 24 24" className="h-5 w-5"><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
        </div>
        <div className="p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <p className="mb-4 text-sm text-gray-600">
            Hãy chọn vấn đề bạn gặp phải để chúng tôi có thể xử lý nhanh nhất.
          </p>
          <div className="flex flex-col space-y-2">
            {REPORT_REASONS.map(r => (
              <label key={r} className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50">
                <span className="text-sm font-medium text-gray-900">{r}</span>
                <input 
                  type="radio" 
                  name="report_reason" 
                  value={r} 
                  checked={selectedReason === r} 
                  onChange={(e) => setSelectedReason(e.target.value)} 
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600" 
                />
              </label>
            ))}
            {selectedReason === 'Vấn đề khác' && (
              <textarea
                autoFocus
                placeholder="Vui lòng mô tả rõ hơn..."
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                className="mt-2 min-h-[80px] w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            )}
          </div>
        </div>
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason || (selectedReason === 'Vấn đề khác' && !otherReason.trim())}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </div>
    </div>
  );
};
