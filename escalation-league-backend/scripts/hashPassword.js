const bcrypt = require('bcrypt');

const hashPassword = async () => {
    const plainTextPassword = 'W85RR8SgsyPmUaQyyzVWinvvoZYQKqS77JFVM7qFShSHW4NJ'; // Replace with your password
    const saltRounds = 10;

    try {
        const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);
        console.log('Hashed Password:', hashedPassword);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
};

hashPassword();