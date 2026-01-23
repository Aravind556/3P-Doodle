// No imports needed for Navigate here anymore
import { Hero } from '../components/landing/Hero';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import './LandingPage.css';

import { Loading } from '../components/Loading';

export function LandingPage() {
    const { loading } = useAuth();

    if (loading) {
        return <Loading />;
    }

    return (
        <Layout>
            <Hero />
        </Layout>
    );
}
