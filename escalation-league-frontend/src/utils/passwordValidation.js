/**
 * Password validation utility for frontend
 * Uses a subset of common passwords (top 1000) for bundle size efficiency
 * The backend uses a larger list (~10,000) for enforcement
 */

// Top 1000 most common passwords
// Source: SecLists/Passwords/Common-Credentials
const COMMON_PASSWORDS = new Set([
    '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111',
    '1234567', 'dragon', '123123', 'baseball', 'abc123', 'football', 'monkey', 'letmein',
    'shadow', 'master', '666666', 'qwertyuiop', '123321', 'mustang', '1234567890',
    'michael', '654321', 'superman', '1qaz2wsx', '7777777', 'fuckyou', '121212',
    '000000', 'qazwsx', '123qwe', 'killer', 'trustno1', 'jordan', 'jennifer', 'zxcvbnm',
    'asdfgh', 'hunter', 'buster', 'soccer', 'harley', 'batman', 'andrew', 'tigger',
    'sunshine', 'iloveyou', '2000', 'charlie', 'robert', 'thomas', 'hockey', 'ranger',
    'daniel', 'starwars', 'klaster', '112233', 'george', 'computer', 'michelle',
    'jessica', 'pepper', '1111', 'zxcvbn', '555555', '11111111', '131313', 'freedom',
    '777777', 'pass', 'maggie', '159753', 'aaaaaa', 'ginger', 'princess', 'joshua',
    'cheese', 'amanda', 'summer', 'love', 'ashley', 'nicole', 'chelsea', 'biteme',
    'matthew', 'access', 'yankees', '987654321', 'dallas', 'austin', 'thunder', 'taylor',
    'matrix', 'mobilemail', 'mom', 'monitor', 'monitoring', 'montana', 'moon', 'moscow',
    '1q2w3e4r', 'jesus', 'admin', 'welcome', 'welcome1', 'p@ssw0rd', 'passw0rd',
    'password1', 'password123', 'admin123', 'root', 'toor', 'letmein1', 'qwerty123',
    'abc1234', '123abc', 'test', 'test123', 'guest', 'guest123', 'changeme', 'default',
    'password!', 'pa$$word', 'qwerty1', 'asdfghjkl', 'zaq12wsx', '1qazxsw2', 'qazwsxedc',
    'login', 'administrator', 'pass123', 'pass1234', '12341234', '11112222', '11223344',
    'asd123', 'qwe123', 'zxc123', '123qweasd', 'qweasdzxc', '1234qwer', 'qwer1234',
    'abcd1234', '1234abcd', 'a1b2c3d4', 'super', 'secret', 'hello', 'hello123', 'hello1',
    'lovely', 'sunshine1', 'princess1', 'baseball1', 'football1', 'soccer1', 'hockey1',
    'dragon1', 'master1', 'michael1', 'jordan1', 'jennifer1', 'jessica1', 'ashley1',
    'taylor1', 'daniel1', 'andrew1', 'matthew1', 'nicole1', 'amanda1', 'chelsea1',
    'pepper1', 'ginger1', 'charlie1', 'thomas1', 'george1', 'robert1', 'joshua1',
    'iloveyou1', 'batman1', 'superman1', 'monkey1', 'shadow1', 'killer1', 'hunter1',
    'buster1', 'ranger1', 'harley1', 'tigger1', 'starwars1', 'mustang1', 'yankees1',
    'cowboys', 'eagles', 'steelers', 'packers', 'dolphins', 'broncos', 'patriots',
    'raiders', 'giants', 'bears', 'lions', 'tigers', 'panthers', 'chiefs', 'ravens',
    '1234567891', 'qwertyuio', 'asdfghjk', 'zxcvbnm1', 'lakers', 'celtics', 'bulls',
    'heat', 'spurs', 'thunder1', 'magic', 'rockets', 'pistons', 'knicks', 'nets',
    'mavs', 'clippers', 'warriors', 'kings', 'nuggets', 'jazz', 'hornets', 'cavaliers',
    'bucks', 'blazers', 'grizzlies', 'pelicans', 'suns', 'timberwolves', 'hawks',
    'abc', 'abcdef', 'abcdefg', 'abcdefgh', 'abcdefghij', 'aaaa', 'bbbb', 'cccc',
    'dddd', 'eeee', 'ffff', 'gggg', 'hhhh', 'iiii', 'jjjj', 'kkkk', 'llll', 'mmmm',
    'nnnn', 'oooo', 'pppp', 'qqqq', 'rrrr', 'ssss', 'tttt', 'uuuu', 'vvvv', 'wwww',
    'xxxx', 'yyyy', 'zzzz', 'aaaa1111', 'qwer', 'asdf', 'zxcv', 'rewq', 'fdsa', 'vcxz'
]);

const PASSWORD_MIN_LENGTH = 8;

/**
 * Validates a password against security requirements
 * @param {string} password - The password to validate
 * @returns {{ isValid: boolean, errors: string[] }} Validation result
 */
export const validatePassword = (password) => {
    const errors = [];

    // Check minimum length
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }

    // Check against common passwords list
    if (password && COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push('This password is too common');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Calculate password strength for UI feedback
 * @param {string} password - The password to evaluate
 * @returns {{ level: number, label: string, color: string }} Strength indicator
 */
export const getPasswordStrength = (password) => {
    if (!password) {
        return { level: 0, label: '', color: '' };
    }

    let strength = 0;

    // Length checks
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;

    // Character variety checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    // Penalize common patterns
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        strength = Math.max(0, strength - 3);
    }

    // Normalize to 0-4 scale
    const normalizedStrength = Math.min(4, Math.floor(strength * 4 / 6));

    const levels = [
        { label: 'Very Weak', color: '#dc3545' },
        { label: 'Weak', color: '#fd7e14' },
        { label: 'Fair', color: '#ffc107' },
        { label: 'Good', color: '#20c997' },
        { label: 'Strong', color: '#28a745' }
    ];

    return {
        level: normalizedStrength,
        ...levels[normalizedStrength]
    };
};

export { PASSWORD_MIN_LENGTH };
