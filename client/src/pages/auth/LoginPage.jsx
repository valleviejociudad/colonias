import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, LogIn, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HeaderValleViejo from '../../components/ui/HeaderValleViejo';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@valleviejo.gob.ar');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAccountSelect = async (acc) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(acc);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowGoogleModal(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 14px',
        background: 'linear-gradient(145deg, #dff0fb 0%, #f4f8fc 55%, #e0f2fe 100%)'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1] }}
        className="gf-card"
        style={{ maxWidth: '460px', width: '100%', padding: '28px 26px' }}
      >
        <div className="gf-card-header-bar" />

        <HeaderValleViejo compact={true} showTemporada={false} />

        <div style={{ textAlign: 'center', margin: '18px 0 20px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#cbe6ff',
              color: '#001e30',
              fontSize: '0.76rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '999px',
              marginBottom: '8px'
            }}
          >
            <Shield size={14} /> PANEL DE GESTIÓN Y GUARDIA MÉDICA
          </span>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Colonias de Verano
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '4px' }}>
            Acceso para Administradores y Coordinadores Municipales
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#ffdad6',
              color: '#410002',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.86rem',
              fontWeight: 600,
              marginBottom: '14px'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="md3-field">
            <label className="md3-label">Correo electrónico</label>
            <input
              type="email"
              className="md3-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="md3-field">
            <label className="md3-label">Contraseña</label>
            <input
              type="password"
              className="md3-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="md3-btn md3-btn-filled"
            style={{ width: '100%', padding: '13px' }}
            disabled={loading}
          >
            <LogIn size={18} /> {loading ? 'Ingresando...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '16px 0',
            color: '#94a3b8',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span>O INGRESAR CON</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          className="md3-btn md3-btn-outlined"
          style={{
            width: '100%',
            background: '#ffffff',
            color: '#1e293b',
            borderColor: '#cbd5e1',
            padding: '12px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continuar con cuenta de Google
        </button>

        {/* Quick Demo Credentials Box */}
        <div
          style={{
            marginTop: '18px',
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid #e2e8f0',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ fontWeight: 700, color: '#006494', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> Acceso rápido de prueba local:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="md3-chip"
              onClick={() => {
                setEmail('admin@valleviejo.gob.ar');
                setPassword('admin123');
              }}
            >
              👤 Administrador
            </button>
            <button
              type="button"
              className="md3-chip"
              onClick={() => {
                setEmail('coordinador@valleviejo.gob.ar');
                setPassword('coord123');
              }}
            >
              🏃 Coordinador
            </button>
          </div>
        </div>

        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: '0.86rem', color: '#006494', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={15} /> Volver al Formulario Público de Padres
          </Link>
        </div>
      </motion.div>

      {/* Google Account Picker Modal */}
      {showGoogleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100
          }}
          onClick={() => setShowGoogleModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--md-sys-elevation-3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '6px' }}>
              Seleccioná una cuenta de Google
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Para continuar a <strong>Colonias de Verano Valle Viejo</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() =>
                  handleGoogleAccountSelect({
                    email: 'admin@valleviejo.gob.ar',
                    nombre: 'Subsecretaría de Deportes (Admin)',
                    googleId: 'google_admin_vv'
                  })
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '999px',
                    background: '#006494',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800
                  }}
                >
                  A
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Subsecretaría de Deportes</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>admin@valleviejo.gob.ar</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleGoogleAccountSelect({
                    email: 'coordinador@valleviejo.gob.ar',
                    nombre: 'Coordinación General Colonias',
                    googleId: 'google_coord_vv'
                  })
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '999px',
                    background: '#006c4c',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800
                  }}
                >
                  C
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Coordinación General</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>coordinador@valleviejo.gob.ar</div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
