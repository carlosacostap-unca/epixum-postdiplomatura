// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('./s3', () => ({ s3Client: { send: mocks.send } }));
import { documentStorageKey, DOCUMENT_LIMITS, prepareDocumentEvidence, submissionReferenceHash } from './document-preevaluation';
import { isDocumentSubmission, publicGoogleDocumentId } from './document-submission';

function body(bytes: Buffer) { return (async function* () { yield bytes; })(); }
const delivery = (name = 'mi-informe.pdf', url = 'https://storage.example.com/aula/informe.pdf') => ({ repositoryUrl: JSON.stringify([{ name, url }]) });

describe('informes adjuntos', () => {
  beforeEach(() => {
    vi.stubEnv('IDRIVE_ENDPOINT', 'https://storage.example.com');
    vi.stubEnv('IDRIVE_BUCKET_NAME', 'aula');
    mocks.send.mockReset().mockImplementation(async () => ({ Body: body(Buffer.from('%PDF-1.4\nFixture')) }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('restringe lecturas al bucket configurado, sin credenciales, consultas ni rutas ajenas', () => {
    expect(documentStorageKey('https://storage.example.com/aula/archivo%20uno.pdf')).toBe('archivo uno.pdf');
    for (const url of ['http://storage.example.com/aula/a.pdf', 'https://127.0.0.1/aula/a.pdf', 'https://storage.example.com.evil/aula/a.pdf', 'https://storage.example.com/otro/a.pdf', 'https://x:y@storage.example.com/aula/a.pdf', 'https://storage.example.com/aula/%2E%2E/secreto.pdf', 'https://storage.example.com/aula/a.pdf?token=x']) expect(documentStorageKey(url)).toBeNull();
  });
  it('envía bytes acotados, usa etiquetas anónimas y cambia la huella al cambiar el contenido', async () => {
    const first = await prepareDocumentEvidence(delivery());
    expect(first.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.files[0]).toMatchObject({ filename: 'informe-1.pdf', type: 'input_file', file_data: expect.stringMatching(/^data:application\/pdf;base64,/) });
    expect(first.coverage.commitSha).toBe('');
    expect(first.coverage.includedFiles).toEqual(['informe-1.pdf']);
    expect(first.text).not.toContain('mi-informe');
    mocks.send.mockResolvedValue({ Body: body(Buffer.from('%PDF-1.4\nOtra versión')) });
    expect((await prepareDocumentEvidence(delivery())).sourceDigest).not.toBe(first.sourceDigest);
    expect(submissionReferenceHash(delivery())).not.toBe(submissionReferenceHash(delivery('otra.pdf')));
  });
  it('informa límites visuales del DOCX y no los atribuye al estudiante', async () => {
    mocks.send.mockResolvedValue({ Body: body(Buffer.from('PK\x03\x04synthetic')) });
    const evidence = await prepareDocumentEvidence(delivery('informe.docx'));
    expect(evidence.files[0].filename).toBe('informe-1.docx');
    expect(evidence.limitations[0]).toContain('imágenes');
    expect(evidence.coverage.partial).toBe(true);
  });
  it('rechaza archivos falsos, vacíos, descargas excedidas y enlaces externos antes de OpenAI', async () => {
    mocks.send.mockResolvedValue({ Body: body(Buffer.from('<html>Login</html>')) });
    await expect(prepareDocumentEvidence(delivery())).rejects.toThrow('PDF válido');
    mocks.send.mockResolvedValue({ Body: body(Buffer.alloc(0)) });
    await expect(prepareDocumentEvidence(delivery())).rejects.toThrow('vacío');
    mocks.send.mockResolvedValue({ Body: body(Buffer.alloc(DOCUMENT_LIMITS.maxFileBytes + 1)) });
    await expect(prepareDocumentEvidence(delivery())).rejects.toThrow('10 MiB');
    mocks.send.mockClear();
    await expect(prepareDocumentEvidence(delivery('informe.pdf', 'https://evil.example/informe.pdf'))).rejects.toThrow('almacenamiento');
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('acepta Google Docs públicos por host y rechaza login/HTML', async () => {
    expect(publicGoogleDocumentId('https://docs.google.com/document/d/abc-123/edit')).toBe('abc-123');
    expect(publicGoogleDocumentId('https://docs.google.com.evil/document/d/abc/edit')).toBeNull();
    expect(isDocumentSubmission({ type: 'url', url: 'https://docs.google.com/document/d/abc/edit' })).toBe(true);
    const fetchMock = vi.fn(async () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(prepareDocumentEvidence({ repositoryUrl: JSON.stringify({ type: 'url', url: 'https://docs.google.com/document/d/abc/edit' }) })).rejects.toThrow('Google Doc público');
    expect(fetchMock).toHaveBeenCalledWith('https://docs.google.com/document/d/abc/export?format=txt', expect.objectContaining({ redirect: 'manual', cache: 'no-store' }));
  });
  it('sigue exportaciones Google con límite y bloquea desvíos a otros hosts', async () => {
    const reference = { repositoryUrl: JSON.stringify({ type: 'url', url: 'https://docs.google.com/document/d/abc/edit' }) };
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://download.googleusercontent.com/export' } })).mockResolvedValueOnce(new Response('Informe sintético', { headers: { 'content-type': 'text/plain' } }));
    vi.stubGlobal('fetch', fetchMock);
    const evidence = await prepareDocumentEvidence(reference);
    expect(evidence.files[0].filename).toBe('informe-1.txt');
    expect(evidence.limitations[0]).toContain('exportación de texto');
    fetchMock.mockReset().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/secreto' } }));
    await expect(prepareDocumentEvidence(reference)).rejects.toThrow('exportación pública');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
