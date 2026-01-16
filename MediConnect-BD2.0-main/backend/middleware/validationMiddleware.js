// Validation Middleware for Registration

// Email validation
const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
};

// Phone validation (supports multiple formats)
const validatePhone = (phone) => {
    // Supports: +1-555-1234, (555) 123-4567, 555-123-4567, +15551234567
    const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
};

// Strong password validation
// Must contain: at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
const validateStrongPassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

// Middleware for patient registration validation
const validatePatientRegistration = (req, res, next) => {
    const { full_name, email, password, phone } = req.body;
    
    // Check required fields
    if (!full_name || !email || !password) {
        return res.status(400).json({ 
            success: false,
            message: 'Full name, email, and password are required' 
        });
    }
    
    // Validate email format
    if (!validateEmail(email)) {
        return res.status(400).json({ 
            success: false,
            message: 'Invalid email format. Please use a valid email address (e.g., user@example.com)' 
        });
    }
    
    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
        return res.status(400).json({ 
            success: false,
            message: 'Invalid phone number format. Use formats like: +1-555-1234 or (555) 123-4567' 
        });
    }
    
    // Validate strong password
    if (!validateStrongPassword(password)) {
        return res.status(400).json({ 
            success: false,
            message: 'Password must be at least 8 characters long and contain: uppercase letter, lowercase letter, number, and special character (!@#$%^&*...)' 
        });
    }
    
    next();
};

// Middleware for doctor registration validation
const validateDoctorRegistration = (req, res, next) => {
    const { full_name, email, password, phone, city, specialization } = req.body;
    
    console.log('🔍 [Validation] Validating doctor registration:', { full_name, email, phone, city, specialization });
    
    // Check required fields
    if (!full_name || !email || !password || !city || !specialization) {
        console.log('❌ [Validation] Missing required fields');
        return res.status(400).json({ 
            success: false,
            message: 'Full name, email, password, city, and specialization are required' 
        });
    }
    
    // Validate email format
    if (!validateEmail(email)) {
        console.log('❌ [Validation] Invalid email format');
        return res.status(400).json({ 
            success: false,
            message: 'Invalid email format. Please use a valid email address (e.g., doctor@hospital.com)' 
        });
    }
    
    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
        console.log('❌ [Validation] Invalid phone format');
        return res.status(400).json({ 
            success: false,
            message: 'Invalid phone number format. Use formats like: +1-555-1234 or (555) 123-4567' 
        });
    }
    
    // Relaxed password validation for doctors (min 6 characters)
    if (password.length < 6) {
        console.log('❌ [Validation] Password too short');
        return res.status(400).json({ 
            success: false,
            message: 'Password must be at least 6 characters long' 
        });
    }
    
    console.log('✅ [Validation] Doctor registration data validated successfully');
    next();
};

// Middleware for login validation
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false,
            message: 'Email and password are required' 
        });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({ 
            success: false,
            message: 'Invalid email format' 
        });
    }
    
    next();
};

module.exports = {
    validatePatientRegistration,
    validateDoctorRegistration,
    validateLogin
};
