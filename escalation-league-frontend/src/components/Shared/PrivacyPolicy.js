import React from 'react';
import './Shared.css'; // Optional: Add specific styles for the page

const PrivacyPolicy = () => {
    return (
        <div className="privacy-policy container mt-5">
            <h1 className="text-center mb-4">Privacy Policy</h1>
            <p>
                Welcome to Escalation League! Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.
            </p>

            <h2>1. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul>
                <li>Personal Information: Name, email address, and other details you provide.</li>
                <li>Usage Data: IP address, browser type, and pages visited.</li>
                <li>Cookies: Data stored on your device to enhance your experience.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
                <li>Provide and improve our services.</li>
                <li>Communicate with you about updates and promotions.</li>
                <li>Analyze usage trends to improve user experience.</li>
            </ul>

            <h2>3. Sharing Your Information</h2>
            <p>We may share your information with:</p>
            <ul>
                <li>Service providers (e.g., hosting, analytics).</li>
                <li>Legal authorities, if required by law.</li>
            </ul>

            <h2>4. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
                <li>Access, update, or delete your personal information.</li>
                <li>Opt out of cookies and tracking technologies.</li>
            </ul>

            <h2>5. Security</h2>
            <p>We take reasonable measures to protect your data from unauthorized access or disclosure.</p>

            <h2>6. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page.</p>

            <h2>7. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at support@escalationleague.com.</p>
        </div>
    );
};

export default PrivacyPolicy;