import React from 'react';
import { Incident } from '../types/incident';
import { IncidentDetails } from '../components/IncidentDetails';

interface IncidentDetailsPageProps {
  incident: Incident;
  onBack: () => void;
  onMemoryUpdated?: (count: number) => void;
}

export const IncidentDetailsPage: React.FC<IncidentDetailsPageProps> = ({
  incident,
  onBack,
  onMemoryUpdated,
}) => {
  return (
    <div className="page-view">
      <IncidentDetails
        incident={incident}
        onBack={onBack}
        onMemoryUpdated={onMemoryUpdated}
      />
    </div>
  );
};
