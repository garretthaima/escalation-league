import React from 'react';
import { render, screen } from '@testing-library/react';
import PrivacyPolicy from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
    describe('rendering', () => {
        it('should render the privacy policy container', () => {
            const { container } = render(<PrivacyPolicy />);
            expect(container.querySelector('.privacy-policy')).toBeInTheDocument();
        });

        it('should render the page heading', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
        });

        it('should render the introduction paragraph', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText(/Welcome to Escalation League!/)).toBeInTheDocument();
            expect(screen.getByText(/Your privacy is important to us/)).toBeInTheDocument();
        });
    });

    describe('section headings', () => {
        it('should render section 1: Information We Collect', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: '1. Information We Collect' })).toBeInTheDocument();
        });

        it('should render section 2: How We Use Your Information', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: '2. How We Use Your Information' })).toBeInTheDocument();
        });

        it('should render section 3: Sharing Your Information', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: '3. Sharing Your Information' })).toBeInTheDocument();
        });

        it('should render section 4: Your Rights', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: '4. Your Rights' })).toBeInTheDocument();
        });

        it('should render section 5: Security', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: '5. Security' })).toBeInTheDocument();
        });

        it('should render section 6: Changes to This Policy', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: '6. Changes to This Policy' })).toBeInTheDocument();
        });

        it('should render section 7: Contact Us', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('heading', { name: '7. Contact Us' })).toBeInTheDocument();
        });
    });

    describe('section 1 content - Information We Collect', () => {
        it('should render intro text for information collection', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('We may collect the following types of information:')).toBeInTheDocument();
        });

        it('should list Personal Information', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText(/Personal Information: Name, email address, and other details you provide/)).toBeInTheDocument();
        });

        it('should list Usage Data', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText(/Usage Data: IP address, browser type, and pages visited/)).toBeInTheDocument();
        });

        it('should list Cookies', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText(/Cookies: Data stored on your device to enhance your experience/)).toBeInTheDocument();
        });
    });

    describe('section 2 content - How We Use Your Information', () => {
        it('should render intro text for information usage', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('We use your information to:')).toBeInTheDocument();
        });

        it('should list providing services', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('Provide and improve our services.')).toBeInTheDocument();
        });

        it('should list communication', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('Communicate with you about updates and promotions.')).toBeInTheDocument();
        });

        it('should list usage analysis', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('Analyze usage trends to improve user experience.')).toBeInTheDocument();
        });
    });

    describe('section 3 content - Sharing Your Information', () => {
        it('should render intro text for sharing information', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('We may share your information with:')).toBeInTheDocument();
        });

        it('should list service providers', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText(/Service providers \(e\.g\., hosting, analytics\)/)).toBeInTheDocument();
        });

        it('should list legal authorities', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('Legal authorities, if required by law.')).toBeInTheDocument();
        });
    });

    describe('section 4 content - Your Rights', () => {
        it('should render intro text for rights', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('You have the right to:')).toBeInTheDocument();
        });

        it('should list access and update rights', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('Access, update, or delete your personal information.')).toBeInTheDocument();
        });

        it('should list opt-out rights', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('Opt out of cookies and tracking technologies.')).toBeInTheDocument();
        });
    });

    describe('section 5 content - Security', () => {
        it('should render security information', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('We take reasonable measures to protect your data from unauthorized access or disclosure.')).toBeInTheDocument();
        });
    });

    describe('section 6 content - Changes to This Policy', () => {
        it('should render policy update information', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText('We may update this Privacy Policy from time to time. Changes will be posted on this page.')).toBeInTheDocument();
        });
    });

    describe('section 7 content - Contact Us', () => {
        it('should render contact information with email', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText(/If you have any questions about this Privacy Policy, please contact us at support@escalationleague.com/)).toBeInTheDocument();
        });
    });

    describe('structure and styling', () => {
        it('should have container class', () => {
            const { container } = render(<PrivacyPolicy />);
            expect(container.querySelector('.container')).toBeInTheDocument();
        });

        it('should have mt-5 margin class', () => {
            const { container } = render(<PrivacyPolicy />);
            expect(container.querySelector('.mt-5')).toBeInTheDocument();
        });

        it('should have text-center class on main heading', () => {
            render(<PrivacyPolicy />);
            const heading = screen.getByRole('heading', { name: 'Privacy Policy' });
            expect(heading).toHaveClass('text-center');
        });

        it('should have mb-4 class on main heading', () => {
            render(<PrivacyPolicy />);
            const heading = screen.getByRole('heading', { name: 'Privacy Policy' });
            expect(heading).toHaveClass('mb-4');
        });

        it('should render 8 headings total', () => {
            render(<PrivacyPolicy />);
            const headings = screen.getAllByRole('heading');
            expect(headings).toHaveLength(8); // 1 h1 + 7 h2
        });

        it('should have h1 for main heading', () => {
            render(<PrivacyPolicy />);
            const h1 = screen.getByRole('heading', { level: 1 });
            expect(h1).toHaveTextContent('Privacy Policy');
        });

        it('should have h2 for section headings', () => {
            render(<PrivacyPolicy />);
            const h2s = screen.getAllByRole('heading', { level: 2 });
            expect(h2s).toHaveLength(7);
        });
    });

    describe('lists', () => {
        it('should render multiple unordered lists', () => {
            render(<PrivacyPolicy />);
            const lists = screen.getAllByRole('list');
            expect(lists).toHaveLength(4); // Sections 1, 2, 3, and 4 have lists
        });

        it('should have correct number of list items in section 1', () => {
            render(<PrivacyPolicy />);
            const lists = screen.getAllByRole('list');
            const section1List = lists[0];
            expect(section1List.querySelectorAll('li')).toHaveLength(3);
        });

        it('should have correct number of list items in section 2', () => {
            render(<PrivacyPolicy />);
            const lists = screen.getAllByRole('list');
            const section2List = lists[1];
            expect(section2List.querySelectorAll('li')).toHaveLength(3);
        });

        it('should have correct number of list items in section 3', () => {
            render(<PrivacyPolicy />);
            const lists = screen.getAllByRole('list');
            const section3List = lists[2];
            expect(section3List.querySelectorAll('li')).toHaveLength(2);
        });

        it('should have correct number of list items in section 4', () => {
            render(<PrivacyPolicy />);
            const lists = screen.getAllByRole('list');
            const section4List = lists[3];
            expect(section4List.querySelectorAll('li')).toHaveLength(2);
        });
    });
});
