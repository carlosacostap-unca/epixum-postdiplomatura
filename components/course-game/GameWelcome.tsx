'use client';

import { useRef, useState, type FormEvent } from 'react';
import { CHARACTER_COLORS } from '@/lib/course-game/character-art';
import { DEFAULT_CHARACTER, PLATFORM_URL, petNameSchema, enrollmentCharacterSchema, type Character, type GameProgress, type ProfileDraft, type WelcomeActions } from '@/lib/course-game/onboarding';
import { CharacterPortrait } from './CharacterPortrait';
import styles from './welcome.module.css';

const labels: Record<string, string> = { clara: 'Clara', media: 'Media', morena: 'Morena', oscura: 'Oscura', castano: 'Castaño', negro: 'Negro', rubio: 'Rubio', pelirrojo: 'Pelirrojo', marron: 'Marrón', azul: 'Azul', verde: 'Verde', violeta: 'Violeta', rojo: 'Rojo', ocre: 'Ocre', gris: 'Gris' };
const fields = [
  { name: 'firstName', label: 'Nombre', autoComplete: 'given-name', type: 'text' },
  { name: 'lastName', label: 'Apellido', autoComplete: 'family-name', type: 'text' },
  { name: 'dni', label: 'DNI', autoComplete: 'off', type: 'text' },
  { name: 'birthDate', label: 'Fecha de nacimiento', autoComplete: 'bday', type: 'date' },
  { name: 'contactEmail', label: 'Email de contacto', autoComplete: 'email', type: 'email' },
  { name: 'phone', label: 'Teléfono de contacto', autoComplete: 'tel', type: 'tel' },
] as const;

