import {
  KYIV_DISTRICTS,
  defaultDistrict,
  findDistrictByCoords,
  findDistrictById,
  findDistrictByName,
} from '../../domain/location/HumanLocation';

describe('HumanLocation catalog', () => {
  it('HL1: contains 10 Kyiv districts with unique ids and centroids', () => {
    expect(KYIV_DISTRICTS).toHaveLength(10);
    const ids = new Set(KYIV_DISTRICTS.map((d) => d.id));
    expect(ids.size).toBe(10);
    for (const d of KYIV_DISTRICTS) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.orientir.length).toBeGreaterThan(0);
      expect(typeof d.centroid.latitude).toBe('number');
      expect(typeof d.centroid.longitude).toBe('number');
    }
  });

  it('HL2: findDistrictById returns the named district or undefined', () => {
    expect(findDistrictById('podil')?.name).toBe('Поділ');
    expect(findDistrictById('does-not-exist' as any)).toBeUndefined();
    expect(findDistrictById(undefined)).toBeUndefined();
  });

  it('HL3: findDistrictByName matches the human label exactly', () => {
    expect(findDistrictByName('Печерськ')?.id).toBe('pechersk');
    expect(findDistrictByName('  Поділ  ')?.id).toBe('podil');
    expect(findDistrictByName('Atlantis')).toBeUndefined();
    expect(findDistrictByName(undefined)).toBeUndefined();
  });

  it('HL4: findDistrictByCoords picks the nearest centroid', () => {
    // A point near Поділ should resolve to Поділ.
    const near = findDistrictByCoords({ latitude: 50.461, longitude: 30.514 });
    expect(near.id).toBe('podil');

    // A point near Голосіївський should resolve to that district.
    const south = findDistrictByCoords({
      latitude: 50.385,
      longitude: 30.498,
    });
    expect(south.id).toBe('holosiivskyi');
  });

  it('HL5: defaultDistrict resolves to Поділ', () => {
    expect(defaultDistrict().id).toBe('podil');
  });
});
