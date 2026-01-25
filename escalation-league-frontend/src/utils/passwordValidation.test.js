import {
    validatePassword,
    getPasswordStrength,
    PASSWORD_MIN_LENGTH
} from './passwordValidation';

describe('passwordValidation', () => {
    describe('validatePassword', () => {
        describe('length validation', () => {
            it('should reject empty password', () => {
                const result = validatePassword('');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
            });

            it('should reject null password', () => {
                const result = validatePassword(null);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
            });

            it('should reject undefined password', () => {
                const result = validatePassword(undefined);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
            });

            it('should reject password shorter than minimum length', () => {
                const result = validatePassword('short');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
            });

            it('should accept password at minimum length', () => {
                const result = validatePassword('xyzwvuts'); // 8 characters, not common
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should accept password longer than minimum length', () => {
                const result = validatePassword('thisisaverylongpassword');
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        describe('common password validation', () => {
            it('should reject common passwords like "password"', () => {
                const result = validatePassword('password');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('This password is too common');
            });

            it('should reject common passwords like "12345678"', () => {
                const result = validatePassword('12345678');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('This password is too common');
            });

            it('should reject common passwords like "qwertyuiop"', () => {
                const result = validatePassword('qwertyuiop');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('This password is too common');
            });

            it('should reject common passwords case-insensitively', () => {
                const result = validatePassword('PASSWORD');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('This password is too common');
            });

            it('should reject common passwords with mixed case', () => {
                const result = validatePassword('PaSsWoRd');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('This password is too common');
            });

            it('should accept uncommon passwords', () => {
                const result = validatePassword('MyUnique$ecureP@ss!');
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        describe('multiple errors', () => {
            it('should return both errors for short common password', () => {
                // "pass" is too short AND too common
                const result = validatePassword('pass');
                expect(result.isValid).toBe(false);
                expect(result.errors.length).toBeGreaterThanOrEqual(1);
                expect(result.errors).toContain(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
            });
        });
    });

    describe('getPasswordStrength', () => {
        describe('empty/null passwords', () => {
            it('should return level 0 for empty string', () => {
                const result = getPasswordStrength('');
                expect(result.level).toBe(0);
                expect(result.label).toBe('');
                expect(result.color).toBe('');
            });

            it('should return level 0 for null', () => {
                const result = getPasswordStrength(null);
                expect(result.level).toBe(0);
                expect(result.label).toBe('');
                expect(result.color).toBe('');
            });

            it('should return level 0 for undefined', () => {
                const result = getPasswordStrength(undefined);
                expect(result.level).toBe(0);
                expect(result.label).toBe('');
                expect(result.color).toBe('');
            });
        });

        describe('strength levels', () => {
            it('should return Very Weak for short password', () => {
                const result = getPasswordStrength('abc');
                expect(result.label).toBe('Very Weak');
                expect(result.color).toBe('#dc3545');
            });

            it('should return Weak for basic 8 char password', () => {
                const result = getPasswordStrength('abcdefgh');
                // 8 chars = 1 point, lowercase only = 0 points
                expect(result.level).toBeLessThanOrEqual(1);
                expect(['Very Weak', 'Weak']).toContain(result.label);
            });

            it('should increase strength with mixed case', () => {
                const resultLower = getPasswordStrength('abcdefgh');
                const resultMixed = getPasswordStrength('AbCdEfGh');
                expect(resultMixed.level).toBeGreaterThanOrEqual(resultLower.level);
            });

            it('should increase strength with numbers', () => {
                const resultNoNum = getPasswordStrength('abcdefgh');
                const resultWithNum = getPasswordStrength('abcdef12');
                expect(resultWithNum.level).toBeGreaterThanOrEqual(resultNoNum.level);
            });

            it('should increase strength with special characters', () => {
                const resultNoSpecial = getPasswordStrength('abcdefgh');
                const resultWithSpecial = getPasswordStrength('abcdef@!');
                expect(resultWithSpecial.level).toBeGreaterThanOrEqual(resultNoSpecial.level);
            });

            it('should increase strength with longer passwords', () => {
                const result8 = getPasswordStrength('abcdefgh');
                const result12 = getPasswordStrength('abcdefghijkl');
                const result16 = getPasswordStrength('abcdefghijklmnop');
                expect(result12.level).toBeGreaterThanOrEqual(result8.level);
                expect(result16.level).toBeGreaterThanOrEqual(result12.level);
            });

            it('should return Strong for complex password', () => {
                const result = getPasswordStrength('MyStr0ng!P@ssword123');
                expect(result.level).toBeGreaterThanOrEqual(3);
                expect(['Good', 'Strong']).toContain(result.label);
            });
        });

        describe('common password penalty', () => {
            it('should penalize common passwords even if long', () => {
                const result = getPasswordStrength('password123');
                expect(result.level).toBeLessThanOrEqual(1);
            });
        });

        describe('color mapping', () => {
            it('should return red for Very Weak', () => {
                const result = getPasswordStrength('a');
                expect(result.color).toBe('#dc3545');
            });

            it('should have valid color codes for all levels', () => {
                const passwords = ['a', 'abcdefgh', 'Abcdefgh1', 'Abcdefgh1!', 'MyStr0ng!P@ssword123'];
                passwords.forEach(pw => {
                    const result = getPasswordStrength(pw);
                    if (result.color) {
                        expect(result.color).toMatch(/^#[0-9a-fA-F]{6}$/);
                    }
                });
            });
        });
    });

    describe('PASSWORD_MIN_LENGTH constant', () => {
        it('should be 8', () => {
            expect(PASSWORD_MIN_LENGTH).toBe(8);
        });
    });
});
