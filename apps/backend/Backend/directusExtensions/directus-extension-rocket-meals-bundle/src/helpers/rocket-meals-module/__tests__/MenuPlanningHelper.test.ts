import { describe, expect, it } from '@jest/globals';
import { MenuPlanningHelper, type MenuPlanningContext, type MenuPlanningRequest } from '../MenuPlanningHelper';

const food = (id: string) => ({ id, name: id, image: null, image_remote_url: null, rating_average: 4.5, rating_count: 10, offer_count: 1, waiting_count: 2, last_offered: null, next_offered: null });

function createContext(): MenuPlanningContext {
  return {
    range: { from: '2026-10-19', to: '2026-10-25' },
    reference_range: { from: '2025-10-20', to: '2025-10-26' },
    reference_days: [
      { date: '2025-10-20', offers: [{ food_id: 'schnitzel', name: 'Schnitzel', category: 'Hauptgericht', rating_average: 4.6, rating_count: 20, comments: ['Super'] }] },
      { date: '2025-10-21', offers: [{ food_id: 'curry', name: 'Curry', category: null, rating_average: 2.1, rating_count: 5, comments: [] }] },
    ],
    offers_per_day: 1,
    top_foods: [food('lasagne')],
    flop_foods: [],
    awaited_foods: [food('pizza')],
    markings: [{ id: 'vegan', name: 'Vegan', short_code: 'VG', group_name: null, image: null, image_remote_url: null, offer_count: 3, offer_share: 0.333, day_coverage: 0.5, profile_likes: 10, profile_dislikes: 1 }],
    languages: [{ id: 'de-DE', name: 'Deutsch', count: 100 }],
  };
}

const request: MenuPlanningRequest = { canteen: 'main', year: 2026, week: 43, weeks: 1, notes: 'Freitag Fisch', language: 'de-DE' };

