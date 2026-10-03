import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import example from '@/public/interactive-class-example.json';
import { parseInteractiveMaterial } from '@/lib/interactive-material';
import { InteractiveMaterialPreview } from './InteractiveMaterialPreview';

describe('vista previa interactiva', () => {
  it('recorre pantallas y prueba los tres tipos de actividad sin persistir', async () => {
    const user = userEvent.setup();
    render(<InteractiveMaterialPreview material={parseInteractiveMaterial(example)!} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Buscar evidencias y contrastarlas' }));
    await user.click(screen.getByRole('button', { name: 'Probar respuesta' }));
    expect(screen.getByRole('status')).toHaveTextContent('Respuesta correcta');
    await user.click(screen.getByRole('button', { name: 'Volver a probar' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Ver ejemplos' }));
    await user.click(screen.getByRole('button', { name: 'Probar respuesta' }));
    expect(screen.getByRole('status')).toHaveTextContent('No se guardó ningún dato');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.type(screen.getByRole('textbox'), 'Quiero investigar más.');
    await user.click(screen.getByRole('button', { name: 'Probar respuesta' }));
    expect(screen.getByRole('status')).toHaveTextContent('No se guardó ningún dato');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
  it('no renderiza HTML ejecutable ni enlaces javascript', () => {
    const material = parseInteractiveMaterial({ version: 1, screens: [{ id: 'safe', type: 'content', title: 'Seguridad', body: '<script>alert(1)</script>\n\n[Enlace](javascript:alert%281%29)\n\n**Texto seguro**' }] })!;
    const { container } = render(<InteractiveMaterialPreview material={material} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).not.toMatch(/^javascript:/);
    expect(screen.getByText('Texto seguro')).toBeInTheDocument();
  });
});
