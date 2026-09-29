import React from 'react';
import { Severity } from '../types/incident';
import { getSeverityClass } from '../utils/formatters';

interface SeverityBadgeProps {
  severity: Severity | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const sevClass = getSeverityClass(severity);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
      className={sevClass}
    >
      {severity}
    </span>
  );
};
