import { describe, it, expect } from 'vitest';
import { registerUserSchema, loginUserSchema, createUserSchema } from './user';

describe('User Validation Schemas', () => {
  describe('registerUserSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword123',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid names', () => {
      const invalidData = {
        name: 'J', // Too short
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginUserSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'anypassword',
      };

      const result = loginUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'john@example.com',
        password: '',
      };

      const result = loginUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('should validate correct user data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid age', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 0,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject age over 150', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 151,
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
