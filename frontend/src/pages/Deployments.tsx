import React, { useState, useEffect } from 'react';
import { Rocket, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, RefreshCw, Cpu } from 'lucide-react';
import { fetchDeployments, checkDeploymentRisk } from '../services/api';
import { DeploymentRisk } from '../types/incident';

export const Deployments: React.FC = () => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState('payment-service');
  const [selectedVersion, setSelectedVersion] = useState('v2.5.0');
  const [riskAssessment, setRiskAssessment] = useState<DeploymentRisk | null>(null);
  const [loading, setLoading] = useState(false);
  const [deploySuccessToast, setDeploySuccessToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await fetchDeployments();
      setDeployments(data);
      // Run initial check for payment-service v2.5.0
      runRiskCheck('payment-service', 'v2.5.0');
    }
    load();
  }, []);

  const runRiskCheck = async (service: string, version: string) => {
    setLoading(true);
    const res = await checkDeploymentRisk(service, version);
    setRiskAssessment(res);
    setLoading(false);
  };

  const handleReviewAndDeploy = () => {
    setDeploySuccessToast('Pre-deployment safety gates verified against Hindsight memory. Rollout approved with connection pool guardrails!');
    setTimeout(() => setDeploySuccessToast(null), 4000);
  };

  return (
    <div className="page-view">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-badge">
            <Rocket size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>Pre-Deployment Risk Analyzer</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Proactively cross-reference upcoming service releases with historical failure memories
            </div>
          </div>
        </div>
      </div>

      {deploySuccessToast && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: 'var(--accent-emerald)',
            fontSize: '0.88rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{deploySuccessToast}</span>
        </div>
      )}

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Targeted Deployment Risk Screen */}
        <div className="glass-card" style={{ borderLeft: riskAssessment?.risk_level === 'HIGH' ? '5px solid var(--accent-rose)' : '5px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Rocket size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                🚀 DEPLOYMENT ANALYSIS
              </span>
            </div>
            <button
              className="btn-secondary"
              onClick={() => runRiskCheck(selectedService, selectedVersion)}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Re-check Memory</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Service</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedService}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Version</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>{selectedVersion}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk Score</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: riskAssessment?.risk_level === 'HIGH' ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {riskAssessment?.risk_score || 88} / 100
              </div>
            </div>
          </div>

          {/* AI Memory Check warning banner */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', marginBottom: '8px' }}>
              AI MEMORY CHECK
            </div>
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', fontWeight: 700, fontSize: '0.92rem' }}>
                <AlertTriangle size={18} />
                <span>⚠ Similar changes caused 3 previous incidents</span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>Related Incidents: </strong>
                <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {riskAssessment?.related_incidents.join(', ') || 'INC-104, INC-117, INC-121'}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>Common Pattern: </strong>
                <span style={{ color: 'var(--accent-cyan)' }}>
                  {riskAssessment?.common_pattern || 'Database connection configuration & pool saturation'}
                </span>
              </div>
            </div>
          </div>

          {/* Pre-Deployment Checks */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              PRE-DEPLOYMENT CHECKS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span style={{ color: 'var(--text-primary)' }}>✓ Database migration reviewed</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.85rem' }}>
                <AlertTriangle size={16} color="var(--accent-amber)" />
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>⚠ Connection pool configuration changed (Ensure buffer &gt;= 100)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span style={{ color: 'var(--text-primary)' }}>✓ Rollback plan available & automated canary ready</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-primary" onClick={handleReviewAndDeploy}>
              <Sparkles size={16} />
              <span>REVIEW & APPROVE DEPLOYMENT</span>
            </button>
          </div>
        </div>

        {/* Right Column: Deployment Queue */}
        <div className="glass-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>
            RECENT & SCHEDULED DEPLOYMENTS
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {deployments.map((dep) => (
              <div
                key={dep.id}
                onClick={() => {
                  setSelectedService(dep.service);
                  setSelectedVersion(dep.version);
                  runRiskCheck(dep.service, dep.version);
                }}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: selectedService === dep.service ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${selectedService === dep.service ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    {dep.service} <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>({dep.version})</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: dep.risk_level === 'HIGH' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: dep.risk_level === 'HIGH' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                    }}
                  >
                    {dep.risk_level} RISK
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {dep.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
