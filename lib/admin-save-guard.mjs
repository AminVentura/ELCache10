export function getStaleJsonConflict(incomingDoc, currentDoc) {
  const currentUpdatedAt = typeof currentDoc?.updated_at === 'string' ? currentDoc.updated_at : '';
  if (!currentUpdatedAt) return null;

  const incomingUpdatedAt = typeof incomingDoc?.updated_at === 'string' ? incomingDoc.updated_at : '';
  if (incomingUpdatedAt && incomingUpdatedAt === currentUpdatedAt) return null;

  return {
    status: 409,
    error: 'El JSON en GitHub cambio despues de abrir este admin. Refresca la pagina y vuelve a intentar para no revivir fotos u ofertas viejas.',
    currentUpdatedAt,
    incomingUpdatedAt,
  };
}

export function decodeGithubJsonContent(item) {
  if (!item?.content || typeof item.content !== 'string') return null;
  const normalized = item.content.replace(/\s/g, '');
  try {
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}
