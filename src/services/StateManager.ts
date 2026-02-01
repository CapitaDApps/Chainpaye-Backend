import { TransactionState } from '../models/Transaction';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AuditService } from './AuditService';

export interface StateTransitionResult {
  success: boolean;
  previousState: TransactionState;
  newState: TransactionState;
  reason: string;
  timestamp: Date;
}

export interface StateTransitionRequest {
  transactionId: string;
  newState: TransactionState;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * StateManager enforces transaction state machine rules and prevents invalid transitions
 * 
 * Valid state transitions:
 * PENDING -> INITIALIZED (when Toronet initialization succeeds)
 * INITIALIZED -> PAID (when fiat result is confirmed)
 * PAID -> COMPLETED (when payout succeeds)
 * PAID -> PAYOUT_FAILED (when payout fails)
 * PAYOUT_FAILED -> COMPLETED (when retry payout succeeds)
 * 
 * COMPLETED is a final state - no transitions allowed from COMPLETED
 */
export class StateManager {
  private readonly transactionRepository: TransactionRepository;
  private readonly auditService: AuditService;

  // Define valid state transitions
  private readonly validTransitions: Map<TransactionState, TransactionState[]> = new Map([
    [TransactionState.PENDING, [TransactionState.INITIALIZED]],
    [TransactionState.INITIALIZED, [TransactionState.PAID]],
    [TransactionState.PAID, [TransactionState.COMPLETED, TransactionState.PAYOUT_FAILED]],
    [TransactionState.PAYOUT_FAILED, [TransactionState.COMPLETED]],
    [TransactionState.COMPLETED, []] // Final state - no transitions allowed
  ]);

  constructor(
    transactionRepository: TransactionRepository,
    auditService: AuditService
  ) {
    this.transactionRepository = transactionRepository;
    this.auditService = auditService;
  }

  /**
   * Transition transaction to new state with validation
   */
  async transitionState(request: StateTransitionRequest): Promise<StateTransitionResult> {
    const { transactionId, newState, reason, metadata } = request;

    // Get current transaction
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    const currentState = transaction.state;
    const timestamp = new Date();

    // Validate transition
    if (!this.validateTransition(currentState, newState)) {
      const result: StateTransitionResult = {
        success: false,
        previousState: currentState,
        newState: currentState, // State remains unchanged
        reason: `Invalid transition from ${currentState} to ${newState}`,
        timestamp
      };

      // Audit the failed transition attempt
      await this.auditService.createAuditLog({
        entityType: 'Transaction',
        entityId: transactionId,
        action: 'STATE_TRANSITION_REJECTED',
        changes: {
          attemptedTransition: { from: currentState, to: newState },
          reason: result.reason
        },
        metadata
      });

      return result;
    }

    // Perform state transition
    try {
      const updatedTransaction = await this.transactionRepository.updateById(
        transactionId,
        { state: newState }
      );

      if (!updatedTransaction) {
        throw new Error(`Failed to update transaction state: ${transactionId}`);
      }

      const result: StateTransitionResult = {
        success: true,
        previousState: currentState,
        newState: newState,
        reason,
        timestamp
      };

      // Audit successful transition
      await this.auditService.createAuditLog({
        entityType: 'Transaction',
        entityId: transactionId,
        action: 'STATE_TRANSITION',
        changes: {
          state: { from: currentState, to: newState },
          reason
        },
        metadata
      });

      return result;

    } catch (error) {
      // Audit failed transition
      await this.auditService.createAuditLog({
        entityType: 'Transaction',
        entityId: transactionId,
        action: 'STATE_TRANSITION_FAILED',
        changes: {
          attemptedTransition: { from: currentState, to: newState },
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata
      });

      throw error;
    }
  }

  /**
   * Get current state of a transaction
   */
  async getCurrentState(transactionId: string): Promise<TransactionState> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }
    return transaction.state;
  }

  /**
   * Validate if a state transition is allowed
   */
  validateTransition(currentState: TransactionState, newState: TransactionState): boolean {
    // Same state is always valid (idempotent)
    if (currentState === newState) {
      return true;
    }

    const allowedTransitions = this.validTransitions.get(currentState);
    return allowedTransitions ? allowedTransitions.includes(newState) : false;
  }

  /**
   * Get all valid next states for a given current state
   */
  getValidNextStates(currentState: TransactionState): TransactionState[] {
    return this.validTransitions.get(currentState) || [];
  }

  /**
   * Check if a state is final (no further transitions allowed)
   */
  isFinalState(state: TransactionState): boolean {
    const allowedTransitions = this.validTransitions.get(state);
    return !allowedTransitions || allowedTransitions.length === 0;
  }

  /**
   * Batch state transition for multiple transactions
   * Useful for cron jobs processing multiple transactions
   */
  async batchTransitionStates(requests: StateTransitionRequest[]): Promise<StateTransitionResult[]> {
    const results: StateTransitionResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.transitionState(request);
        results.push(result);
      } catch (error) {
        // Continue processing other transactions even if one fails
        results.push({
          success: false,
          previousState: TransactionState.PENDING, // Default fallback
          newState: TransactionState.PENDING,
          reason: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Get state transition history for a transaction from audit logs
   */
  async getStateTransitionHistory(transactionId: string): Promise<any[]> {
    // Use the audit service's repository directly for now
    const auditLogRepository = new (await import('../repositories/AuditLogRepository')).AuditLogRepository();
    const result = await auditLogRepository.findByEntity('Transaction', transactionId);
    
    // Handle both array and paginated response
    if (Array.isArray(result)) {
      return result;
    } else {
      return result.documents || [];
    }
  }
}