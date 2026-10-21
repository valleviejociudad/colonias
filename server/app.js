require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDatabase, getDb } = require('./config/database');
const { enviarEmailSuspension } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'valle_viejo_colonias_secret_2025';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Helper to build full medical record object
function getFullInscripcionById(id) {
  const { queryOne } = getDb();
  const ins = queryOne(
    `SELECT i.*, c.nombre as colonia_nombre, c.sede as colonia_sede, c.turno as colonia_turno, c.direccion as colonia_direccion
     FROM inscripciones i
     LEFT JOIN colonias c ON c.id = i.colonia_id
     WHERE i.id = ?`,
    [id]
  );
  if (!ins) return null;

  const padre = queryOne('SELECT * FROM datos_padre WHERE inscripcion_id = ?', [id]) || {};
  const nino = queryOne('SELECT * FROM datos_nino WHERE inscripcion_id = ?', [id]) || {};
  const medica = queryOne('SELECT * FROM ficha_medica WHERE inscripcion_id = ?', [id]) || {};

  return {
    ...ins,
    padre,
    nino,
    medica
  };
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const { queryOne } = getDb();

  if (!email || !password) {
    return res.status(400).json({ error: 'Ingresá tu correo y contraseña' });
  }

  const user = queryOne('SELECT * FROM usuarios WHERE lower(email) = lower(?)', [email.trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      avatar: user.avatar
    }
  });
});

app.post('/api/auth/google', (req, res) => {
  const { email, nombre, googleId, avatar } = req.body;
  const { queryOne, runQuery } = getDb();

  if (!email) {
    return res.status(400).json({ error: 'Datos de Google incompletos' });
  }

  let user = queryOne('SELECT * FROM usuarios WHERE lower(email) = lower(?)', [email.trim()]);
  if (!user) {
    const hash = bcrypt.hashSync(googleId || 'google_oauth_user', 10);
    const result = runQuery(
      'INSERT INTO usuarios (nombre, email, password_hash, google_id, rol, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre || email.split('@')[0], email.trim(), hash, googleId || 'google', 'coordinador', avatar || '']
    );
    user = queryOne('SELECT * FROM usuarios WHERE id = ?', [result.lastInsertRowid]);
  }

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      avatar: user.avatar
    }
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { queryOne } = getDb();
  const user = queryOne('SELECT id, nombre, email, rol, avatar, created_at FROM usuarios WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
});

app.get('/api/auth/usuarios', authMiddleware, (req, res) => {
  const { queryAll } = getDb();
  const usuarios = queryAll('SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY id ASC');
  res.json(usuarios);
});

app.post('/api/auth/usuarios', authMiddleware, (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const { queryOne, runQuery } = getDb();
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Completá todos los campos del usuario' });
  }
  const existing = queryOne('SELECT id FROM usuarios WHERE lower(email) = lower(?)', [email.trim()]);
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo electrónico' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = runQuery(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre.trim(), email.trim(), hash, rol || 'coordinador']
  );
  res.status(201).json({ id: result.lastInsertRowid, nombre, email, rol: rol || 'coordinador' });
});

// ==================== COLONIAS ROUTES ====================

app.get('/api/colonias', (req, res) => {
  const { queryAll } = getDb();
  const colonias = queryAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM inscripciones i WHERE i.colonia_id = c.id AND i.estado = 'activo') as total_inscriptos
    FROM colonias c
    ORDER BY c.id ASC
  `);
  res.json(colonias);
});

app.post('/api/colonias', authMiddleware, (req, res) => {
  const {
    nombre, sede, direccion, descripcion, turno,
    edades, coordinador_responsable, telefono_sede, fecha_inicio, fecha_fin
  } = req.body;
  const { runQuery, queryOne } = getDb();

  if (!nombre || !sede || !direccion) {
    return res.status(400).json({ error: 'Nombre, sede y dirección son obligatorios' });
  }

  const result = runQuery(
    `INSERT INTO colonias (nombre, sede, direccion, descripcion, turno, edades, coordinador_responsable, telefono_sede, fecha_inicio, fecha_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre, sede, direccion, descripcion || '',
      turno || 'Mañana (08:30 a 12:30 hs)',
      edades || '5 a 13 años',
      coordinador_responsable || '',
      telefono_sede || '',
      fecha_inicio || '2025-01-06',
      fecha_fin || '2025-02-21'
    ]
  );

  const nueva = queryOne('SELECT * FROM colonias WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(nueva);
});

