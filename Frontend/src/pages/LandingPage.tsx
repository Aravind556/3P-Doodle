// No imports needed for Navigate here anymore
import { Hero } from '../components/landing/Hero';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import './LandingPage.css';

export function LandingPage() {
    const { loading } = useAuth();

    if (loading) {
        return <div className="loading-screen">Loading...</div>;
    }

    return (
        <Layout>
            <Hero />
        </Layout>
    );
}