export function GameWelcome({ profile: initialProfile, initialCharacter = DEFAULT_CHARACTER, editing = false, onCancel, save, onSaved, preview = false }: { initialCharacter?: Character; editing?: boolean; onCancel?: () => void; profile: ProfileDraft; save: WelcomeActions['save']; onSaved: (progress: GameProgress, profile: ProfileDraft) => void; preview?: boolean }) {
  const [step, setStep] = useState<'character' | 'profile'>('character');
  const [character, setCharacter] = useState<Character>(initialCharacter);
  const [profile, setProfile] = useState(initialProfile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const changeCharacter = <K extends keyof Character>(key: K, value: Character[K]) => setCharacter(current => ({ ...current, [key]: value }));
  const nextStep = (value: typeof step) => {
    if (value === 'profile') {
      const name = petNameSchema.safeParse(character.petName);
      if (!name.success) {
        setFieldErrors(current => ({ ...current, petName: name.error.issues[0].message }));
        document.getElementById('welcome-pet-name')?.focus();
        return;
      }
      changeCharacter('petName', name.data);
    }
    setStep(value); setError(''); setTimeout(() => heading.current?.focus(), 0);
  };
  function palette(key: keyof typeof CHARACTER_COLORS, title: string) {
    return <fieldset className={styles.palette}><legend>{title}</legend><div>{Object.entries(CHARACTER_COLORS[key]).map(([value, color]) => <button type="button" key={value} aria-label={`${title}: ${labels[value]}`} aria-pressed={character[key] === value} onClick={() => changeCharacter(key, value as Character[typeof key])} style={{ backgroundColor: color }}><span aria-hidden="true">{character[key] === value ? '✓' : ''}</span></button>)}</div></fieldset>;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = enrollmentCharacterSchema.safeParse({ character, profile });
    setFieldErrors({}); setError('');
    if (!parsed.success) {
      const errors = Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path.at(-1)), issue.message]));
      setFieldErrors(errors); setError('Revisá los datos marcados antes de continuar.');
      return;
    }
    setBusy(true);
    try {
      const result = await save(parsed.data);
      if (result.success) onSaved(result.progress, parsed.data.profile); else setError(result.error);
    } catch { setError('No pudimos guardar. Tus datos siguen en este formulario. Intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  return <main className={`${styles.welcome} ${editing ? styles.editing : ''}`}>
    <header className={styles.top}><span>✦ EPIXUM · VALLE DE LAS IDEAS</span>{editing ? <button type="button" disabled={busy} onClick={onCancel}>Cancelar cambios</button> : <a href={PLATFORM_URL}>← Volver a Epixum</a>}</header>
    <div className={styles.card}>
      <aside className={styles.characterStage}><span className={styles.caption}>TU HISTORIA COMIENZA AQUÍ</span><h1>Un nuevo habitante<br />para el valle.</h1><div className={styles.portraitFrame}><CharacterPortrait character={character} className={styles.portrait} /><div className={styles.ground} /></div><p>{step === 'character' ? 'Elegí cómo querés explorar este mundo.' : 'Tu personaje está listo. Ahora presentate con tus datos reales.'}</p><span className={styles.stepNote}>PERSONAJE · PERFIL · RECORRIDO</span></aside>
      <section className={styles.formArea}>
        <div className={styles.steps} aria-label="Etapas de bienvenida"><span aria-current={step === 'character' ? 'step' : undefined}>1 · Personaje</span><span aria-current={step === 'profile' ? 'step' : undefined}>2 · Tus datos</span><span>3 · Recorrido</span></div>
        <h2 ref={heading} tabIndex={-1}>{step === 'character' ? editing ? 'Editá tu personaje y mascota' : 'Creá tu personaje' : editing ? 'Actualizá tus datos' : 'Conozcámonos'}</h2>
        {preview && <p className={styles.previewNotice}>Vista de demostración: usá datos ficticios. No se envían ni se guardan datos de perfil.</p>}
        {step === 'character' ? <>
          {editing && <CharacterPortrait character={character} className={styles.editPortrait} />}
          <p className={styles.description}>Combiná rasgos y ropa para darle tu estilo. La apariencia del personaje no modifica tus datos personales.</p>
          <fieldset className={styles.bodyChoices}><legend>Personaje</legend>{(['hombre', 'mujer'] as const).map(body => <button key={body} type="button" aria-pressed={character.body === body} onClick={() => changeCharacter('body', body)}>{body === 'hombre' ? 'Hombre' : 'Mujer'}</button>)}</fieldset>
          <div className={styles.editorGrid}>
            {palette('skin', 'Tono de piel')}{palette('eyes', 'Color de ojos')}
            <label>Peinado<select value={character.hair} onChange={event => changeCharacter('hair', event.target.value as Character['hair'])}><option value="corto">Corto</option><option value="largo">Largo</option><option value="rizado">Rizado</option></select></label>
            {palette('hairColor', 'Color de pelo')}
            <label>Vestimenta<select value={character.outfit} onChange={event => changeCharacter('outfit', event.target.value as Character['outfit'])}><option value="camisa">Camisa</option><option value="jardinero">Jardinero</option></select></label>
            {palette('shirt', 'Color de ropa')}{palette('trousers', 'Pantalón')}
            <label>Accesorios<select value={character.accessory} onChange={event => changeCharacter('accessory', event.target.value as Character['accessory'])}><option value="ninguno">Sin accesorio</option><option value="anteojos">Anteojos</option><option value="sombrero">Sombrero</option></select></label>
          </div>
          <div className={styles.editorGrid}>
            <label htmlFor="welcome-pet-name">Nombre de tu perro robot<input id="welcome-pet-name" aria-label="Nombre de tu perro robot" value={character.petName} maxLength={24} required autoComplete="off" aria-invalid={Boolean(fieldErrors.petName)} aria-describedby="pet-name-help pet-name-error" onChange={event => { changeCharacter('petName', event.target.value); setFieldErrors(current => ({ ...current, petName: '' })); }} /><span id="pet-name-error" className={styles.fieldError}>{fieldErrors.petName}</span></label>
            <p id="pet-name-help" className={styles.description}>Tu compañero te seguirá por el valle y te ayudará con el curso. Elegí cómo querés llamarlo.</p>
          </div>
          <button type="button" className={styles.primary} onClick={() => nextStep('profile')}>Este es mi personaje →</button>
        </> : <form onSubmit={submit} noValidate>
          <p className={styles.description}>Completá tus datos reales para el perfil del curso. El email de contacto no cambia el correo con el que iniciás sesión.</p>
          <fieldset disabled={busy} className={styles.profileFields}><legend className={styles.srOnly}>Datos personales obligatorios</legend><div className={styles.editorGrid}>{fields.map(field => <label key={field.name} htmlFor={`welcome-${field.name}`}>{field.label}<input id={`welcome-${field.name}`} type={field.type} autoComplete={field.autoComplete} inputMode={field.name === 'dni' ? 'numeric' : undefined} required aria-label={field.label} value={profile[field.name]} maxLength={field.name === 'contactEmail' ? 254 : field.name === 'phone' ? 30 : 120} aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={fieldErrors[field.name] ? `error-${field.name}` : undefined} onChange={event => { setProfile(current => ({ ...current, [field.name]: event.target.value })); setFieldErrors(current => ({ ...current, [field.name]: '' })); }} />{fieldErrors[field.name] && <span className={styles.fieldError} id={`error-${field.name}`}>{fieldErrors[field.name]}</span>}</label>)}</div>
          <label className={styles.confirm}><input type="checkbox" checked={profile.confirmed} onChange={event => setProfile(current => ({ ...current, confirmed: event.target.checked }))} />Confirmo que estos datos son correctos.</label>
          {fieldErrors.confirmed && <p className={styles.fieldError}>{fieldErrors.confirmed}</p>}</fieldset>
          <p className={styles.privacy}>Estos datos se usan en tu perfil de Epixum. El paisaje y tu personaje no muestran tu DNI, fecha de nacimiento ni datos de contacto.</p>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.actions}><button type="button" disabled={busy} onClick={() => nextStep('character')}>← Editar personaje</button><button type="submit" disabled={busy} className={styles.primary}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar y conocer el valle →'}</button></div>
        </form>}
      </section>
    </div>
  </main>;
}