app.put('/api/colonias/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const {
    nombre, sede, direccion, descripcion, turno,
    edades, coordinador_responsable, telefono_sede,
    fecha_inicio, fecha_fin, activa, suspendida, motivo_suspension
  } = req.body;
  const { runQuery, queryOne } = getDb();

  runQuery(
    `UPDATE colonias SET
      nombre = COALESCE(?, nombre),
      sede = COALESCE(?, sede),
      direccion = COALESCE(?, direccion),
      descripcion = COALESCE(?, descripcion),
      turno = COALESCE(?, turno),
      edades = COALESCE(?, edades),
      coordinador_responsable = COALESCE(?, coordinador_responsable),
      telefono_sede = COALESCE(?, telefono_sede),
      fecha_inicio = COALESCE(?, fecha_inicio),
      fecha_fin = COALESCE(?, fecha_fin),
      activa = COALESCE(?, activa),
      suspendida = COALESCE(?, suspendida),
      motivo_suspension = COALESCE(?, motivo_suspension)
     WHERE id = ?`,
    [
      nombre ?? null, sede ?? null, direccion ?? null, descripcion ?? null,
      turno ?? null, edades ?? null, coordinador_responsable ?? null,
      telefono_sede ?? null, fecha_inicio ?? null, fecha_fin ?? null,
      activa !== undefined ? (activa ? 1 : 0) : null,
      suspendida !== undefined ? (suspendida ? 1 : 0) : null,
      motivo_suspension ?? null,
      id
    ]
  );

  const actualizada = queryOne('SELECT * FROM colonias WHERE id = ?', [id]);
  res.json(actualizada);
});

