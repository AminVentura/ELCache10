'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Chair = {
  id: string;
  name: string;
  role: string;
  roleKind: 'barber' | 'nails' | 'salon' | 'blowdry';
  phoneE164: string;
  email: string;
  photoUrl: string;
  locked: boolean;
  falta: string[];
};

type FormState = {
  id?: string;
  name: string;
  roleKind: Chair['roleKind'];
  phone: string;
  email: string;
  photoUrl: string;
};

const emptyForm = (): FormState => ({
  name: '',
  roleKind: 'barber',
  phone: '',
  email: '',
  photoUrl: '',
});

async function compressPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const ratio = Math.min(1, 720 / longest);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo leer la foto.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', 0.72);
  if (webp.startsWith('data:image/webp') && webp.length < 480_000) return webp;
  const jpeg = canvas.toDataURL('image/jpeg', 0.7);
  if (!jpeg.startsWith('data:image/jpeg')) throw new Error('No se pudo comprimir la foto.');
  if (jpeg.length > 480_000) throw new Error('La foto es demasiado pesada. Acerca y vuelve a tomar.');
  return jpeg;
}

export function EquipoPanel() {
  const [staff, setStaff] = useState<Chair[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/staff', { credentials: 'same-origin' });
    const json = (await res.json()) as { staff?: Chair[]; error?: string; falta?: string[] };
    if (!res.ok) {
      setMensaje(json.error || 'No se pudo leer el roster de citas.');
      if (Array.isArray(json.falta)) setMensaje(`${json.error || 'Falta conectar.'} ${json.falta.join(' ')}`);
      return;
    }
    setStaff(json.staff || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          roleKind: form.roleKind,
          phone: form.phone,
          email: form.email,
          photoUrl: form.photoUrl,
        }),
      });
      const json = (await res.json()) as { mensaje?: string; error?: string; falta?: string[] };
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar');
      setMensaje(json.mensaje || (json.falta?.length ? `Falta: ${json.falta.join('; ')}` : 'Guardado.'));
      setForm(emptyForm());
      await load();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const image = await compressPhoto(file);
      const res = await fetch('/api/staff-photo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ image, hint: form.id || form.name || 'staff' }),
      });
      const json = (await res.json()) as { photoUrl?: string; error?: string };
      if (!res.ok || !json.photoUrl) throw new Error(json.error || 'No se pudo guardar la foto.');
      setForm((current) => ({ ...current, photoUrl: json.photoUrl || '' }));
      setMensaje('Foto lista en www.elcache10.com/images/staff/');
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo usar la cámara.');
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  }

  async function remove(row: Chair) {
    if (row.locked || busy) return;
    if (!window.confirm(`Quitar a ${row.name} de www y del calendario?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const json = (await res.json()) as { mensaje?: string; error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo quitar');
      setMensaje(json.mensaje || 'Quitado.');
      await load();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow admin-eyebrow">Equipo</p>
          <h2>Sillas, barberos y salón</h2>
          <p>Francis agrega o quita nombre, celular, correo y foto. Al guardar solo se dice lo que falta.</p>
        </div>
        <a className="ghost-link" href="https://citas.elcache10.com/dashboard/sillas" target="_blank" rel="noopener">
          Misma pantalla en el calendario
        </a>
      </div>

      {mensaje ? <p className="status-line">{mensaje}</p> : null}

      <form
        className="admin-form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label>
          Nombre
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Puesto
          <select value={form.roleKind} onChange={(e) => setForm({ ...form, roleKind: e.target.value as FormState['roleKind'] })}>
            <option value="barber">Barbero (silla)</option>
            <option value="nails">Manicurista · Pedicurista</option>
            <option value="salon">Salón</option>
            <option value="blowdry">Blow Dry</option>
          </select>
        </label>
        <label>
          Celular
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Correo
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <div className="upload-field">
          <p className="upload-label">Foto (cámara o URL https)</p>
          <div className="button-row">
            <button className="secondary-btn" type="button" disabled={busy} onClick={() => cameraRef.current?.click()}>
              Tomar foto
            </button>
            <button className="secondary-btn" type="button" disabled={busy} onClick={() => galleryRef.current?.click()}>
              Elegir de galería
            </button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => uploadPhoto(e.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => uploadPhoto(e.target.files?.[0])}
          />
          {form.photoUrl ? (
            <img src={form.photoUrl} alt="" width={72} height={72} style={{ borderRadius: 8, objectFit: 'cover', marginTop: 8 }} />
          ) : null}
          <input
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            placeholder="https://www.elcache10.com/images/staff/..."
          />
        </div>
        <div className="button-row">
          <button className="primary-btn" type="submit" disabled={busy}>
            {form.id ? 'Guardar cambios' : 'Agregar'}
          </button>
          {form.id ? (
            <button className="secondary-btn" type="button" onClick={() => setForm(emptyForm())}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="workflow-grid" style={{ marginTop: 16 }}>
        {staff.map((row) => (
          <article key={row.id} className={row.falta.length ? 'workflow-step is-warning' : 'workflow-step is-ok'}>
            <img src={row.photoUrl || '/images/barbers-team.jpg'} alt="" width={56} height={56} style={{ borderRadius: 8, objectFit: 'cover' }} />
            <strong>{row.name}</strong>
            <p>{row.role}</p>
            <small>{row.falta.length ? `Falta: ${row.falta.join('; ')}` : 'Lista en web y calendario'}</small>
            <div className="button-row">
              <button
                className="secondary-btn"
                type="button"
                onClick={() =>
                  setForm({
                    id: row.id,
                    name: row.name,
                    roleKind: row.roleKind,
                    phone: row.phoneE164,
                    email: row.email,
                    photoUrl: row.photoUrl,
                  })
                }
              >
                Modificar
              </button>
              {row.locked ? null : (
                <button className="secondary-btn" type="button" onClick={() => remove(row)}>
                  Quitar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
