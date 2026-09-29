import React, { useState } from 'react';
import { CheckSquare, Square, Terminal, BookOpen, Layers, CheckCircle2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { RecommendedAction } from '../types/incident';

interface RecommendationCardProps {
  actions: RecommendedAction[];
  onViewEvidence: () => void;
  onOpenRunbook: (runbookId?: string) => void;
  onTakeAction: () => void;
  onTeachAI: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  actions,
  onViewEvidence,
  onOpenRunbook,
  onTakeAction,
  onTeachAI,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
  const [expandedWhy, setExpandedWhy] = useState<number | null>(null);

  const toggleStep = (step: number) => {
    if (completedSteps.includes(step)) {
      setCompletedSteps(completedSteps.filter((s) => s !== step));
    } else {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const toggleWhy = (e: React.MouseEvent, step: number) => {
    e.stopPropagation();
    setExpandedWhy(expandedWhy === step ? null : step);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          RECOMMENDED INVESTIGATION & RESOLUTION
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {completedSteps.length} of {actions.length} Completed
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {actions.map((act) => {
          const isDone = completedSteps.includes(act.step);
          const isWhyOpen = expandedWhy === act.step;

          return (
            <div
              key={act.step}
              onClick={() => toggleStep(act.step)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px 16px',
                borderRadius: '8px',
                background: isDone ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ marginTop: '2px' }}>
                  {isDone ? (
                    <CheckSquare size={18} color="var(--accent-emerald)" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      fontWeight: 600,
                    }}
                  >
                    {act.action}
                  </div>

                  {act.command && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        background: '#000',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--accent-cyan)',
                        overflowX: 'auto',
                      }}
                    >
                      $ {act.command}
                    </div>
                  )}

                  {/* Explainability Accordion: Why? */}
                  {act.why && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => toggleWhy(e, act.step)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-purple)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                        }}
                      >
                        <HelpCircle size={13} />
                        <span>Why recommend this check?</span>
                        {isWhyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {isWhyOpen && (
                        <div
                          style={{
                            marginTop: '6px',
                            padding: '8px 12px',
                            background: 'rgba(139, 92, 246, 0.08)',
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                          }}
                        >
                          <strong>Explainability Engine:</strong> {act.why}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
        <button
          onClick={onViewEvidence}
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={15} color="var(--accent-cyan)" />
          <span>View Memory Evidence</span>
        </button>

        <button
          onClick={() => onOpenRunbook('database-recovery')}
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <BookOpen size={15} color="var(--accent-purple)" />
          <span>Runbook: Database Recovery</span>
        </button>

        <button
          onClick={onTakeAction}
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Terminal size={15} color="var(--accent-amber)" />
          <span>Execute Mitigation</span>
        </button>

        <button
          onClick={onTeachAI}
          style={{
            background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
            border: 'none',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
          }}
        >
          <CheckCircle2 size={16} />
          <span>Confirm & Save to Memory</span>
        </button>
      </div>
    </div>
  );
};
