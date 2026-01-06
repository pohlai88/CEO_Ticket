/**
 * Status Constants Unit Tests
 * 
 * Tests status metadata and transition helpers from lib/constants/status.ts
 * 
 * @rcf-version 2.2.0
 */

import { describe, it, expect } from 'vitest';
import { 
  STATUS_METADATA,
  STATUS_TRANSITIONS,
  DEFAULT_PRIORITY_METADATA,
  canTransitionTo,
  isTerminalStatus,
  MATERIAL_CHANGE_FIELDS,
} from '@/lib/constants/status';

describe('STATUS_METADATA', () => {
  const allStatuses = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'CLOSED'] as const;

  it('has metadata for all statuses', () => {
    for (const status of allStatuses) {
      expect(STATUS_METADATA[status]).toBeDefined();
      expect(STATUS_METADATA[status].label).toBeTruthy();
      expect(STATUS_METADATA[status].color).toBeTruthy();
      expect(STATUS_METADATA[status].description).toBeTruthy();
    }
  });

  it('has correct labels', () => {
    expect(STATUS_METADATA.DRAFT.label).toBe('Draft');
    expect(STATUS_METADATA.APPROVED.label).toBe('Approved');
    expect(STATUS_METADATA.REJECTED.label).toBe('Rejected');
  });
});

describe('STATUS_TRANSITIONS', () => {
  it('matches FSM from PRD', () => {
    expect(STATUS_TRANSITIONS.DRAFT).toEqual(['SUBMITTED', 'CANCELLED']);
    expect(STATUS_TRANSITIONS.SUBMITTED).toEqual(['IN_REVIEW', 'CANCELLED']);
    expect(STATUS_TRANSITIONS.IN_REVIEW).toEqual(['APPROVED', 'REJECTED', 'CANCELLED']);
    expect(STATUS_TRANSITIONS.APPROVED).toEqual(['CLOSED']);
    expect(STATUS_TRANSITIONS.REJECTED).toEqual(['SUBMITTED']);
    expect(STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    expect(STATUS_TRANSITIONS.CLOSED).toEqual([]);
  });
});

describe('DEFAULT_PRIORITY_METADATA', () => {
  const allPriorities = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;

  it('has metadata for all priorities', () => {
    for (const priority of allPriorities) {
      expect(DEFAULT_PRIORITY_METADATA[priority]).toBeDefined();
      expect(DEFAULT_PRIORITY_METADATA[priority].label).toBeTruthy();
      expect(DEFAULT_PRIORITY_METADATA[priority].color).toBeTruthy();
      expect(DEFAULT_PRIORITY_METADATA[priority].description).toBeTruthy();
    }
  });

  it('has correct labels matching glossary', () => {
    expect(DEFAULT_PRIORITY_METADATA.P1.label).toBe('Blocker');
    expect(DEFAULT_PRIORITY_METADATA.P2.label).toBe('High');
    expect(DEFAULT_PRIORITY_METADATA.P3.label).toBe('Medium');
    expect(DEFAULT_PRIORITY_METADATA.P4.label).toBe('Low');
    expect(DEFAULT_PRIORITY_METADATA.P5.label).toBe('Trivial');
  });
});

describe('canTransitionTo()', () => {
  it('returns true for valid transitions', () => {
    expect(canTransitionTo('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransitionTo('IN_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransitionTo('REJECTED', 'SUBMITTED')).toBe(true);
  });

  it('returns false for invalid transitions', () => {
    expect(canTransitionTo('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransitionTo('CLOSED', 'DRAFT')).toBe(false);
    expect(canTransitionTo('CANCELLED', 'SUBMITTED')).toBe(false);
  });
});

describe('isTerminalStatus()', () => {
  it('identifies terminal statuses', () => {
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('CLOSED')).toBe(true);
  });

  it('identifies non-terminal statuses', () => {
    expect(isTerminalStatus('DRAFT')).toBe(false);
    expect(isTerminalStatus('SUBMITTED')).toBe(false);
    expect(isTerminalStatus('IN_REVIEW')).toBe(false);
    expect(isTerminalStatus('APPROVED')).toBe(false);
    expect(isTerminalStatus('REJECTED')).toBe(false);
  });
});

describe('MATERIAL_CHANGE_FIELDS', () => {
  it('contains exactly the PRD-defined fields', () => {
    expect(MATERIAL_CHANGE_FIELDS).toEqual(['title', 'description', 'priority_code', 'category_id']);
  });
});
