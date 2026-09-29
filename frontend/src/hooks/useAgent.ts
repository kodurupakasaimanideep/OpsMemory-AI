import { useState } from 'react';
import { InvestigationResult } from '../types/incident';
import { investigateIncident } from '../services/api';

export function useAgent() {
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runInvestigation = async (incidentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await investigateIncident(incidentId);
      setInvestigation(res);
      return res;
    } catch (err: any) {
      setError(err.message || 'Investigation failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { investigation, loading, error, runInvestigation, setInvestigation };
}
