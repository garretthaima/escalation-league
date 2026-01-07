const bcrypt = require('bcrypt');

const hashPassword = async () => {
    // Get password from command line argument
    const plainTextPassword = process.argv[2];

    if (!plainTextPassword) {
        console.error('ERROR: Please provide a password as an argument');
        console.error('Usage: node hashPassword.js <your-password>');
        process.exit(1);
    }

    const saltRounds = 10;

    try {
        const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);
        console.log('Hashed Password:', hashedPassword);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
};

hashPassword();