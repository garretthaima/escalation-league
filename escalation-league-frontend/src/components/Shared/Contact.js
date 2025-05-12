import React from 'react';
import './Shared.css'; // Create a CSS file for specific styles

const Contact = () => {
    return (
        <div className="contact-page container mt-5">
            <h1 className="text-center mb-4">Contact Us</h1>
            <p className="text-center mb-4">
                Have questions or need assistance? Feel free to reach out to us using the form below or via email.
            </p>
            <form className="contact-form">
                <div className="mb-3">
                    <label htmlFor="name" className="form-label">Name</label>
                    <input type="text" className="form-control" id="name" placeholder="Your Name" required />
                </div>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input type="email" className="form-control" id="email" placeholder="Your Email" required />
                </div>
                <div className="mb-3">
                    <label htmlFor="message" className="form-label">Message</label>
                    <textarea className="form-control" id="message" rows="5" placeholder="Your Message" required></textarea>
                </div>
                <button type="submit" className="btn btn-primary">Send Message</button>
            </form>
        </div>
    );
};

export default Contact;