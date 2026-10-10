import { createHelpRequest } from '../../domain/models/HelpRequest';
import {
  formatPrimaryLocation,
  formatSecondaryLocation,
  formatTechnicalCoords,
} from '../../domain/location/formatLocation';

const POIDOL_REQUEST = createHelpRequest({
  id: 'r1',
  title: 'Test',
  description: '',
  category: 'pets',
  latitude: 50.4616,
  longitude: 30.5147,
  city: 'Київ',
  district: 'Поділ',
  address: 'вул. Нижній Вал, 15',
  createdByUserId: 'u',
});

const NO_HUMAN_FIELDS_REQUEST = createHelpRequest({
  id: 'r2',
  title: 'Legacy',
  description: '',
  category: 'pets',
  latitude: 50.4286, // close to Печерськ centroid
  longitude: 30.5396,
  createdByUserId: 'u',
});

describe('formatLocation', () => {
  it('FL1: primary line uses city + district when present', () => {
    expect(formatPrimaryLocation(POIDOL_REQUEST)).toBe('Київ · Поділ');
  });

  it('FL2: primary line falls back to coords -> nearest district when missing', () => {
    expect(formatPrimaryLocation(NO_HUMAN_FIELDS_REQUEST)).toBe(
      'Київ · Печерськ',
    );
  });

  it('FL3: primary line appends distance when reference is provided', () => {
    const result = formatPrimaryLocation(POIDOL_REQUEST, {
      latitude: 50.45,
      longitude: 30.5,
    });
    expect(result.startsWith('Київ · Поділ · ')).toBe(true);
    expect(result).toMatch(/від вас|поруч/);
  });

  it('FL4: secondary line prefers explicit address', () => {
    expect(formatSecondaryLocation(POIDOL_REQUEST)).toBe(
      'вул. Нижній Вал, 15',
    );
  });

  it('FL5: secondary line falls back to district orientir when no address', () => {
    expect(formatSecondaryLocation(NO_HUMAN_FIELDS_REQUEST)).toBe(
      'біля м. Печерська',
    );
  });

  it('FL6: technical coords have 4-decimal precision', () => {
    expect(formatTechnicalCoords(POIDOL_REQUEST)).toBe('50.4616, 30.5147');
  });
});
