import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from '@phosphor-icons/react';
import { adminService } from '../services/admin.service';

interface ReportModalProps {
  targetId: string;
  targetType: 'post' | 'comment';
  onClose: () => void;
}

const REPORT_REASONS = [
  'Spam',
  'Ảnh khỏa thân hoặc hoạt động tình dục',
  'Bạo lực',
  'Quấy rối hoặc bắt nạt',
  'Thông tin sai sự thật',
  'Ngôn từ gây thù ghét',
  'Vấn đề khác',
];

export const ReportModal: React.FC<ReportModalProps> = ({ targetId, targetType, onClose }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    const finalReason = selectedReason === 'Vấn đề khác' ? otherReason.trim() : selectedReason;
    if (!finalReason) {
      toast.error('Vui lòng chọn lý do báo cáo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createReport(targetType, targetId, finalReason);
      toast.success(
        targetType === 'post'
          ? 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét bài viết này.'
          : 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét bình luận này.',
      );
      onClose();
    } catch {
      toast.error('Lỗi khi gửi báo cáo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(28,30,33,0.72)] p-4 backdrop-blur-md [overscroll-behavior:contain]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="surface-card flex w-full max-w-sm flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <p id="report-title" className="text-base font-bold text-[var(--app-text)]">
            {targetType === 'post' ? 'Báo cáo bài viết' : 'Báo cáo bình luận'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="interactive-icon spring-ease inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
            aria-label="Đóng báo cáo"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto p-4">
          <p className="mb-4 text-sm text-[var(--app-muted)]">
            Hãy chọn vấn đề bạn gặp phải để chúng tôi có thể xử lý nhanh nhất.
          </p>
          <div className="flex flex-col space-y-2">
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason}
                className="spring-ease flex cursor-pointer items-center justify-between rounded-lg border border-[var(--app-border)] p-3 hover:bg-[var(--app-bg-soft)]"
              >
                <span className="text-sm font-medium text-[var(--app-text)]">{reason}</span>
                <input
                  type="radio"
                  name="report_reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(event) => setSelectedReason(event.target.value)}
                  className="h-4 w-4 accent-[var(--app-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                />
              </label>
            ))}
            {selectedReason === 'Vấn đề khác' ? (
              <textarea
                autoFocus
                placeholder="Vui lòng mô tả rõ hơn..."
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                className="mt-2 min-h-[80px] w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
                name="report-other-reason"
                spellCheck={false}
              />
            ) : null}
          </div>
        </div>
        <div className="border-t border-[var(--app-border)] bg-[var(--app-bg-soft)] p-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason || (selectedReason === 'Vấn đề khác' && !otherReason.trim())}
            className="btn-tactile spring-ease w-full rounded-lg bg-[var(--app-primary)] py-2.5 font-bold text-white hover:bg-[var(--app-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] disabled:bg-[var(--app-border)] disabled:text-[var(--app-muted)]"
          >
            {isSubmitting ? 'Đang gửi…' : 'Gửi báo cáo'}
          </button>
        </div>
      </div>
    </div>
  );
};
