/** Fotos de silla: cámara → images/staff en elcache10.com. Sin SVG/HTML. */

export const STAFF_PHOTO_MAX_BYTES = 380_000;
export const STAFF_PHOTO_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,72}\.(webp|jpg|jpeg|png)$/;

const writeBuckets = new Map();

export function allowStaffPhotoWrite(ip, max = 8, windowMs = 60_000) {
  const key = String(ip || 'unknown');
  const now = Date.now();
  const current = writeBuckets.get(key);
  if (!current || now >= current.resetAt) {
    writeBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

export function sniffStaffPhoto(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

export function decodeStaffPhotoInput(raw) {
  const value = String(raw || '').trim();
  if (!value) throw new Error('Falta la foto.');
  const dataUrl = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-zA-Z0-9+/=\s]+)$/i);
  if (!dataUrl) throw new Error('La cámara debe enviar jpeg, png o webp.');
  const bytes = Buffer.from(dataUrl[2].replace(/\s/g, ''), 'base64');
  if (bytes.length < 32 || bytes.length > STAFF_PHOTO_MAX_BYTES) {
    throw new Error('La foto es demasiado pesada. Acerca y vuelve a tomar.');
  }
  const sniff = sniffStaffPhoto(bytes);
  if (!sniff) throw new Error('Solo se aceptan foto jpeg, png o webp.');
  return { bytes, ...sniff };
}

export function staffPhotoFilename(hint, ext) {
  const slug =
    String(hint || 'staff')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'staff';
  return `${slug}-${Date.now().toString(36)}.${ext}`;
}

export function assertStaffPhotoFilename(filename) {
  const value = String(filename || '').trim();
  if (!STAFF_PHOTO_NAME_RE.test(value)) throw new Error('Nombre de archivo inválido.');
  return value;
}

export function publicStaffPhotoUrl(filename) {
  return `https://www.elcache10.com/images/staff/${assertStaffPhotoFilename(filename)}`;
}

export function githubStaffPhotoPath(filename) {
  return `images/staff/${assertStaffPhotoFilename(filename)}`;
}

export function githubRawStaffPhotoUrl(filename, repo = 'AminVentura/ELCache10', branch = 'main') {
  const safeRepo = String(repo || 'AminVentura/ELCache10').replace(/[^A-Za-z0-9._:/-]/g, '');
  const safeBranch = String(branch || 'main').replace(/[^A-Za-z0-9._/-]/g, '');
  return `https://raw.githubusercontent.com/${safeRepo}/${safeBranch}/${githubStaffPhotoPath(filename)}`;
}
