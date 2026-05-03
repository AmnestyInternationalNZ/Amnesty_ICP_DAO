import { describe, expect, it } from 'vitest';
import { RUNTIME_CONFIG_PATH } from '../../frontend/src/config';

describe('runtime config', () => {
  it('loads env.json from the app origin root so deep-link refreshes keep the configured backend host', () => {
    expect(RUNTIME_CONFIG_PATH).toBe('/env.json');
  });
});
