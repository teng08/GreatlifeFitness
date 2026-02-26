export default function TermsPage() {
    return (
        <div className="terms-page min-h-screen pt-32 pb-20 font-[Alata]">
            <section className="terms-container">
                <h1>Terms and Conditions</h1>
                <p className="text-center text-gray-500 mb-8">Last updated: October 5, 2025</p>

                <div className="space-y-6">
                    <p>
                        By accessing and using the <strong>GreatLife Fitness SmartWeb Reservation System</strong>, you agree to comply with our terms and policies.
                        All reservations made through this system are subject to court availability and must follow the gym’s booking and payment rules.
                    </p>
                    <p>
                        Users are responsible for providing accurate information and maintaining the confidentiality of their account.
                        GreatLife Fitness reserves the right to cancel, reschedule, or deny bookings due to maintenance, special events, or violations of facility guidelines.
                    </p>
                    <p>
                        Payments made are non-refundable unless the reservation is canceled by GreatLife Fitness.
                        By using this system, you acknowledge that all activities are at your own risk and that GreatLife Fitness shall not be held liable for any damages, injuries,
                        or data losses resulting from misuse, technical issues, or unauthorized access.
                    </p>
                    <p>
                        All content, logos, and system features are owned by GreatLife Fitness.
                        The company may update these terms at any time without prior notice.
                        Continued use of the system signifies your acceptance of any modifications.
                    </p>
                    <p className="pt-8 border-t border-gray-200">
                        For questions, please contact <a href="mailto:info@greatlifefitness.com" className="text-blue-600 hover:underline">info@greatlifefitness.com</a>.
                    </p>
                </div>
            </section>
        </div>
    );
}