app.delete('/api/colonias/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { runQuery } = getDb();
  runQuery('DELETE FROM colonias WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ==================== VERIFICAR DNI EN TIEMPO REAL ====================

app.get('/api/inscripciones/verificar-dni/:dni', (req, res) => {
  const cleanDni = String(req.params.dni || '').replace(/\D/g, '');
  if (!cleanDni || cleanDni.length < 6) {
    return res.json({ existe: false });
  }

  const { queryOne } = getDb();
  const existente = queryOne(
    `SELECT n.dni, n.apellido_nombre as nino_nombre, n.edad,
            i.id as inscripcion_id, i.nro_ficha, i.fecha_inscripcion,
            c.nombre as colonia_nombre, c.sede as colonia_sede, c.turno as colonia_turno,
            p.apellido_nombre as padre_nombre
     FROM datos_nino n
     INNER JOIN inscripciones i ON i.id = n.inscripcion_id
     LEFT JOIN colonias c ON c.id = i.colonia_id
     LEFT JOIN datos_padre p ON p.inscripcion_id = i.id
     WHERE REPLACE(REPLACE(n.dni, '.', ''), ' ', '') = ?`,
    [cleanDni]
  );

  if (existente) {
    return res.json({
      existe: true,
      datos: existente
    });
  }

  res.json({ existe: false });
});

// ==================== INSCRIPCIONES & FICHAS MEDICAS ====================

app.get('/api/inscripciones', authMiddleware, (req, res) => {
  const { queryAll } = getDb();
  const rows = queryAll(`
    SELECT
      i.id, i.colonia_id, i.nro_ficha, i.fecha_inscripcion, i.autorizado, i.estado,
      i.firma_padre_texto, i.firma_profesional_texto,
      c.nombre as colonia_nombre, c.sede as colonia_sede, c.turno as colonia_turno,
      n.apellido_nombre as nino_nombre, n.dni as nino_dni, n.fecha_nacimiento, n.edad,
      n.domicilio, n.tiene_obra_social, n.obra_social_nombre, n.esquema_vacunacion,
      n.telefono_nino, n.presion_arterial, n.presion_alta, n.presion_baja,
      n.peso, n.talla, n.imc, n.circunferencia_cintura,
      p.apellido_nombre as padre_nombre, p.parentesco, p.dni as padre_dni,
      p.telefono as padre_telefono, p.whatsapp as padre_whatsapp, p.email as padre_email,
      p.contacto_urgencia,
      m.recibe_atencion_medica, m.atencion_medica_detalle,
      m.alergias_si, m.alergias_cual,
      m.cardiacas_si, m.cardiacas_cual,
      m.rinones_si, m.rinones_cual,
      m.oncologicas_si, m.oncologicas_cual,
      m.tiroides_si, m.tiroides_cual,
      m.asmas_si, m.asmas_cual,
      m.diabetes_si, m.diabetes_cual,
      m.neurologicas_si, m.neurologicas_cual,
      m.oftalmologicas_si, m.oftalmologicas_cual,
      m.auditivas_si, m.auditivas_cual,
      m.celiaquia_si, m.celiaquia_cual,
      m.discapacidad_si, m.discapacidad_cual,
      m.otras_si, m.otras_cual,
      m.antecedentes_personales, m.observaciones
    FROM inscripciones i
    LEFT JOIN colonias c ON c.id = i.colonia_id
    LEFT JOIN datos_nino n ON n.inscripcion_id = i.id
    LEFT JOIN datos_padre p ON p.inscripcion_id = i.id
    LEFT JOIN ficha_medica m ON m.inscripcion_id = i.id
    ORDER BY i.id DESC
  `);

  res.json(rows);
});

app.get('/api/inscripciones/:id', (req, res) => {
  const full = getFullInscripcionById(req.params.id);
  if (!full) return res.status(404).json({ error: 'Ficha médica no encontrada' });
  res.json(full);
});

app.post('/api/inscripciones', (req, res) => {
  const { colonia_id, autorizado, firma_padre_texto, padre = {}, nino = {}, medica = {} } = req.body;
  const { queryOne, runQuery } = getDb();

  const cleanDni = String(nino.dni || '').replace(/\D/g, '');
  if (!colonia_id || !cleanDni || !nino.apellido_nombre || !padre.apellido_nombre) {
    return res.status(400).json({ error: 'Por favor completá los datos obligatorios del niño/a y del padre/madre/tutor.' });
  }

  // Check duplicate DNI
  const dup = queryOne(
    `SELECT n.dni, n.apellido_nombre, i.nro_ficha, c.nombre as colonia_nombre
     FROM datos_nino n
     INNER JOIN inscripciones i ON i.id = n.inscripcion_id
     LEFT JOIN colonias c ON c.id = i.colonia_id
     WHERE REPLACE(REPLACE(n.dni, '.', ''), ' ', '') = ?`,
    [cleanDni]
  );

  if (dup) {
    return res.status(409).json({
      error: `El niño/a ${dup.apellido_nombre} (DNI ${dup.dni}) ya se encuentra inscripto en ${dup.colonia_nombre} (Ficha Nº ${dup.nro_ficha}).`,
      duplicado: dup
    });
  }

  // Generate sequential ficha number
  const lastRow = queryOne('SELECT MAX(id) as maxId FROM inscripciones');
  const nextNum = ((lastRow && lastRow.maxId) ? lastRow.maxId : 0) + 1;
  const nro_ficha = `VV-2025-${String(nextNum).padStart(4, '0')}`;

  const insResult = runQuery(
    `INSERT INTO inscripciones (colonia_id, nro_ficha, autorizado, firma_padre_texto, firma_profesional_texto)
     VALUES (?, ?, ?, ?, ?)`,
    [
      Number(colonia_id),
      nro_ficha,
      autorizado ? 1 : 0,
      firma_padre_texto || padre.apellido_nombre,
      medica.firma_profesional_texto || ''
    ]
  );

  const inscripcionId = insResult.lastInsertRowid;

  const cleanWhatsapp = String(padre.whatsapp || padre.telefono || '').replace(/\D/g, '');
  const formattedWhatsapp = cleanWhatsapp.startsWith('54') ? cleanWhatsapp : `549${cleanWhatsapp}`;

  runQuery(
    `INSERT INTO datos_padre (inscripcion_id, apellido_nombre, parentesco, dni, telefono, whatsapp, email, contacto_urgencia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inscripcionId,
      padre.apellido_nombre.trim(),
      padre.parentesco || 'Padre/Madre/Tutor',
      String(padre.dni || '').replace(/\D/g, ''),
      padre.telefono || '',
      formattedWhatsapp,
      (padre.email || '').trim(),
      padre.contacto_urgencia || padre.telefono || ''
    ]
  );

  runQuery(
    `INSERT INTO datos_nino (
      inscripcion_id, apellido_nombre, dni, fecha_nacimiento, edad, domicilio,
      tiene_obra_social, obra_social_nombre, esquema_vacunacion, telefono_nino,
      presion_arterial, presion_alta, presion_baja, peso, talla, imc, circunferencia_cintura
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inscripcionId,
      nino.apellido_nombre.trim(),
      cleanDni,
      nino.fecha_nacimiento || '',
      Number(nino.edad || 0),
      nino.domicilio || '',
      nino.tiene_obra_social ? 1 : 0,
      nino.obra_social_nombre || '',
      nino.esquema_vacunacion || 'Completo',
      nino.telefono_nino || padre.telefono || '',
      nino.presion_arterial || (nino.presion_alta && nino.presion_baja ? `${nino.presion_alta}/${nino.presion_baja}` : ''),
      nino.presion_alta || '',
      nino.presion_baja || '',
      nino.peso || '',
      nino.talla || '',
      nino.imc || '',
      nino.circunferencia_cintura || ''
    ]
  );

  runQuery(
    `INSERT INTO ficha_medica (
      inscripcion_id, recibe_atencion_medica, atencion_medica_detalle,
      alergias_si, alergias_cual,
      cardiacas_si, cardiacas_cual,
      rinones_si, rinones_cual,
      oncologicas_si, oncologicas_cual,
      tiroides_si, tiroides_cual,
      asmas_si, asmas_cual,
      diabetes_si, diabetes_cual,
      neurologicas_si, neurologicas_cual,
      oftalmologicas_si, oftalmologicas_cual,
      auditivas_si, auditivas_cual,
      celiaquia_si, celiaquia_cual,
      discapacidad_si, discapacidad_cual,
      otras_si, otras_cual,
      antecedentes_personales, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inscripcionId,
      medica.recibe_atencion_medica ? 1 : 0,
      medica.atencion_medica_detalle || '',
      medica.alergias_si ? 1 : 0, medica.alergias_cual || '',
      medica.cardiacas_si ? 1 : 0, medica.cardiacas_cual || '',
      medica.rinones_si ? 1 : 0, medica.rinones_cual || '',
      medica.oncologicas_si ? 1 : 0, medica.oncologicas_cual || '',
      medica.tiroides_si ? 1 : 0, medica.tiroides_cual || '',
      medica.asmas_si ? 1 : 0, medica.asmas_cual || '',
      medica.diabetes_si ? 1 : 0, medica.diabetes_cual || '',
      medica.neurologicas_si ? 1 : 0, medica.neurologicas_cual || '',
      medica.oftalmologicas_si ? 1 : 0, medica.oftalmologicas_cual || '',
      medica.auditivas_si ? 1 : 0, medica.auditivas_cual || '',
      medica.celiaquia_si ? 1 : 0, medica.celiaquia_cual || '',
      medica.discapacidad_si ? 1 : 0, medica.discapacidad_cual || '',
      medica.otras_si ? 1 : 0, medica.otras_cual || '',
      medica.antecedentes_personales || '',
      medica.observaciones || ''
    ]
  );

  const creada = getFullInscripcionById(inscripcionId);
  res.status(201).json(creada);
});

app.put('/api/inscripciones/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { colonia_id, autorizado, firma_padre_texto, firma_profesional_texto, padre = {}, nino = {}, medica = {} } = req.body;
  const { runQuery } = getDb();

  if (colonia_id !== undefined || autorizado !== undefined || firma_padre_texto !== undefined || firma_profesional_texto !== undefined) {
    runQuery(
      `UPDATE inscripciones SET
        colonia_id = COALESCE(?, colonia_id),
        autorizado = COALESCE(?, autorizado),
        firma_padre_texto = COALESCE(?, firma_padre_texto),
        firma_profesional_texto = COALESCE(?, firma_profesional_texto)
       WHERE id = ?`,
      [
        colonia_id ?? null,
        autorizado !== undefined ? (autorizado ? 1 : 0) : null,
        firma_padre_texto ?? null,
        firma_profesional_texto ?? null,
        id
      ]
    );
  }

  if (Object.keys(padre).length > 0) {
    runQuery(
      `UPDATE datos_padre SET
        apellido_nombre = COALESCE(?, apellido_nombre),
        parentesco = COALESCE(?, parentesco),
        dni = COALESCE(?, dni),
        telefono = COALESCE(?, telefono),
        whatsapp = COALESCE(?, whatsapp),
        email = COALESCE(?, email),
        contacto_urgencia = COALESCE(?, contacto_urgencia)
       WHERE inscripcion_id = ?`,
      [
        padre.apellido_nombre ?? null,
        padre.parentesco ?? null,
        padre.dni ?? null,
        padre.telefono ?? null,
        padre.whatsapp ?? null,
        padre.email ?? null,
        padre.contacto_urgencia ?? null,
        id
      ]
    );
  }

  if (Object.keys(nino).length > 0) {
    runQuery(
      `UPDATE datos_nino SET
        apellido_nombre = COALESCE(?, apellido_nombre),
        fecha_nacimiento = COALESCE(?, fecha_nacimiento),
        edad = COALESCE(?, edad),
        domicilio = COALESCE(?, domicilio),
        tiene_obra_social = COALESCE(?, tiene_obra_social),
        obra_social_nombre = COALESCE(?, obra_social_nombre),
        esquema_vacunacion = COALESCE(?, esquema_vacunacion),
        telefono_nino = COALESCE(?, telefono_nino),
        presion_arterial = COALESCE(?, presion_arterial),
        presion_alta = COALESCE(?, presion_alta),
        presion_baja = COALESCE(?, presion_baja),
        peso = COALESCE(?, peso),
        talla = COALESCE(?, talla),
        imc = COALESCE(?, imc),
        circunferencia_cintura = COALESCE(?, circunferencia_cintura)
       WHERE inscripcion_id = ?`,
      [
        nino.apellido_nombre ?? null,
        nino.fecha_nacimiento ?? null,
        nino.edad ?? null,
        nino.domicilio ?? null,
        nino.tiene_obra_social !== undefined ? (nino.tiene_obra_social ? 1 : 0) : null,
        nino.obra_social_nombre ?? null,
        nino.esquema_vacunacion ?? null,
        nino.telefono_nino ?? null,
        nino.presion_arterial ?? null,
        nino.presion_alta ?? null,
        nino.presion_baja ?? null,
        nino.peso ?? null,
        nino.talla ?? null,
        nino.imc ?? null,
        nino.circunferencia_cintura ?? null,
        id
      ]
    );
  }

  if (Object.keys(medica).length > 0) {
    runQuery(
      `UPDATE ficha_medica SET
        recibe_atencion_medica = COALESCE(?, recibe_atencion_medica),
        atencion_medica_detalle = COALESCE(?, atencion_medica_detalle),
        alergias_si = COALESCE(?, alergias_si), alergias_cual = COALESCE(?, alergias_cual),
        cardiacas_si = COALESCE(?, cardiacas_si), cardiacas_cual = COALESCE(?, cardiacas_cual),
        rinones_si = COALESCE(?, rinones_si), rinones_cual = COALESCE(?, rinones_cual),
        oncologicas_si = COALESCE(?, oncologicas_si), oncologicas_cual = COALESCE(?, oncologicas_cual),
        tiroides_si = COALESCE(?, tiroides_si), tiroides_cual = COALESCE(?, tiroides_cual),
        asmas_si = COALESCE(?, asmas_si), asmas_cual = COALESCE(?, asmas_cual),
        diabetes_si = COALESCE(?, diabetes_si), diabetes_cual = COALESCE(?, diabetes_cual),
        neurologicas_si = COALESCE(?, neurologicas_si), neurologicas_cual = COALESCE(?, neurologicas_cual),
        oftalmologicas_si = COALESCE(?, oftalmologicas_si), oftalmologicas_cual = COALESCE(?, oftalmologicas_cual),
        auditivas_si = COALESCE(?, auditivas_si), auditivas_cual = COALESCE(?, auditivas_cual),
        celiaquia_si = COALESCE(?, celiaquia_si), celiaquia_cual = COALESCE(?, celiaquia_cual),
        discapacidad_si = COALESCE(?, discapacidad_si), discapacidad_cual = COALESCE(?, discapacidad_cual),
        otras_si = COALESCE(?, otras_si), otras_cual = COALESCE(?, otras_cual),
        antecedentes_personales = COALESCE(?, antecedentes_personales),
        observaciones = COALESCE(?, observaciones)
       WHERE inscripcion_id = ?`,
      [
        medica.recibe_atencion_medica !== undefined ? (medica.recibe_atencion_medica ? 1 : 0) : null,
        medica.atencion_medica_detalle ?? null,
        medica.alergias_si !== undefined ? (medica.alergias_si ? 1 : 0) : null, medica.alergias_cual ?? null,
        medica.cardiacas_si !== undefined ? (medica.cardiacas_si ? 1 : 0) : null, medica.cardiacas_cual ?? null,
        medica.rinones_si !== undefined ? (medica.rinones_si ? 1 : 0) : null, medica.rinones_cual ?? null,
        medica.oncologicas_si !== undefined ? (medica.oncologicas_si ? 1 : 0) : null, medica.oncologicas_cual ?? null,
        medica.tiroides_si !== undefined ? (medica.tiroides_si ? 1 : 0) : null, medica.tiroides_cual ?? null,
        medica.asmas_si !== undefined ? (medica.asmas_si ? 1 : 0) : null, medica.asmas_cual ?? null,
        medica.diabetes_si !== undefined ? (medica.diabetes_si ? 1 : 0) : null, medica.diabetes_cual ?? null,
        medica.neurologicas_si !== undefined ? (medica.neurologicas_si ? 1 : 0) : null, medica.neurologicas_cual ?? null,
        medica.oftalmologicas_si !== undefined ? (medica.oftalmologicas_si ? 1 : 0) : null, medica.oftalmologicas_cual ?? null,
        medica.auditivas_si !== undefined ? (medica.auditivas_si ? 1 : 0) : null, medica.auditivas_cual ?? null,
        medica.celiaquia_si !== undefined ? (medica.celiaquia_si ? 1 : 0) : null, medica.celiaquia_cual ?? null,
        medica.discapacidad_si !== undefined ? (medica.discapacidad_si ? 1 : 0) : null, medica.discapacidad_cual ?? null,
        medica.otras_si !== undefined ? (medica.otras_si ? 1 : 0) : null, medica.otras_cual ?? null,
        medica.antecedentes_personales ?? null,
        medica.observaciones ?? null,
        id
      ]
    );
  }

  const updated = getFullInscripcionById(id);
  res.json(updated);
});

app.delete('/api/inscripciones/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { runQuery } = getDb();
  runQuery('DELETE FROM datos_padre WHERE inscripcion_id = ?', [id]);
  runQuery('DELETE FROM datos_nino WHERE inscripcion_id = ?', [id]);
  runQuery('DELETE FROM ficha_medica WHERE inscripcion_id = ?', [id]);
  runQuery('DELETE FROM inscripciones WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ==================== ALERTAS Y DIFUSIÓN (CLIMA / SUSPENSIONES) ====================

app.get('/api/alertas', (req, res) => {
  const { queryAll } = getDb();
  const alertas = queryAll(`
    SELECT a.*, c.nombre as colonia_nombre, c.sede as colonia_sede
    FROM alertas a
    LEFT JOIN colonias c ON c.id = a.colonia_id
    ORDER BY a.id DESC
  `);
  res.json(alertas);
});

app.post('/api/alertas', authMiddleware, async (req, res) => {
  const { colonia_id, tipo, titulo, mensaje, suspender_colonia, enviar_email } = req.body;
  const { queryAll, queryOne, runQuery } = getDb();

  if (!titulo || !mensaje) {
    return res.status(400).json({ error: 'Título y mensaje son obligatorios' });
  }

  let coloniaNombre = 'Todas las Sedes Municipales';
  if (colonia_id) {
    const col = queryOne('SELECT * FROM colonias WHERE id = ?', [colonia_id]);
    if (col) coloniaNombre = col.nombre;
    if (suspender_colonia) {
      runQuery('UPDATE colonias SET suspendida = 1, motivo_suspension = ? WHERE id = ?', [mensaje, colonia_id]);
    }
  } else if (suspender_colonia) {
    runQuery('UPDATE colonias SET suspendida = 1, motivo_suspension = ?', [mensaje]);
  }

  // Get affected parents for email and WhatsApp links
  const whereClause = colonia_id ? 'WHERE i.colonia_id = ?' : '';
  const params = colonia_id ? [colonia_id] : [];

  const padres = queryAll(
    `SELECT p.apellido_nombre, p.telefono, p.whatsapp, p.email,
            n.apellido_nombre as nino_nombre, c.nombre as colonia_nombre
     FROM datos_padre p
     INNER JOIN inscripciones i ON i.id = p.inscripcion_id
     LEFT JOIN datos_nino n ON n.inscripcion_id = i.id
     LEFT JOIN colonias c ON c.id = i.colonia_id
     ${whereClause}`,
    params
  );

  let emailResult = { enviados: 0, previewUrl: null };
  if (enviar_email !== false && padres.length > 0) {
    emailResult = await enviarEmailSuspension({
      destinatarios: padres,
      titulo,
      mensaje,
      coloniaNombre
    });
  }

  // Generate direct wa.me links for every registered parent
  const whatsappLinks = padres.map(p => {
    const num = String(p.whatsapp || p.telefono || '').replace(/\D/g, '');
    const phone = num.startsWith('54') ? num : `549${num}`;
    const texto = `⚠️ *COLONIAS DE VERANO - MUNICIPALIDAD DE VALLE VIEJO*\n\nHola *${p.apellido_nombre}* (tutor de *${p.nino_nombre}*):\n\n*${titulo}*\n${mensaje}\n\n📍 Sede: *${p.colonia_nombre || coloniaNombre}*`;
    return {
      padre_nombre: p.apellido_nombre,
      nino_nombre: p.nino_nombre,
      telefono: p.telefono,
      email: p.email,
      colonia_nombre: p.colonia_nombre,
      wa_link: `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`
    };
  });

  const ins = runQuery(
    `INSERT INTO alertas (colonia_id, tipo, titulo, mensaje, activa, enviada_email, enviada_whatsapp, destinatarios_count, creado_por)
     VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?)`,
    [
      colonia_id || null,
      tipo || 'suspension',
      titulo,
      mensaje,
      enviar_email !== false ? 1 : 0,
      padres.length,
      req.user ? req.user.nombre : 'Administrador'
    ]
  );

  const alerta = queryOne(
    `SELECT a.*, c.nombre as colonia_nombre
     FROM alertas a
     LEFT JOIN colonias c ON c.id = a.colonia_id
     WHERE a.id = ?`,
    [ins.lastInsertRowid]
  );

  res.status(201).json({
    alerta,
    emailResult,
    whatsappLinks
  });
});

app.put('/api/alertas/:id/desactivar', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { runQuery, queryOne } = getDb();
  const alerta = queryOne('SELECT * FROM alertas WHERE id = ?', [id]);
  runQuery('UPDATE alertas SET activa = 0 WHERE id = ?', [id]);
  if (alerta && alerta.colonia_id) {
    runQuery('UPDATE colonias SET suspendida = 0, motivo_suspension = NULL WHERE id = ?', [alerta.colonia_id]);
  } else {
    runQuery('UPDATE colonias SET suspendida = 0, motivo_suspension = NULL');
  }
  res.json({ ok: true });
});

// ==================== ESTADISTICAS DASHBOARD ====================

app.get('/api/estadisticas', authMiddleware, (req, res) => {
  const { queryOne, queryAll } = getDb();

  const totalInscriptos = queryOne('SELECT COUNT(*) as total FROM inscripciones WHERE estado = "activo"')?.total || 0;
  const totalColonias = queryOne('SELECT COUNT(*) as total FROM colonias WHERE activa = 1')?.total || 0;
  const conObraSocial = queryOne('SELECT COUNT(*) as total FROM datos_nino WHERE tiene_obra_social = 1')?.total || 0;
  const conAlertaMedica = queryOne(`
    SELECT COUNT(*) as total FROM ficha_medica
    WHERE alergias_si = 1 OR cardiacas_si = 1 OR asmas_si = 1 OR diabetes_si = 1
       OR neurologicas_si = 1 OR celiaquia_si = 1 OR discapacidad_si = 1 OR oncologicas_si = 1
  `)?.total || 0;
  const alertasActivas = queryOne('SELECT COUNT(*) as total FROM alertas WHERE activa = 1')?.total || 0;

  const porColonia = queryAll(`
    SELECT c.id, c.nombre, c.sede, c.turno, c.suspendida,
      COUNT(i.id) as inscriptos
    FROM colonias c
    LEFT JOIN inscripciones i ON i.colonia_id = c.id AND i.estado = 'activo'
    GROUP BY c.id
    ORDER BY c.id ASC
  `);

  res.json({
    totalInscriptos,
    totalColonias,
    conObraSocial,
    conAlertaMedica,
    alertasActivas,
    porColonia
  });
});

// Serve frontend in production (for Railway deployment)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), err => {
    if (err) res.status(200).send('API Colonias de Verano Valle Viejo funcionando.');
  });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Servidor Colonias de Verano corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error al inicializar BD:', err);
});
