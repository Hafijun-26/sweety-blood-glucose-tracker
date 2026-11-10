
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {

    // Get token from request headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        // Verify JWT token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store logged-in user details
        req.user = {
            id: decoded.id,
            email: decoded.email
        };

        // Allow request to continue
        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token."
        });

    }
};

module.exports = authMiddleware;
