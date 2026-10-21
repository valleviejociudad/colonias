import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Phone,
  MessageCircle,
  FileText,
  CloudLightning,
  Building2,
  Users,
  HeartPulse,
  Plus,
  Copy,
  Check,
  LogOut,
  Smartphone,
  Edit3,
  Trash2,
  Send,
  Mail,
  ExternalLink,
  ShieldAlert,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HeaderValleViejo from '../../components/ui/HeaderValleViejo';
import AlertaClimaticaBanner from '../../components/ui/AlertaClimaticaBanner';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';

const PATOLOGIAS_KEYS = [
  { key: 'alergias', label: 'Alergia' },
  { key: 'cardiacas', label: 'Cardíaca' },
  { key: 'rinones', label: 'Riñones' },
  { key: 'oncologicas', label: 'Oncológica' },
  { key: 'tiroides', label: 'Tiroides' },
  { key: 'asmas', label: 'Asma' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'neurologicas', label: 'Neurológica' },
  { key: 'oftalmologicas', label: 'Oftalmológica' },
  { key: 'auditivas', label: 'Auditiva' },
  { key: 'celiaquia', label: 'Celiaquía' },
  { key: 'discapacidad', label: 'Discapacidad' },
  { key: 'otras', label: 'Otra' }
];

export default function AdminDashboardPage() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('fichas'); // 'fichas' | 'dashboard' | 'colonias' | 'clima'
  const [inscripciones, setInscripciones] = useState([]);
  const [colonias, setColonias] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshBanner, setRefreshBanner] = useState(0);

  // Search & Filter states for Emergency Medical Finder
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColoniaFilter, setSelectedColoniaFilter] = useState('todas');
  const [onlyPatologias, setOnlyPatologias] = useState(false);

  // Selected medical record for full vertical view or edit
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [editModalFicha, setEditModalFicha] = useState(null);

  // Mobile compact vertical list & accordion expansion state
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [expandedMobileCardId, setExpandedMobileCardId] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleResize = (e) => setIsMobileView(e.matches);
    setIsMobileView(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  // New Colonia Modal
  const [showColoniaModal, setShowColoniaModal] = useState(false);
  const [nuevaColonia, setNuevaColonia] = useState({
    nombre: '',
    sede: '',
    direccion: '',
    descripcion: '',
    turno: 'Mañana (08:30 a 12:30 hs)',
    edades: '5 a 13 años',
    coordinador_responsable: '',
    telefono_sede: ''
  });

  // Weather / Suspension Broadcast state
  const [alertaForm, setAlertaForm] = useState({
    colonia_id: '',
    tipo: 'suspension',
    titulo: 'Suspensión de Colonia por Mal Clima / Lluvia',
    mensaje:
      'Informamos a las familias que por razones climáticas y para resguardar la seguridad de los niños/as, hoy se suspenden las actividades de la colonia de verano.',
    suspender_colonia: true,
    enviar_email: true
  });
  const [difusionResultado, setDifusionResultado] = useState(null);
  const [enviandoDifusion, setEnviandoDifusion] = useState(false);

  // PWA Install Prompt & Link Copy
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [resIns, resCol, resEst, resAle] = await Promise.all([
        authFetch('/api/inscripciones'),
        authFetch('/api/colonias'),
        authFetch('/api/estadisticas'),
        authFetch('/api/alertas')
      ]);

      if (resIns.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const [dataIns, dataCol, dataEst, dataAle] = await Promise.all([
        resIns.json(),
        resCol.json(),
        resEst.json(),
        resAle.json()
      ]);

      if (Array.isArray(dataIns)) setInscripciones(dataIns);
      if (Array.isArray(dataCol)) setColonias(dataCol);
      if (dataEst) setEstadisticas(dataEst);
      if (Array.isArray(dataAle)) setAlertas(dataAle);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const handleCopyPublicLink = () => {
    const url = window.location.origin + '/';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowPwaGuide(true);
    }
  };

  // Helper to list active conditions for a child
  const getPatologiasDeFicha = (item) => {
    return PATOLOGIAS_KEYS.filter((p) => Number(item[`${p.key}_si`]) === 1).map((p) => ({
      label: p.label,
      detalle: item[`${p.key}_cual`]
    }));
  };

  // Filtered medical records
  const fichasFiltradas = inscripciones.filter((item) => {
    if (selectedColoniaFilter !== 'todas' && String(item.colonia_id) !== String(selectedColoniaFilter)) {
      return false;
    }
    const pats = getPatologiasDeFicha(item);
    if (onlyPatologias && pats.length === 0) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(item.nino_nombre || '').toLowerCase().includes(q) ||
      String(item.nino_dni || '').toLowerCase().includes(q) ||
      String(item.padre_nombre || '').toLowerCase().includes(q) ||
      String(item.nro_ficha || '').toLowerCase().includes(q)
    );
  });

  const handleCrearColonia = async (e) => {
    e.preventDefault();
    const res = await authFetch('/api/colonias', {
      method: 'POST',
      body: JSON.stringify(nuevaColonia)
    });
    if (res.ok) {
      setShowColoniaModal(false);
      setNuevaColonia({
        nombre: '',
        sede: '',
        direccion: '',
        descripcion: '',
        turno: 'Mañana (08:30 a 12:30 hs)',
        edades: '5 a 13 años',
        coordinador_responsable: '',
        telefono_sede: ''
      });
      cargarTodo();
    }
  };

  const handleToggleSuspenderColonia = async (col) => {
    const nuevoEstado = col.suspendida === 1 ? 0 : 1;
    await authFetch(`/api/colonias/${col.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        suspendida: nuevoEstado,
        motivo_suspension: nuevoEstado ? 'Suspendida temporalmente por mal clima' : ''
      })
    });
    cargarTodo();
    setRefreshBanner((p) => p + 1);
  };

  const handleEliminarFicha = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la ficha médica de ${nombre}?`)) return;
    await authFetch(`/api/inscripciones/${id}`, { method: 'DELETE' });
    cargarTodo();
  };

  const handleGuardarEdicionFicha = async (e) => {
    e.preventDefault();
    if (!editModalFicha) return;
    const res = await authFetch(`/api/inscripciones/${editModalFicha.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        firma_profesional_texto: editModalFicha.firma_profesional_texto,
        nino: {
          peso: editModalFicha.peso,
          talla: editModalFicha.talla,
          imc: editModalFicha.imc,
          presion_alta: editModalFicha.presion_alta,
          presion_baja: editModalFicha.presion_baja,
          presion_arterial:
            editModalFicha.presion_alta && editModalFicha.presion_baja
              ? `${editModalFicha.presion_alta}/${editModalFicha.presion_baja}`
              : editModalFicha.presion_arterial,
          circunferencia_cintura: editModalFicha.circunferencia_cintura,
          esquema_vacunacion: editModalFicha.esquema_vacunacion
        },
        medica: {
          observaciones: editModalFicha.observaciones,
          antecedentes_personales: editModalFicha.antecedentes_personales
        }
      })
    });
    if (res.ok) {
      setEditModalFicha(null);
      cargarTodo();
    }
  };

  const handleEnviarDifusion = async (e) => {
    e.preventDefault();
    setEnviandoDifusion(true);
    try {
      const res = await authFetch('/api/alertas', {
        method: 'POST',
        body: JSON.stringify({
          ...alertaForm,
          colonia_id: alertaForm.colonia_id ? Number(alertaForm.colonia_id) : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDifusionResultado(data);
        cargarTodo();
        setRefreshBanner((p) => p + 1);
      }
    } finally {
      setEnviandoDifusion(false);
    }
  };

  const handleDesactivarAlerta = async (id) => {
    await authFetch(`/api/alertas/${id}/desactivar`, { method: 'PUT' });
    cargarTodo();
    setRefreshBanner((p) => p + 1);
  };

  const navItems = [
    { id: 'fichas', label: 'Fichas Médicas', icon: HeartPulse },
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'colonias', label: 'Colonias / Sedes', icon: Building2 },
    { id: 'clima', label: 'Clima & Alertas', icon: CloudLightning }
  ];

  return (
    <div className="app-shell">
      {/* ==================== DESKTOP NAVIGATION RAIL (Material Design 3) ==================== */}
      <aside className="app-navigation-rail no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px 20px' }}>
          <img src="/icon.svg" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
          <div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: '1.05rem', color: '#006494', lineHeight: 1.1 }}>
              Colonias de Verano
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Municipalidad de Valle Viejo
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setFichaSeleccionada(null);
                  setActiveTab(item.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '999px',
                  border: 'none',
                  background: active ? 'var(--md-sys-color-primary-container)' : 'transparent',
                  color: active ? 'var(--md-sys-color-on-primary-container)' : '#475569',
                  fontWeight: active ? 700 : 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <Link
            to="/"
            target="_blank"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '999px',
              color: '#006494',
              fontWeight: 600,
              fontSize: '0.88rem',
              textDecoration: 'none',
              marginTop: '8px'
            }}
          >
            <ExternalLink size={18} /> Ver Formulario Padres
          </Link>
        </nav>

        {/* User Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.nombre}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
                {user?.rol}
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{
                background: '#ffdad6',
                color: '#410002',
                border: 'none',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer'
              }}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="app-main-content">
        {/* Top Mobile App Bar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ flex: 1, minWidth: '260px' }}>
            <HeaderValleViejo compact={true} showTemporada={false} />
          </div>
        </div>

        {/* Active Weather / Suspension Alert Banner */}
        <AlertaClimaticaBanner refreshTrigger={refreshBanner} />

        {/* If a single medical sheet is selected, show the Vertical Official Planilla */}
        {fichaSeleccionada ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FichaMedicaVerticalView
              ficha={fichaSeleccionada}
              onBack={() => setFichaSeleccionada(null)}
            />
          </motion.div>
        ) : (
          <>
            {/* ==================== TAB 1: BUSCADOR DE URGENCIAS Y FICHAS MÉDICAS ==================== */}
            {activeTab === 'fichas' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Search & Emergency Filter Card */}
                <div
                  className="gf-card"
                  style={{
                    background: 'linear-gradient(135deg, #006494 0%, #0082a8 100%)',
                    color: '#ffffff',
                    padding: '22px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
                        Fichas Médicas Digitales ({fichasFiltradas.length})
                      </h2>
                    </div>
                    <Link
                      to="/"
                      className="md3-btn"
                      style={{ background: '#ffffff', color: '#006494', padding: '9px 16px', fontSize: '0.85rem' }}
                    >
                      <Plus size={16} /> Cargar Nueva Ficha
                    </Link>
                  </div>

                  {/* Instant Search Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ffffff',
                      borderRadius: '999px',
                      padding: '6px 18px',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
                    }}
                  >
                    <Search size={20} color="#006494" />
                    <input
                      type="text"
                      placeholder="Buscar rápido por Nombre del Niño/a, DNI, Apellido del Padre o Nº de Ficha..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        padding: '10px 0',
                        fontSize: '0.98rem',
                        color: '#0f172a',
                        background: 'transparent'
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Filter Chips by Colonia & Medical Alert */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                    <button
                      onClick={() => setSelectedColoniaFilter('todas')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        background: selectedColoniaFilter === 'todas' ? '#ffffff' : 'rgba(255,255,255,0.18)',
                        color: selectedColoniaFilter === 'todas' ? '#006494' : '#ffffff'
                      }}
                    >
                      Todas las Sedes ({inscripciones.length})
                    </button>
                    {colonias.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedColoniaFilter(String(c.id))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '999px',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          background: String(selectedColoniaFilter) === String(c.id) ? '#ffffff' : 'rgba(255,255,255,0.18)',
                          color: String(selectedColoniaFilter) === String(c.id) ? '#006494' : '#ffffff'
                        }}
                      >
                        {c.nombre}
                      </button>
                    ))}
                    <button
                      onClick={() => setOnlyPatologias(!onlyPatologias)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        background: onlyPatologias ? '#ffdad6' : 'rgba(255,255,255,0.22)',
                        color: onlyPatologias ? '#9f1239' : '#ffffff'
                      }}
                    >
                      ⚠️ Con Alergias / Patologías
                    </button>
                  </div>
                </div>

                {/* Medical Cards Grid */}
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Cargando fichas médicas...
                  </div>
                ) : fichasFiltradas.length === 0 ? (
                  <div className="gf-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ fontSize: '1.05rem', color: '#475569' }}>
                      No se encontraron niños/as con ese criterio de búsqueda.
                    </p>
                  </div>
                ) : (
                  <div
                    style={
                      isMobileView
                        ? { display: 'flex', flexDirection: 'column', gap: '10px' }
                        : {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                            gap: '16px'
                          }
                    }
                  >
                    {fichasFiltradas.map((item) => {
                      const patologias = getPatologiasDeFicha(item);
                      const cleanPhone = String(item.padre_telefono || '').replace(/\D/g, '');
                      const cleanWa = String(item.padre_whatsapp || item.padre_telefono || '').replace(/\D/g, '');
                      const waNum = cleanWa.startsWith('54') ? cleanWa : `549${cleanWa}`;
                      const isMobileCompressed = isMobileView && expandedMobileCardId !== item.id;

                      // Compact Vertical Row for Mobile View when not expanded
                      if (isMobileCompressed) {
                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setExpandedMobileCardId(item.id)}
                            className="gf-card"
                            style={{
                              padding: '12px 14px',
                              borderLeft: patologias.length > 0 ? '5px solid #e11d48' : '5px solid #006494',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  className="font-display"
                                  style={{
                                    fontSize: '0.98rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {item.nino_nombre}
                                </span>
                                {patologias.length > 0 && (
                                  <span
                                    style={{
                                      background: '#fff1f2',
                                      color: '#be123c',
                                      border: '1px solid #fecdd3',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                      flexShrink: 0
                                    }}
                                  >
                                    ⚠️ Alerta
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#475569',
                                  marginTop: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <span>
                                  <strong>DNI:</strong> {item.nino_dni}
                                </span>
                                <span>•</span>
                                <span style={{ color: '#006494', fontWeight: 600 }}>{item.colonia_nombre}</span>
                              </div>
                            </div>

                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '999px',
                                background: '#f1f5f9',
                                color: '#006494',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <ChevronDown size={18} />
                            </div>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="gf-card"
                          style={{
                            padding: '18px',
                            borderLeft: patologias.length > 0 ? '6px solid #e11d48' : '6px solid #006494',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div
                              onClick={() => {
                                if (isMobileView) setExpandedMobileCardId(null);
                              }}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: isMobileView ? 'pointer' : 'default'
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '3px 10px',
                                  borderRadius: '999px'
                                }}
                              >
                                {item.nro_ficha}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                                  {item.colonia_nombre}
                                </span>
                                {isMobileView && (
                                  <span
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '999px',
                                      background: '#f1f5f9',
                                      color: '#006494',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    title="Comprimir tarjeta"
                                  >
                                    <ChevronUp size={16} />
                                  </span>
                                )}
                              </div>
                            </div>

                            <h3
                              onClick={() => {
                                if (isMobileView) setExpandedMobileCardId(null);
                              }}
                              className="font-display"
                              style={{
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                color: '#0f172a',
                                marginTop: '8px',
                                cursor: isMobileView ? 'pointer' : 'default'
                              }}
                            >
                              {item.nino_nombre}
                            </h3>

                            <div style={{ fontSize: '0.84rem', color: '#334155', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              <span>
                                <strong>DNI:</strong> {item.nino_dni}
                              </span>
                              <span>
                                <strong>Edad:</strong> {item.edad} años
                              </span>
                              <span>
                                <strong>O. Social:</strong>{' '}
                                {Number(item.tiene_obra_social) === 1 ? item.obra_social_nombre : 'No'}
                              </span>
                            </div>

                            {/* Medical Alert Chips */}
                            {patologias.length > 0 ? (
                              <div
                                style={{
                                  marginTop: '10px',
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  borderRadius: '10px',
                                  padding: '8px 10px'
                                }}
                              >
                                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#be123c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <ShieldAlert size={14} /> ALERTA MÉDICA:
                                </div>
                                {patologias.map((p, idx) => (
                                  <div key={idx} style={{ fontSize: '0.8rem', color: '#881337', marginTop: '2px' }}>
                                    • <strong>{p.label}:</strong> {p.detalle}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div
                                style={{
                                  marginTop: '10px',
                                  fontSize: '0.78rem',
                                  color: '#006c4c',
                                  background: '#ecfdf5',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontWeight: 600
                                }}
                              >
                                ✔ Sin patologías de riesgo declaradas
                              </div>
                            )}

                            {/* Parent & Emergency Contact */}
                            <div
                              style={{
                                marginTop: '10px',
                                paddingTop: '8px',
                                borderTop: '1px dashed #cbd5e1',
                                fontSize: '0.82rem',
                                color: '#475569'
                              }}
                            >
                              <div>
                                <strong>Tutor ({item.parentesco}):</strong> {item.padre_nombre}
                              </div>
                              <div style={{ color: '#b91c1c', fontWeight: 600, marginTop: '2px' }}>
                                <strong>Urgencia:</strong> {item.contacto_urgencia}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons Material Design 3 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
                            {/* Row 1: Direct Contact (Call & WhatsApp) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="md3-btn md3-btn-call"
                                style={{
                                  height: '38px',
                                  padding: '0 12px',
                                  fontSize: '0.82rem',
                                  borderRadius: '10px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Llamar por teléfono al padre/tutor"
                              >
                                <Phone size={15} /> Llamar
                              </a>
                              <a
                                href={`https://wa.me/${waNum}`}
                                target="_blank"
                                rel="noreferrer"
                                className="md3-btn md3-btn-success"
                                style={{
                                  height: '38px',
                                  padding: '0 12px',
                                  fontSize: '0.82rem',
                                  borderRadius: '10px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Enviar WhatsApp al padre/tutor"
                              >
                                <MessageCircle size={15} /> WhatsApp
                              </a>
                            </div>

                            {/* Row 2: Medical Sheet & Admin Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => setFichaSeleccionada(item)}
                                className="md3-btn md3-btn-filled"
                                style={{
                                  flex: 1,
                                  height: '40px',
                                  padding: '0 14px',
                                  fontSize: '0.84rem',
                                  borderRadius: '10px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <FileText size={16} /> Ver Ficha / PDF
                              </button>
                              <button
                                onClick={() => setEditModalFicha({ ...item })}
                                className="md3-btn md3-btn-tonal"
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  padding: 0,
                                  borderRadius: '10px',
                                  flexShrink: 0
                                }}
                                title="Editar datos clínicos / Firmar"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleEliminarFicha(item.id, item.nino_nombre)}
                                className="md3-btn md3-btn-danger"
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  padding: 0,
                                  borderRadius: '10px',
                                  flexShrink: 0
                                }}
                                title="Eliminar ficha"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ==================== TAB 2: RESUMEN / ESTADÍSTICAS ==================== */}
            {activeTab === 'dashboard' && estadisticas && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>
                  Estadísticas Generales • Colonias de Verano
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                  }}
                >
                  <div className="gf-card" style={{ borderTop: '5px solid #006494' }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>TOTAL NIÑOS INSCRIPTOS</div>
                    <div className="font-display" style={{ fontSize: '2.3rem', fontWeight: 800, color: '#006494', marginTop: '4px' }}>
                      {estadisticas.totalInscriptos}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Fichas médicas digitales activas</div>
                  </div>

                  <div className="gf-card" style={{ borderTop: '5px solid #e11d48' }}>
                    <div style={{ fontSize: '0.82rem', color: '#be123c', fontWeight: 700 }}>CON PATOLOGÍAS / ALERGIAS</div>
                    <div className="font-display" style={{ fontSize: '2.3rem', fontWeight: 800, color: '#e11d48', marginTop: '4px' }}>
                      {estadisticas.conAlertaMedica}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Requieren atención prioritaria</div>
                  </div>

                  <div className="gf-card" style={{ borderTop: '5px solid #006c4c' }}>
                    <div style={{ fontSize: '0.82rem', color: '#006c4c', fontWeight: 700 }}>CON OBRA SOCIAL</div>
                    <div className="font-display" style={{ fontSize: '2.3rem', fontWeight: 800, color: '#006c4c', marginTop: '4px' }}>
                      {estadisticas.conObraSocial}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Cobertura médica declarada</div>
                  </div>

                  <div className="gf-card" style={{ borderTop: '5px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 700 }}>COLONIAS / SEDES ACTIVAS</div>
                    <div className="font-display" style={{ fontSize: '2.3rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                      {estadisticas.totalColonias}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Predios municipales habilitados</div>
                  </div>
                </div>

                <div className="gf-card">
                  <h3 className="font-display" style={{ fontSize: '1.15rem', marginBottom: '14px' }}>
                    Inscriptos por Colonia / Sede Municipal
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {estadisticas.porColonia?.map((col) => (
                      <div
                        key={col.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{col.nombre}</strong>
                          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            📍 {col.sede} • {col.turno}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {col.suspendida === 1 && (
                            <span style={{ background: '#fff3cd', color: '#b45309', padding: '4px 10px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700 }}>
                              ⚠️ Suspendida hoy
                            </span>
                          )}
                          <span
                            style={{
                              background: '#cbe6ff',
                              color: '#001e30',
                              padding: '6px 14px',
                              borderRadius: '999px',
                              fontWeight: 800,
                              fontSize: '0.88rem'
                            }}
                          >
                            {col.inscriptos} niños/as
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==================== TAB 3: GESTIÓN DE COLONIAS / SEDES ==================== */}
            {activeTab === 'colonias' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                      Sedes de Colonias de Verano
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: '#475569' }}>
                      Administrá las sedes municipales, coordinadores responsables y estado de actividad.
                    </p>
                  </div>
                  <button className="md3-btn md3-btn-filled" onClick={() => setShowColoniaModal(true)}>
                    <Plus size={18} /> Nueva Colonia / Sede
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
                  {colonias.map((col) => (
                    <div key={col.id} className="gf-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '999px',
                              background: col.suspendida === 1 ? '#fff3cd' : '#e6f8f0',
                              color: col.suspendida === 1 ? '#b45309' : '#006c4c'
                            }}
                          >
                            {col.suspendida === 1 ? '⚠️ SUSPENDIDA HOY' : '● ACTIVA'}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#006494' }}>
                            {col.total_inscriptos || 0} inscriptos
                          </span>
                        </div>

                        <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '8px' }}>
                          {col.nombre}
                        </h3>
                        <p style={{ fontSize: '0.86rem', color: '#475569', marginTop: '4px' }}>
                          📍 <strong>{col.sede}</strong> — {col.direccion}
                        </p>
                        <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '6px' }}>
                          {col.descripcion}
                        </p>

                        <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#334155', display: 'grid', gap: '4px' }}>
                          <div>🕒 <strong>Turno:</strong> {col.turno}</div>
                          <div>👦 <strong>Edades:</strong> {col.edades}</div>
                          <div>👤 <strong>Coordinador/a:</strong> {col.coordinador_responsable || 'A designar'}</div>
                          <div>📞 <strong>Tel. Sede:</strong> {col.telefono_sede || '-'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                        <button
                          onClick={() => {
                            setSelectedColoniaFilter(String(col.id));
                            setActiveTab('fichas');
                          }}
                          className="md3-btn md3-btn-tonal"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }}
                        >
                          <Users size={15} /> Ver Inscriptos
                        </button>
                        <button
                          onClick={() => handleToggleSuspenderColonia(col)}
                          className="md3-btn md3-btn-outlined"
                          style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                        >
                          {col.suspendida === 1 ? 'Reactivar Sede' : 'Suspender Hoy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ==================== TAB 4: DIFUSIÓN DE SUSPENSIONES POR CLIMA (EMAIL + WHATSAPP) ==================== */}
            {activeTab === 'clima' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                  {/* Broadcast Form */}
                  <div className="gf-card">
                    <div className="gf-card-section-bar" style={{ background: '#fff3cd', color: '#78350f' }}>
                      <CloudLightning size={16} /> Emitir Alerta por Clima o Fuerza Mayor
                    </div>
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
                      Difusión Oficial a Padres y Tutores
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '16px' }}>
                      Publicá un aviso inmediato en la web/app, enviá un correo automático a todos los padres inscriptos y obtené la lista de envío directo por WhatsApp (`wa.me`).
                    </p>

                    <form onSubmit={handleEnviarDifusion}>
                      <div className="md3-field">
                        <label className="md3-label">Colonia / Sede afectada</label>
                        <select
                          className="md3-select"
                          value={alertaForm.colonia_id}
                          onChange={(e) => setAlertaForm({ ...alertaForm, colonia_id: e.target.value })}
                        >
                          <option value="">🌩️ TODAS LAS SEDES MUNICIPALES</option>
                          {colonias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} ({c.sede})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md3-field">
                        <label className="md3-label">Título del Comunicado</label>
                        <input
                          type="text"
                          className="md3-input"
                          value={alertaForm.titulo}
                          onChange={(e) => setAlertaForm({ ...alertaForm, titulo: e.target.value })}
                          required
                        />
                      </div>

                      <div className="md3-field">
                        <label className="md3-label">Mensaje detallado para los Padres</label>
                        <textarea
                          rows="4"
                          className="md3-textarea"
                          value={alertaForm.mensaje}
                          onChange={(e) => setAlertaForm({ ...alertaForm, mensaje: e.target.value })}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={alertaForm.suspender_colonia}
                            onChange={(e) => setAlertaForm({ ...alertaForm, suspender_colonia: e.target.checked })}
                            style={{ transform: 'scale(1.2)', accentColor: '#006494' }}
                          />
                          <span>Marcar sede(s) como <strong>Suspendida por hoy</strong> en el banner público</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={alertaForm.enviar_email}
                            onChange={(e) => setAlertaForm({ ...alertaForm, enviar_email: e.target.checked })}
                            style={{ transform: 'scale(1.2)', accentColor: '#006494' }}
                          />
                          <span>Enviar <strong>Email automático</strong> a todos los padres inscriptos</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="md3-btn md3-btn-filled"
                        style={{ width: '100%', background: '#b45309' }}
                        disabled={enviandoDifusion}
                      >
                        <Send size={18} />
                        {enviandoDifusion
                          ? 'Enviando Emails y Generando WhatsApp...'
                          : 'Publicar Alerta + Enviar Emails + Generar WhatsApp'}
                      </button>
                    </form>
                  </div>

                  {/* WhatsApp & Email Results + History */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {difusionResultado && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="gf-card"
                        style={{ border: '2px solid #128c7e' }}
                      >
                        <h3 className="font-display" style={{ fontSize: '1.15rem', color: '#0f172a' }}>
                          ✅ ¡Comunicado Emitido! ({difusionResultado.whatsappLinks?.length || 0} familias alcanzadas)
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                          <Mail size={14} style={{ verticalAlign: 'middle' }} /> Correos procesados:{' '}
                          <strong>{difusionResultado.emailResult?.enviados || 0}</strong>.
                          {difusionResultado.emailResult?.previewUrl && (
                            <>
                              {' '}
                              <a
                                href={difusionResultado.emailResult.previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#006494', fontWeight: 700 }}
                              >
                                Ver vista previa del Email enviado ↗
                              </a>
                            </>
                          )}
                        </p>

                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#128c7e', marginBottom: '8px' }}>
                            📲 Envío rápido de WhatsApp a cada Padre/Tutor (Sin Meta API):
                          </div>
                          <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {difusionResultado.whatsappLinks?.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  background: '#f8fafc',
                                  borderRadius: '10px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.82rem'
                                }}
                              >
                                <div>
                                  <strong>{item.padre_nombre}</strong> (Tutor de {item.nino_nombre})
                                  <div style={{ color: '#64748b', fontSize: '0.76rem' }}>Tel: {item.telefono}</div>
                                </div>
                                <a
                                  href={item.wa_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="md3-btn md3-btn-success"
                                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                >
                                  <MessageCircle size={14} /> Enviar WhatsApp
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="gf-card">
                      <h3 className="font-display" style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                        Historial de Alertas y Suspensiones
                      </h3>
                      {alertas.length === 0 ? (
                        <p style={{ fontSize: '0.86rem', color: '#64748b' }}>
                          No hay alertas climáticas emitidas recientemente.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {alertas.map((al) => (
                            <div
                              key={al.id}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: al.activa ? '#fffbeb' : '#f8fafc',
                                border: al.activa ? '1px solid #f59e0b' : '1px solid #e2e8f0'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '0.92rem' }}>{al.titulo}</strong>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: al.activa ? '#f59e0b' : '#cbd5e1',
                                    color: al.activa ? '#fff' : '#334155'
                                  }}
                                >
                                  {al.activa ? 'ACTIVA EN WEB' : 'FINALIZADA'}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                                {al.mensaje}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.76rem', color: '#64748b' }}>
                                <span>Sede: {al.colonia_nombre || 'Todas'} • {al.created_at}</span>
                                {al.activa === 1 && (
                                  <button
                                    onClick={() => handleDesactivarAlerta(al.id)}
                                    className="md3-btn md3-btn-outlined"
                                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                                  >
                                    Levantar Suspensión
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* ==================== MOBILE BOTTOM NAVIGATION BAR (PWA App Feel) ==================== */}
      <nav className="app-bottom-nav no-print">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setFichaSeleccionada(null);
                setActiveTab(item.id);
              }}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
            >
              <div className="bottom-nav-pill">
                <Icon size={20} />
              </div>
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* ==================== MODAL: CREAR NUEVA COLONIA ==================== */}
      {showColoniaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100
          }}
          onClick={() => setShowColoniaModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gf-card"
            style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '14px' }}>
              Nueva Colonia / Sede Municipal
            </h3>
            <form onSubmit={handleCrearColonia}>
              <div className="md3-field">
                <label className="md3-label">Nombre de la Colonia *</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Predio de UTHGRA / SUM de Las Tejas"
                  value={nuevaColonia.nombre}
                  onChange={(e) => setNuevaColonia({ ...nuevaColonia, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="md3-field">
                <label className="md3-label">Predio / Sede *</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Polideportivo Municipal"
                  value={nuevaColonia.sede}
                  onChange={(e) => setNuevaColonia({ ...nuevaColonia, sede: e.target.value })}
                  required
                />
              </div>
              <div className="md3-field">
                <label className="md3-label">Dirección *</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Calle y Localidad, Valle Viejo"
                  value={nuevaColonia.direccion}
                  onChange={(e) => setNuevaColonia({ ...nuevaColonia, direccion: e.target.value })}
                  required
                />
              </div>
              <div className="md3-field">
                <label className="md3-label">Turno y Horario</label>
                <input
                  type="text"
                  className="md3-input"
                  value={nuevaColonia.turno}
                  onChange={(e) => setNuevaColonia({ ...nuevaColonia, turno: e.target.value })}
                />
              </div>
              <div className="md3-field">
                <label className="md3-label">Coordinador/a Responsable</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Prof. Martín Carrizo"
                  value={nuevaColonia.coordinador_responsable}
                  onChange={(e) => setNuevaColonia({ ...nuevaColonia, coordinador_responsable: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="md3-btn md3-btn-outlined" onClick={() => setShowColoniaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="md3-btn md3-btn-filled">
                  Guardar Colonia
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ==================== MODAL: EDITAR DATOS CLÍNICOS / FIRMA PROFESIONAL ==================== */}
      {editModalFicha && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100
          }}
          onClick={() => setEditModalFicha(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gf-card"
            style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
              Actualizar Control de Salud: {editModalFicha.nino_nombre}
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '14px' }}>
              Ficha Nº {editModalFicha.nro_ficha} • DNI {editModalFicha.nino_dni}
            </p>
            <form onSubmit={handleGuardarEdicionFicha}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div className="md3-field">
                  <label className="md3-label">Peso (kg)</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.peso || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, peso: e.target.value })}
                  />
                </div>
                <div className="md3-field">
                  <label className="md3-label">Talla (cm)</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.talla || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, talla: e.target.value })}
                  />
                </div>
                <div className="md3-field">
                  <label className="md3-label">Presión Alta</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.presion_alta || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, presion_alta: e.target.value })}
                  />
                </div>
                <div className="md3-field">
                  <label className="md3-label">Presión Baja</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.presion_baja || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, presion_baja: e.target.value })}
                  />
                </div>
              </div>

              <div className="md3-field">
                <label className="md3-label">Observaciones Médicas / Indicaciones de Urgencia</label>
                <textarea
                  rows="3"
                  className="md3-textarea"
                  value={editModalFicha.observaciones || ''}
                  onChange={(e) => setEditModalFicha({ ...editModalFicha, observaciones: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">Firma y Sello del Profesional de la Salud</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Dr. Roberto Juárez - MP 1842"
                  value={editModalFicha.firma_profesional_texto || ''}
                  onChange={(e) =>
                    setEditModalFicha({ ...editModalFicha, firma_profesional_texto: e.target.value })
                  }
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" className="md3-btn md3-btn-outlined" onClick={() => setEditModalFicha(null)}>
                  Cancelar
                </button>
                <button type="submit" className="md3-btn md3-btn-filled">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ==================== MODAL: GUÍA INSTALACIÓN PWA ANDROID & iOS ==================== */}
      {showPwaGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100
          }}
          onClick={() => setShowPwaGuide(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gf-card"
            style={{ maxWidth: '460px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '10px' }}>
              📱 Instalar App "Colonias de Verano"
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '14px' }}>
              Esta plataforma es una <strong>PWA (Progressive Web App)</strong> oficial. Podés instalarla en tu celular Android o iPhone sin pasar por la tienda de aplicaciones:
            </p>
            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', marginBottom: '10px', fontSize: '0.85rem' }}>
              <strong>🤖 En Android (Chrome):</strong>
              <p style={{ marginTop: '4px' }}>
                Tocá el menú de 3 puntos <strong>(⋮)</strong> arriba a la derecha y elegí <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
              <strong>🍏 En iPhone / iPad (Safari):</strong>
              <p style={{ marginTop: '4px' }}>
                Tocá el botón <strong>Compartir (⬆️)</strong> en la barra inferior de Safari y seleccioná <strong>"Agregar a inicio"</strong>.
              </p>
            </div>
            <button className="md3-btn md3-btn-filled" style={{ width: '100%' }} onClick={() => setShowPwaGuide(false)}>
              ¡Entendido!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
