import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Contact from '../Contact';

describe('Contact', () => {
    describe('rendering', () => {
        it('should render the contact page container', () => {
            const { container } = render(<Contact />);
            expect(container.querySelector('.contact-page')).toBeInTheDocument();
        });

        it('should render the page heading', () => {
            render(<Contact />);
            expect(screen.getByRole('heading', { name: 'Contact Us' })).toBeInTheDocument();
        });

        it('should render the introductory text', () => {
            render(<Contact />);
            expect(screen.getByText(/Have questions or need assistance/)).toBeInTheDocument();
        });

        it('should render the contact form', () => {
            const { container } = render(<Contact />);
            expect(container.querySelector('.contact-form')).toBeInTheDocument();
        });
    });

    describe('form fields', () => {
        it('should render the name input field', () => {
            render(<Contact />);
            expect(screen.getByLabelText('Name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Your Name')).toBeInTheDocument();
        });

        it('should render the email input field', () => {
            render(<Contact />);
            expect(screen.getByLabelText('Email')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Your Email')).toBeInTheDocument();
        });

        it('should render the message textarea', () => {
            render(<Contact />);
            expect(screen.getByLabelText('Message')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Your Message')).toBeInTheDocument();
        });

        it('should render the submit button', () => {
            render(<Contact />);
            expect(screen.getByRole('button', { name: 'Send Message' })).toBeInTheDocument();
        });
    });

    describe('form field attributes', () => {
        it('should have correct type for name input', () => {
            render(<Contact />);
            const nameInput = screen.getByLabelText('Name');
            expect(nameInput).toHaveAttribute('type', 'text');
        });

        it('should have correct type for email input', () => {
            render(<Contact />);
            const emailInput = screen.getByLabelText('Email');
            expect(emailInput).toHaveAttribute('type', 'email');
        });

        it('should have required attribute on name input', () => {
            render(<Contact />);
            const nameInput = screen.getByLabelText('Name');
            expect(nameInput).toHaveAttribute('required');
        });

        it('should have required attribute on email input', () => {
            render(<Contact />);
            const emailInput = screen.getByLabelText('Email');
            expect(emailInput).toHaveAttribute('required');
        });

        it('should have required attribute on message textarea', () => {
            render(<Contact />);
            const messageTextarea = screen.getByLabelText('Message');
            expect(messageTextarea).toHaveAttribute('required');
        });

        it('should have rows attribute on message textarea', () => {
            render(<Contact />);
            const messageTextarea = screen.getByLabelText('Message');
            expect(messageTextarea).toHaveAttribute('rows', '5');
        });
    });

    describe('form styling', () => {
        it('should have container class', () => {
            const { container } = render(<Contact />);
            expect(container.querySelector('.container')).toBeInTheDocument();
        });

        it('should have mt-5 margin class', () => {
            const { container } = render(<Contact />);
            expect(container.querySelector('.mt-5')).toBeInTheDocument();
        });

        it('should have text-center class on heading', () => {
            render(<Contact />);
            const heading = screen.getByRole('heading', { name: 'Contact Us' });
            expect(heading).toHaveClass('text-center');
        });

        it('should have form-control class on inputs', () => {
            render(<Contact />);
            const nameInput = screen.getByLabelText('Name');
            expect(nameInput).toHaveClass('form-control');
        });

        it('should have btn-primary class on submit button', () => {
            render(<Contact />);
            const button = screen.getByRole('button', { name: 'Send Message' });
            expect(button).toHaveClass('btn', 'btn-primary');
        });
    });

    describe('form interactions', () => {
        it('should allow typing in the name field', () => {
            render(<Contact />);
            const nameInput = screen.getByLabelText('Name');
            fireEvent.change(nameInput, { target: { value: 'John Doe' } });
            expect(nameInput.value).toBe('John Doe');
        });

        it('should allow typing in the email field', () => {
            render(<Contact />);
            const emailInput = screen.getByLabelText('Email');
            fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
            expect(emailInput.value).toBe('john@example.com');
        });

        it('should allow typing in the message field', () => {
            render(<Contact />);
            const messageTextarea = screen.getByLabelText('Message');
            fireEvent.change(messageTextarea, { target: { value: 'Hello, this is a test message.' } });
            expect(messageTextarea.value).toBe('Hello, this is a test message.');
        });

        it('should have submit button with type submit', () => {
            render(<Contact />);
            const button = screen.getByRole('button', { name: 'Send Message' });
            expect(button).toHaveAttribute('type', 'submit');
        });
    });

    describe('accessibility', () => {
        it('should have labels associated with inputs via htmlFor', () => {
            render(<Contact />);
            const nameLabel = screen.getByText('Name');
            expect(nameLabel).toHaveAttribute('for', 'name');
        });

        it('should have correct id on name input', () => {
            render(<Contact />);
            const nameInput = screen.getByLabelText('Name');
            expect(nameInput).toHaveAttribute('id', 'name');
        });

        it('should have correct id on email input', () => {
            render(<Contact />);
            const emailInput = screen.getByLabelText('Email');
            expect(emailInput).toHaveAttribute('id', 'email');
        });

        it('should have correct id on message textarea', () => {
            render(<Contact />);
            const messageTextarea = screen.getByLabelText('Message');
            expect(messageTextarea).toHaveAttribute('id', 'message');
        });
    });
});
