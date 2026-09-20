'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { api } from '@/lib/api';
import styles from './login.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [activeField, setActiveField] = useState<'username' | 'password' | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('adminToken')) router.replace('/admin/dashboard');
    }, [router]);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.login(username.trim(), password);
            if (response.success && response.data) {
                localStorage.setItem('adminToken', response.data.token);
                localStorage.setItem('adminUser', JSON.stringify(response.data.user));
                router.replace('/admin/dashboard');
                return;
            }
            setError(response.error || 'The admin ID or password is incorrect.');
        } catch (loginError) {
            console.error('Login failed:', loginError);
            setError('We could not reach the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const mascotState = activeField === 'password'
        ? showPassword ? styles.peeking : styles.covering
        : activeField === 'username' ? styles.watching : '';
    const lookDistance = Math.min(username.length * 0.45, 5);
    const mascotStyle = { '--look-x': `${lookDistance}px` } as CSSProperties;

    return (
        <main className={styles.page}>
            <Link href="/" className={styles.backLink} aria-label="Return to GreatLife Fitness home">← Back to website</Link>

            <section className={styles.shell}>
                <div className={styles.brandPanel}>
                    <div className={styles.brandGlow} />
                    <Image src="/images/logo.png" alt="GreatLife Fitness" width={92} height={92} className={styles.brandLogo} priority />
                    <div className={styles.brandCopy}>
                        <span>GreatLife operations</span>
                        <h1>Keep every game moving.</h1>
                        <p>Manage reservations, approvals, blocked schedules, payments, and business reports from one workspace.</p>
                    </div>
                    <div className={styles.brandMeta}>
                        <span><b>01</b> Review</span>
                        <span><b>02</b> Confirm</span>
                        <span><b>03</b> Welcome</span>
                    </div>
                </div>

                <div className={styles.formPanel}>
                    <div className={`${styles.mascot} ${mascotState} ${error ? styles.mascotError : ''}`} style={mascotStyle} aria-hidden="true">
                        <div className={styles.earLeft} />
                        <div className={styles.earRight} />
                        <div className={styles.mascotHead}>
                            <div className={styles.headBand}>GL</div>
                            <div className={styles.face}>
                                <div className={styles.eye}><span /></div>
                                <div className={styles.eye}><span /></div>
                                <div className={styles.nose} />
                                <div className={styles.smile} />
                            </div>
                        </div>
                        <div className={`${styles.hand} ${styles.handLeft}`}><span /></div>
                        <div className={`${styles.hand} ${styles.handRight}`}><span /></div>
                    </div>

                    <div className={styles.formHeading}>
                        <p>Staff portal</p>
                        <h2>Welcome back</h2>
                        <span>Sign in to manage today&apos;s court activity.</span>
                    </div>

                    <form className={styles.form} onSubmit={handleLogin}>
                        <div className={styles.field}>
                            <label htmlFor="username">Admin ID</label>
                            <div className={styles.inputWrap}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    onFocus={() => setActiveField('username')}
                                    onBlur={() => setActiveField(null)}
                                    placeholder="Enter your admin ID"
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.field}>
                            <div className={styles.labelRow}>
                                <label htmlFor="password">Password</label>
                                <span>Secure access</span>
                            </div>
                            <div className={styles.inputWrap}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" /></svg>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    onFocus={() => setActiveField('password')}
                                    onBlur={() => setActiveField(null)}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => setShowPassword((visible) => !visible)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        {error && <div className={styles.error} role="alert"><span>!</span>{error}</div>}

                        <button type="submit" className={styles.submit} disabled={loading || !username.trim() || !password}>
                            <span>{loading ? 'Signing you in…' : 'Sign in to dashboard'}</span>
                            {!loading && <span aria-hidden="true">→</span>}
                            {loading && <span className={styles.spinner} aria-hidden="true" />}
                        </button>
                    </form>

                    <p className={styles.support}>Having trouble signing in? Contact your system administrator.</p>
                </div>
            </section>
        </main>
    );
}
