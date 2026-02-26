'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Image from 'next/image';
import styles from './login.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRobotChecked, setIsRobotChecked] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isRobotChecked) {
            alert("Please click 'I'm not a robot'");
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await api.login(username, password);
            if (response.success && response.data) {
                localStorage.setItem('adminUser', JSON.stringify(response.data));
                router.push('/admin/dashboard');
            } else {
                setError(response.error || 'Invalid username or password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.body}>
            <div className={styles.loginContainer}>
                <div className={styles.loginWrapper}>
                    <div className={styles.loginHeader}>
                        <div className={styles.loginLogo}>
                            <Image
                                src="/images/logo-cropped.png"
                                alt="Logo"
                                width={60}
                                height={60}
                            />
                        </div>
                        <h1>Employee Dashboard</h1>
                    </div>
                    <p>Sign in to access the booking system</p>
                </div>

                <form className={styles.loginForm} onSubmit={handleLogin}>
                    <div className={styles.formGroup}>
                        <label htmlFor="username">Username</label>
                        <div className={styles.inputWithIcon}>
                            <i className="fas fa-user"></i>
                            <input
                                type="text"
                                id="username"
                                placeholder="Enter your username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password">Password</label>
                        <div className={styles.inputWithIcon}>
                            <i className="fas fa-lock"></i>
                            <input
                                type="password"
                                id="password"
                                placeholder="Enter your password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* reCAPTCHA Placeholder */}
                    <div className={styles.gRecaptcha}>
                        <div
                            className={styles.recaptchaWidget}
                            onClick={() => setIsRobotChecked(!isRobotChecked)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.recaptchaCheckboxContainer}>
                                <div className={`${styles.recaptchaCheckbox} ${isRobotChecked ? styles.checked : ''}`}></div>
                                <span className={styles.recaptchaText}>I&apos;m not a robot</span>
                            </div>
                            <div className={styles.recaptchaLogo}>
                                <Image
                                    src="https://www.gstatic.com/recaptcha/api2/logo_48.png"
                                    alt="reCAPTCHA"
                                    width={32}
                                    height={32}
                                />
                                <div className={styles.recaptchaLogoText}>reCAPTCHA</div>
                                <div className={styles.recaptchaLinks}>
                                    <a href="#">Privacy</a> - <a href="#">Terms</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className={styles.btnLogin} disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>

                    {error && (
                        <div className={styles.errorMessage} style={{ display: 'block' }}>
                            {error}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
