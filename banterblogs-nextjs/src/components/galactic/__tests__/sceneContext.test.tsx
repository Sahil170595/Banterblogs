import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GalacticScene from '../GalacticScene';
import { SCENE_CONTEXT_ATTRIBUTES } from '../sceneOpening';

// The scene's own WebGL context must refuse a software renderer too, not
// only the gate's probe: this stand-in Canvas records the context
// attributes the scene asks for and renders nothing inside.
const canvas = vi.hoisted(() => ({ gl: null as Record<string, unknown> | null }));
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ gl }: { gl: Record<string, unknown>; children?: ReactNode }) => {
    canvas.gl = gl;
    return null;
  },
  useFrame: () => undefined,
  useThree: () => ({}),
}));

describe('scene WebGL context', () => {
  afterEach(cleanup);

  it('is created with the same software-renderer refusal as the gate probe', () => {
    render(
      <GalacticScene
        onSelect={() => undefined}
        featuredName={null}
        onStarHover={() => undefined}
        onReady={() => undefined}
        paused={false}
        awake={false}
      />,
    );
    expect(canvas.gl).toMatchObject({ failIfMajorPerformanceCaveat: true });
    expect(canvas.gl).toMatchObject(SCENE_CONTEXT_ATTRIBUTES);
  });
});