describe('MenuPlanningHelper', () => {
  describe('ISO weeks', () => {
    it('finds the Monday of a week', () => {
      expect(MenuPlanningHelper.getMondayOfIsoWeek(2026, 1).toISOString().slice(0, 10)).toBe('2025-12-29');
      expect(MenuPlanningHelper.getMondayOfIsoWeek(2026, 43).toISOString().slice(0, 10)).toBe('2026-10-19');
    });

    it('finds the week of a date, also around the turn of the year', () => {
      expect(MenuPlanningHelper.getIsoWeek(new Date('2026-10-14T00:00:00Z'))).toEqual({ year: 2026, week: 42 });
      expect(MenuPlanningHelper.getIsoWeek(new Date('2027-01-01T00:00:00Z'))).toEqual({ year: 2026, week: 53 });
      expect(MenuPlanningHelper.getIsoWeek(new Date('2025-12-29T00:00:00Z'))).toEqual({ year: 2026, week: 1 });
    });

    it('knows years with 53 weeks', () => {
      expect(MenuPlanningHelper.getIsoWeeksInYear(2026)).toBe(53);
      expect(MenuPlanningHelper.getIsoWeeksInYear(2025)).toBe(52);
    });

    it('builds the range of the planned weeks', () => {
      expect(MenuPlanningHelper.getRange(2026, 43, 2)).toEqual({ from: '2026-10-19', to: '2026-11-01' });
    });

    it('takes the same weeks a year earlier as reference, week 53 becomes 52', () => {
      expect(MenuPlanningHelper.getReferenceRange(2026, 43, 1)).toEqual({ from: '2025-10-20', to: '2025-10-26' });
      expect(MenuPlanningHelper.getReferenceRange(2026, 53, 1)).toEqual(MenuPlanningHelper.getRange(2025, 52, 1));
    });

    it('lists the planned weeks across the turn of the year', () => {
      expect(MenuPlanningHelper.getPlannedWeeks(2026, 53, 2)).toEqual([
        { year: 2026, week: 53 },
        { year: 2027, week: 1 },
      ]);
    });
  });

  describe('parseRequest', () => {
    it('normalises a valid request', () => {
      expect(MenuPlanningHelper.parseRequest({ canteen: ' main ', year: '2026', week: 43, weeks: 9, notes: '  Fisch ', language: 'en-US' })).toEqual({ canteen: 'main', year: 2026, week: 43, weeks: MenuPlanningHelper.MAX_WEEKS, notes: 'Fisch', language: 'en-US' });
    });

    it('rejects missing or impossible weeks', () => {
      expect(MenuPlanningHelper.parseRequest({ year: 2026 })).toBeNull();
      expect(MenuPlanningHelper.parseRequest({ year: 2025, week: 53 })).toBeNull();
      expect(MenuPlanningHelper.parseRequest(null)).toBeNull();
    });

    it('uses defaults for the optional fields', () => {
      expect(MenuPlanningHelper.parseRequest({ year: 2026, week: 1 })).toEqual({ canteen: null, year: 2026, week: 1, weeks: 1, notes: '', language: 'de' });
    });
  });

  it('shortenComment joins lines and cuts long comments', () => {
    expect(MenuPlanningHelper.shortenComment('zu\n  salzig ')).toBe('zu salzig');
    expect(MenuPlanningHelper.shortenComment('a'.repeat(500))).toHaveLength(MenuPlanningHelper.MAX_COMMENT_LENGTH);
  });

  it('getOffersPerDay averages over days with offers', () => {
    expect(MenuPlanningHelper.getOffersPerDay(createContext().reference_days)).toBe(1);
    expect(MenuPlanningHelper.getOffersPerDay([])).toBe(0);
  });

  it('puts the language into the system prompt and the data into the user prompt', () => {
    expect(MenuPlanningHelper.buildSystemPrompt('fr-FR')).toContain('"fr-FR"');
    const data = JSON.parse(MenuPlanningHelper.buildUserPrompt(request, createContext()));
    expect(data.planned_weeks).toEqual([{ year: 2026, week: 43 }]);
    expect(data.notes_of_the_planners).toBe('Freitag Fisch');
    expect(data.menu_same_weeks_last_year[0].dishes[0]).toMatchObject({ food_id: 'schnitzel', comments: ['Super'] });
    expect(data.awaited_by_guests[0]).toMatchObject({ food_id: 'pizza', waiting: 2 });
    expect(data.markings[0]).toMatchObject({ name: 'Vegan', share_of_offers: 0.33, guests_like: 10 });
  });

  describe('parseSuggestion', () => {
    it('keeps days inside the planned range and known food ids only', () => {
      const answer = {
        summary: 'Ausgewogen',
        weeks: [
          {
            year: 2026,
            week: 43,
            days: [
              { date: '2026-10-19', dishes: [{ name: 'Schnitzel', food_id: 'schnitzel', reason: 'Beliebt' }, { name: 'Neu', food_id: 'invented', reason: 'Idee' }, { name: '' }] },
              { date: '2026-11-30', dishes: [{ name: 'Außerhalb' }] },
              { date: 'kaputt', dishes: [{ name: 'X' }] },
            ],
          },
        ],
        hints: ['Mehr vegan', 42, ''],
      };
      const suggestion = MenuPlanningHelper.parseSuggestion(answer, request, createContext(), 'Test · model');
      expect(suggestion.summary).toBe('Ausgewogen');
      expect(suggestion.recommended_by_ai).toBe('Test · model');
      expect(suggestion.weeks).toEqual([
        {
          year: 2026,
          week: 43,
          days: [
            {
              date: '2026-10-19',
              dishes: [
                { name: 'Schnitzel', food_id: 'schnitzel', category: null, reason: 'Beliebt' },
                { name: 'Neu', food_id: null, category: null, reason: 'Idee' },
              ],
            },
          ],
        },
      ]);
      expect(suggestion.hints).toEqual(['Mehr vegan']);
    });

    it('survives an answer without the expected shape', () => {
      const suggestion = MenuPlanningHelper.parseSuggestion('nonsense', request, createContext(), 'AI');
      expect(suggestion.weeks).toEqual([{ year: 2026, week: 43, days: [] }]);
      expect(suggestion.hints).toEqual([]);
      expect(suggestion.summary).toBe('');
    });
  });

  it('groupDaysByWeek groups the reference days by ISO week', () => {
    const groups = MenuPlanningHelper.groupDaysByWeek([{ date: '2025-10-20' }, { date: '2025-10-26' }, { date: '2025-10-27' }]);
    expect(groups.map(group => [group.year, group.week, group.days.length])).toEqual([
      [2025, 43, 2],
      [2025, 44, 1],
    ]);
  });
});
