// Custom validation schemas and utilities

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class Validator {
  private errors: ValidationError[] = [];

  static validate<T>(data: any, schema: ValidationSchema<T>): ValidationResult {
    const validator = new Validator();
    validator.validateObject(data, schema, '');
    return {
      isValid: validator.errors.length === 0,
      errors: validator.errors
    };
  }

  private validateObject(data: any, schema: ValidationSchema<any>, path: string) {
    if (!data || typeof data !== 'object') {
      this.addError(path || 'root', 'Must be an object', data);
      return;
    }

    for (const [key, fieldSchema] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const value = data[key];
      this.validateField(value, fieldSchema, fieldPath);
    }
  }

  private validateField(value: any, schema: FieldSchema, path: string) {
    // Check required
    if (schema.required && (value === undefined || value === null)) {
      this.addError(path, 'Field is required');
      return;
    }

    // Skip validation if optional and not provided
    if (!schema.required && (value === undefined || value === null)) {
      return;
    }

    // Type validation
    if (schema.type && !this.validateType(value, schema.type)) {
      this.addError(path, `Expected ${schema.type} but got ${typeof value}`, value);
      return;
    }

    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        this.addError(path, `Minimum length is ${schema.minLength}`, value);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        this.addError(path, `Maximum length is ${schema.maxLength}`, value);
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        this.addError(path, 'Invalid format', value);
      }
      if (schema.enum && !schema.enum.includes(value)) {
        this.addError(path, `Must be one of: ${schema.enum.join(', ')}`, value);
      }
    }

    // Number validations
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        this.addError(path, `Minimum value is ${schema.min}`, value);
      }
      if (schema.max !== undefined && value > schema.max) {
        this.addError(path, `Maximum value is ${schema.max}`, value);
      }
      if (schema.integer && !Number.isInteger(value)) {
        this.addError(path, 'Must be an integer', value);
      }
    }

    // Custom validation
    if (schema.custom) {
      const customResult = schema.custom(value);
      if (customResult !== true) {
        this.addError(path, customResult || 'Custom validation failed', value);
      }
    }
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  private addError(field: string, message: string, value?: any) {
    this.errors.push({ field, message, value });
  }
}

export interface FieldSchema {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: any) => true | string;
}

export type ValidationSchema<T> = {
  [K in keyof T]: FieldSchema;
};

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  mongoId: /^[0-9a-fA-F]{24}$/,
};

// Common validation functions
export const ValidationFunctions = {
  isValidCurrency: (value: any): true | string => {
    return ['NGN', 'USD'].includes(value) ? true : 'Currency must be NGN or USD';
  },
  
  isValidAmount: (value: any): true | string => {
    if (typeof value !== 'string') return 'Amount must be a string';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'Amount must be a valid number string';
    if (numValue <= 0) return 'Amount must be greater than 0';
    if ((numValue * 10000) % 1 !== 0) return 'Amount can have at most 4 decimal places';
    return true;
  },
  
  isValidTransactionState: (value: any): true | string => {
    const validStates = ['PENDING', 'INITIALIZED', 'PAID', 'COMPLETED', 'PAYOUT_FAILED'];
    return validStates.includes(value) ? true : `State must be one of: ${validStates.join(', ')}`;
  },

  isValidPaymentType: (value: any): true | string => {
    return ['bank', 'card'].includes(value) ? true : 'Payment type must be bank or card';
  }
};