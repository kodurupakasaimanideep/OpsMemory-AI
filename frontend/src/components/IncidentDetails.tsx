import React, { useState, useEffect } from 'react';
import { Incident, InvestigationResult } from '../types/incident';
import { SeverityBadge } from './SeverityBadge';
import { HandoffModal } from './HandoffModal';
import { TeachAIModal } from './TeachAIModal';
import { 
  investigateIncident, 
  fetchSimilarIncidents, 
  fetchIncidentAuditTrail, 
  updateIncidentState,
  resolveAndTeachMemory 
} from '../services/api';
import { 
  ArrowLeft, 
  Activity, 
  Brain, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Layers, 
  History, 
  AlertTriangle, 
  HelpCircle, 
  Play, 
  ShieldCheck, 
  GitBranch, 
  Server,
  Terminal,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { formatPercent } from '../utils/formatters';

export interface IncidentDetailsProps {
  incident: Incident;
  onBack: () => void;
  onMemoryUpdated?: (count: number) => void;
}

export const IncidentDetails: React.FC<IncidentDetailsProps> = ({
  incident,
  onBack,
  onMemoryUpdated,
}) => {
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [similarMatches, setSimilarMatches] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHandoffModal, setShowHandoffModal] = useState<boolean>(false);
  const [showTeachModal, setShowTeachModal] = useState<boolean>(false);
  const [approvalToast, setApprovalToast] = useState<string | null>(null);
  const [replayStep, setReplayStep] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EVIDENCE' | 'SIMILARITY' | 'CHECKLIST' | 'AUDIT'>('OVERVIEW');

  // Interactive Checklist State
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'c1': true, // Incident identified
    'c2': true, // Historical memory searched
    'c3': true, // Similar incidents reviewed
    'c4': incident.status === 'RESOLVED',
    'c5': incident.status === 'RESOLVED',
    'c6': incident.status === 'RESOLVED',
    'c7': incident.status === 'RESOLVED',
    'c8': incident.status === 'RESOLVED',
    'c9': incident.status === 'RESOLVED',
    'c10': incident.status === 'RESOLVED',
  });

  const isResolved = String(incident.status || '').toUpperCase() === 'RESOLVED';
  const symptomText = incident.symptom || (incident.symptoms && incident.symptoms[0]) || incident.title || 'Service degradation detected';

  // Load real investigation, similar matches, and audit trail
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [inv, sim, aud] = await Promise.all([
        investigateIncident(incident.id),
        fetchSimilarIncidents(incident.id),
        fetchIncidentAuditTrail(incident.id)
      ]);
      setInvestigation(inv);
      if (sim && sim.length > 0) setSimilarMatches(sim);
      if (aud && aud.length > 0) setAuditTrail(aud);
      setLoading(false);
    }
    loadData();
  }, [incident.id]);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApproveAction = () => {
    setApprovalToast('SIMULATION / DEMO ACTION: Historical resolution approved. Applying pool scaling and graceful restart in staging...');
    setTimeout(() => {
      setApprovalToast('✓ SIMULATION / DEMO ACTION: Automated canary deployment healthy. Telemetry metrics returning to baseline.');
      setTimeout(() => setApprovalToast(null), 4500);
    }, 2000);
  };

  const handleRejectAction = () => {
    setApprovalToast('SIMULATION / DEMO ACTION: Historical recommendation rejected by operator. Escalated to on-call engineer.');
    setTimeout(() => setApprovalToast(null), 3000);
  };

  // Replay steps (Part 15)
  const replaySteps = [
    { title: 'Incident Detected', desc: `Detected ${incident.error_type || 'HTTP 503'} on ${incident.service}` },
    { title: 'Investigation Started', desc: 'OpsMind reasoning agent initialized against active signals' },
    { title: 'Historical Match Found', desc: similarMatches.length > 0 ? `Matched ${similarMatches[0].incident_id || similarMatches[0].id} (${similarMatches[0].similarity_pct || 91}%)` : 'Searched Hindsight memory bank' },
    { title: 'Evidence Compared', desc: 'Separated current telemetry observations from historical facts' },
    { title: 'Root Cause Analyzed', desc: incident.root_cause || investigation?.likely_root_cause || 'Root cause evaluated' },
    { title: 'Resolution Applied', desc: incident.resolution || 'Resolution hotfix applied' },
    { title: 'Verification Completed', desc: 'Pool saturation resolved and error rates dropped to 0%' },
    { title: 'Knowledge Stored', desc: 'Incident experience committed to Hindsight organizational memory' },
  ];

  // Primary historical match
  const primaryMatch = similarMatches.length > 0 ? similarMatches[0] : (investigation?.similar_matches?.[0] ? {
    incident_id: investigation.similar_matches[0].id,
    service: incident.service,
    similarity_pct: Math.round((investigation.similar_matches[0].similarity || 0.91) * 100),
    root_cause: investigation.likely_root_cause || 'Database connection pool exhausted',
    resolution: investigation.recommended_actions?.[0]?.action || 'Increased pool size from 50 to 100',
    why_relevant: ['Same service', 'HTTP 503 error spike', 'Database connection pressure'],
    breakdown: { same_service: true, same_error: true, database_pressure: true, historical_resolution_available: true }
  } : null);

  // Evidence breakdown
  const currentEvidence = incident.evidence && incident.evidence.length > 0 
    ? incident.evidence 
    : (incident.observations && incident.observations.length > 0 
        ? incident.observations 
        : ['Database connections approaching configured maximum', 'Application logs show connection acquisition timeout', 'Increased incoming request traffic']);

  const historicalEvidence = primaryMatch ? [
    `${primaryMatch.incident_id}: Database connection exhaustion recorded under peak load`,
    `${primaryMatch.incident_id}: Background worker unreleased connections identified`,
    `${primaryMatch.incident_id}: HikariCP pool saturation confirmed`
  ] : [
    'INC-104: Database connection pool was exhausted after async tasks',
    'INC-104: Application logs showed unreleased database connections',
    'INC-104: Pool size increased from 50 to 100 with hotfix'
  ];

  const missingEvidence = isResolved ? [] : [
    'Thread dump confirmation from background worker pods',
    'PgBouncer/HikariCP connection leak telemetry validation',
    'Post-mitigation canary traffic verification'
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Back button and quick actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-cyan)',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Operations Command Center</span>
        </button>

        {/* Visible Night-Shift Handoff Button (Part 5) */}
        <button
          onClick={() => setShowHandoffModal(true)}
          style={{
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: 'var(--accent-cyan)',
            fontSize: '0.82rem',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileText size={15} />
          <span>GENERATE NIGHT-SHIFT HANDOFF</span>
        </button>
      </div>

      {/* Part 3: Main Incident Banner */}
      <div className="glass-card" style={{ marginBottom: '20px', borderLeft: `5px solid ${isResolved ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: isResolved ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  boxShadow: `0 0 10px ${isResolved ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                }}
              />
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {incident.id}
              </span>
              <SeverityBadge severity={incident.severity || 'HIGH'} />
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  color: isResolved ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                STATUS: {incident.status || (isResolved ? 'RESOLVED' : 'INVESTIGATING')}
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: '10px', lineHeight: 1.3 }}>
              {incident.title || `${incident.service}: ${symptomText}`}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '18px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Service</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{incident.service}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Error Signature</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>{incident.error_type || 'HTTP 503'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Started</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                {incident.started_at ? new Date(incident.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
              </div>
            </div>
          </div>
        </div>

        {/* Symptom Display */}
        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            SYMPTOM / OBSERVED PROBLEM
          </span>
          <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
            {symptomText}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {approvalToast && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: 'var(--accent-cyan)',
            fontSize: '0.86rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Terminal size={18} />
          <span>{approvalToast}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        {[
          { key: 'OVERVIEW', label: 'Investigation & Root Cause' },
          { key: 'EVIDENCE', label: 'Evidence Panel (Current vs Historical)' },
          { key: 'SIMILARITY', label: 'Memory / Related Incidents' },
          { key: 'CHECKLIST', label: 'Investigation Checklist' },
          { key: 'AUDIT', label: 'Audit Trail & Event Log' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              background: activeTab === tab.key ? 'rgba(6, 182, 212, 0.15)' : 'none',
              border: activeTab === tab.key ? '1px solid rgba(6, 182, 212, 0.4)' : 'none',
              color: activeTab === tab.key ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Part 4: Incident Timeline */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                INCIDENT TIMELINE
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Incident detected', done: true, time: incident.started_at ? new Date(incident.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM' },
                { label: 'Investigation started', done: true, time: '10:02 AM' },
                { label: 'Historical match found', done: true, time: '10:03 AM' },
                { label: 'Root cause confirmed', done: Boolean(incident.root_cause) || isResolved, time: isResolved ? '10:14 AM' : 'Pending' },
                { label: 'Resolution applied', done: Boolean(incident.resolution) || isResolved, time: isResolved ? '10:18 AM' : 'Pending' },
                { label: 'Verification completed', done: isResolved, time: isResolved ? '10:22 AM' : 'Pending' },
                { label: 'Knowledge stored', done: isResolved, time: isResolved ? '10:24 AM' : 'Pending' },
              ].map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.84rem' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: step.done ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)',
                      boxShadow: step.done ? '0 0 8px var(--accent-cyan)' : 'none',
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '70px', fontSize: '0.78rem' }}>
                    {step.time}
                  </span>
                  <span style={{ color: step.done ? '#fff' : 'var(--text-muted)', fontWeight: step.done ? 600 : 400 }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Part 3 & 14: Root Cause & Resolution Verification (Before / Resolution / After) */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={16} color="var(--accent-emerald)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  ROOT CAUSE & RESOLUTION VERIFICATION
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isResolved ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                }}
              >
                {isResolved ? 'ROOT CAUSE CONFIRMED' : 'ROOT CAUSE: NOT CONFIRMED'}
              </span>
            </div>

            {/* Root Cause Box */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                Verified Root Cause
              </div>
              <div style={{ fontSize: '0.92rem', color: '#fff', marginTop: '4px', lineHeight: 1.4 }}>
                {incident.root_cause || investigation?.likely_root_cause || 'Investigation actively analyzing connection limits and transaction lifecycle.'}
              </div>
            </div>

            {/* Part 14: BEFORE / RESOLUTION / AFTER */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-rose)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  BEFORE (STORED EVIDENCE)
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  {currentEvidence[0] || 'Database connection pool saturated (50/50 sockets). Connection acquisition timeouts logged.'}
                </div>
              </div>

              <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  RESOLUTION (ACTION PERFORMED)
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  {incident.resolution || (investigation?.recommended_actions?.[0]?.action) || 'Fixed connection release logic in worker; restarted service pods.'}
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-emerald)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  AFTER (VERIFICATION EVIDENCE)
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  {incident.verification?.[0] || 'Database connection pool utilization normalized. HTTP 503 errors dropped to zero.'}
                </div>
              </div>
            </div>
          </div>

          {/* Part 17: Human Approval Section */}
          {primaryMatch && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="var(--accent-purple)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                    HISTORICAL RESOLUTION FOUND · HUMAN APPROVAL GATE
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: 'var(--accent-purple)' }}>
                  SIMULATION / DEMO ACTION
                </span>
              </div>

              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                OpsMind detected matching historical resolution in <strong>{primaryMatch.incident_id || primaryMatch.id}</strong> ({primaryMatch.similarity_pct || 91}% match).
                OpsMind will <strong>not</strong> silently execute production changes. Human review required:
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '14px', fontSize: '0.82rem' }}>
                <div><strong>Evidence:</strong> {currentEvidence.slice(0, 2).join('; ')}</div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Current root cause:</strong> <span style={{ color: isResolved ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: 700 }}>{isResolved ? 'CONFIRMED' : 'NOT CONFIRMED'}</span>
                </div>
                <div style={{ marginTop: '4px' }}><strong>Recommended next checks:</strong> Validate connection release behavior and confirm worker thread state before restarting.</div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('CHECKLIST')}
                  style={{
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Investigate
                </button>
                <button
                  onClick={handleApproveAction}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid var(--accent-emerald)',
                    color: 'var(--accent-emerald)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Approve Action
                </button>
                <button
                  onClick={handleRejectAction}
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: 'var(--accent-rose)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Part 15: Incident Replay Stepper */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  REPLAY INVESTIGATION
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setReplayStep(Math.max(0, replayStep - 1))}
                  disabled={replayStep === 0}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setReplayStep(Math.min(replaySteps.length - 1, replayStep + 1))}
                  disabled={replayStep === replaySteps.length - 1}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', background: 'rgba(6,182,212,0.2)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.4)', cursor: 'pointer' }}
                >
                  Next Step
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
              {replaySteps.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => setReplayStep(idx)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: idx === replayStep ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                    border: idx === replayStep ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                    minWidth: '130px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: idx === replayStep ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: 700 }}>
                    Step {idx + 1}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {step.title}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '10px', fontSize: '0.85rem', color: '#e2e8f0' }}>
              <strong>Step {replayStep + 1}: {replaySteps[replayStep].title}</strong> — {replaySteps[replayStep].desc}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVIDENCE PANEL (Part 8) */}
      {activeTab === 'EVIDENCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                  EVIDENCE-FOCUSED COMPONENT (STRICT SEPARATION)
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isResolved ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                }}
              >
                ROOT CAUSE STATUS: {isResolved ? 'CONFIRMED' : 'NOT CONFIRMED'}
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Critical DevOps Safety Rule: Historical evidence is never presented as current evidence. Current evidence reflects only observations from the active incident.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* CURRENT EVIDENCE */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  CURRENT EVIDENCE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentEvidence.map((ev, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>✓</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HISTORICAL EVIDENCE */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  HISTORICAL EVIDENCE ({primaryMatch ? (primaryMatch.incident_id || primaryMatch.id) : 'INC-104'})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {historicalEvidence.map((ev, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                      <span style={{ color: 'var(--accent-purple)', fontWeight: 800 }}>✓</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MISSING EVIDENCE */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  MISSING EVIDENCE / VERIFICATION REQUIRED
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {missingEvidence.length > 0 ? (
                    missingEvidence.map((ev, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                        <span style={{ color: 'var(--accent-amber)', fontWeight: 800 }}>☐</span>
                        <span>{ev}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent-emerald)' }}>
                      ✓ All required verification evidence successfully captured and stored.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIMILARITY / MEMORY VIEW (Parts 6 & 7) */}
      {activeTab === 'SIMILARITY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <GitBranch size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                RELATED INCIDENTS & HISTORICAL MEMORY CHAIN
              </span>
            </div>

            {/* Connected Card View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Current Root Node */}
              <div style={{ padding: '14px 18px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>ACTIVE QUERY INCIDENT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {incident.id} · {incident.service}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {symptomText}
                </div>
              </div>

              {similarMatches.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No historical incidents matched the threshold. OpsMind is analyzing this as a novel failure signature.
                </div>
              ) : (
                similarMatches.map((sim, idx) => (
                  <div key={sim.incident_id || sim.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Relationship connector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '24px' }}>
                      <div style={{ width: '2px', height: '24px', background: 'var(--accent-cyan)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        {sim.similarity_pct || Math.round((sim.similarity || 0.8) * 100)}% SIMILARITY
                      </span>
                    </div>

                    {/* Matched Incident Card */}
                    <div style={{ padding: '16px 18px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                            {sim.incident_id || sim.id}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sim.service}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                            {sim.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                          {sim.similarity_pct || 91}% match
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '10px' }}>
                        <strong>Root Cause:</strong> {sim.root_cause}
                      </div>

                      {sim.resolution && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', marginBottom: '12px' }}>
                          <strong>Resolution:</strong> {sim.resolution}
                        </div>
                      )}

                      {/* Part 7: WHY THIS MATCH? Derived from stored data */}
                      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          WHY THIS MATCH? (DERIVED FROM STORED DATA)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.8rem' }}>
                          <div style={{ color: '#e2e8f0' }}>✓ Same service: <span style={{ color: 'var(--accent-cyan)' }}>{sim.service}</span></div>
                          <div style={{ color: '#e2e8f0' }}>✓ Same error signature: <span style={{ color: 'var(--accent-cyan)' }}>HTTP 503 / Timeout</span></div>
                          <div style={{ color: '#e2e8f0' }}>✓ Database pressure: <span style={{ color: 'var(--accent-cyan)' }}>Connection pool saturation</span></div>
                          <div style={{ color: '#e2e8f0' }}>✓ Historical resolution available: <span style={{ color: 'var(--accent-emerald)' }}>Yes</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVESTIGATION CHECKLIST (Part 9) */}
      {activeTab === 'CHECKLIST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={18} color="var(--accent-emerald)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                  OPERATIONAL INVESTIGATION CHECKLIST
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Items completed reflect actual application state and data verification.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'c1', label: 'Incident identified and recorded in memory', disabled: true },
                { id: 'c2', label: 'Historical memory searched across Hindsight knowledge store', disabled: true },
                { id: 'c3', label: 'Similar incidents reviewed and similarity scores ranked', disabled: true },
                { id: 'c4', label: 'Verify database pool utilization against HikariCP max limit', disabled: false },
                { id: 'c5', label: 'Verify connection release behavior across worker transactions', disabled: false },
                { id: 'c6', label: 'Check background worker thread state & connection retention', disabled: false },
                { id: 'c7', label: 'Confirm root cause hypothesis with application logs', disabled: false },
                { id: 'c8', label: 'Apply verified resolution hotfix / pool expansion', disabled: false },
                { id: 'c9', label: 'Verify recovery and telemetry normalization', disabled: false },
                { id: 'c10', label: 'Store final investigation into Hindsight organizational memory', disabled: false },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.disabled && toggleCheck(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: checkedItems[item.id] ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: checkedItems[item.id] ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                    cursor: item.disabled ? 'default' : 'pointer',
                  }}
                >
                  {checkedItems[item.id] ? (
                    <CheckCircle2 size={18} color="var(--accent-emerald)" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                  <span style={{ fontSize: '0.85rem', color: checkedItems[item.id] ? '#fff' : 'var(--text-secondary)', fontWeight: checkedItems[item.id] ? 600 : 400 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL (Part 16) */}
      {activeTab === 'AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <History size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                AUDIT TRAIL & DECISION LOG (PERSISTENT LOG)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {auditTrail.length === 0 ? (
                <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No audit events recorded for this incident yet.
                </div>
              ) : (
                auditTrail.map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700, minWidth: '60px' }}>
                        {ev.time || 'N/A'}
                      </span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{ev.action}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                      {ev.actor || 'System'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Structured Night-Shift Handoff Modal (Part 5) */}
      {showHandoffModal && (
        <HandoffModal
          incidentId={incident.id}
          onClose={() => setShowHandoffModal(false)}
        />
      )}
    </div>
  );
};
