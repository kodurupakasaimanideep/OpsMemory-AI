import React, { useState } from 'react';
import { Brain, ThumbsUp, ThumbsDown, CheckCircle2, X, Sparkles } from 'lucide-react';
import { resolveAndTeachMemory } from '../services/api';

interface TeachAIModalProps {
  incidentId: string;
  defaultRootCause?: string;
  defaultFix?: string;
  onClose: () => void;
  onSuccess: (newMemoryCount: number) => void;
}

export const TeachAIModal: React.FC<TeachAIModalProps> = ({
  incidentId,
  defaultRootCause = 'Database connection pool exhaustion',
  defaultFix = 'Increased pool size to 100 + rolled back deployment v2.4.1',
  onClose,
  onSuccess,
}) => {
  const [rootCause, setRootCause] = useState(defaultRootCause);
  const [fix, setFix] = useState(defaultFix);
  const [isUseful, setIsUseful] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await resolveAndTeachMemory(incidentId, {
        actual_root_cause: rootCause,
        actual_fix: fix,
        ai_recommendation_useful: isUseful,
        additional_notes: 'Validated by Nikhil (DevOps on-call)',
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onSuccess(res.new_memory_count || 2482);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed saving to memory:', err);
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(16, 185, 129, 0.15)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain size={22} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              Teach the AI — Incident Resolution
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Reinforce Hindsight Memory with verified ground truth from {incidentId}
            </div>
          </div>
        </div>

        {savedSuccess ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <CheckCircle2 size={48} color="var(--accent-emerald)" />
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
              ✓ New Experience Stored in Hindsight Memory
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Future queries matching this pattern will now receive 96% confidence recommendations.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                What was the actual root cause?
              </label>
              <textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                rows={2}
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                What fixed the problem?
              </label>
              <textarea
                value={fix}
                onChange={(e) => setFix(e.target.value)}
                rows={2}
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Was the AI recommendation useful?
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsUseful(true)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${isUseful ? 'var(--accent-emerald)' : 'var(--border-color)'}`,
                    background: isUseful ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: isUseful ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <ThumbsUp size={16} />
                  <span>YES, USEFUL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsUseful(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${!isUseful ? 'var(--accent-rose)' : 'var(--border-color)'}`,
                    background: !isUseful ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: !isUseful ? 'var(--accent-rose)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <ThumbsDown size={16} />
                  <span>NO, INCORRECT</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Sparkles size={16} />
                <span>{saving ? 'Saving...' : 'SAVE TO ORGANIZATIONAL MEMORY'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
