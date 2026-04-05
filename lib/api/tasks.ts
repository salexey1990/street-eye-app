import { api } from './client';

export type Level    = 'BEGINNER' | 'INTERMEDIATE' | 'PRO';
export type Category = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'LIMITATIONS';
type BackendCategory = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'RESTRICTION';
type BackendLocale   = 'EN' | 'RU';

export interface Task {
  id:           string;
  title:        string;
  description:  string;
  tip:          string;
  category:     Category;
  level:        Level;
  durationMins: number;
  tags:         string[];
}

// Backend uses RESTRICTION, frontend uses LIMITATIONS
const toBackendCategory = (c: Category): BackendCategory =>
  c === 'LIMITATIONS' ? 'RESTRICTION' : c;

export const tasksApi = {
  async getGuestRandom(params: {
    locale:     'ru' | 'en';
    level:      Level;
    categories: Category[];
  }): Promise<Task> {
    const locale: BackendLocale = params.locale.toUpperCase() as BackendLocale;
    const res = await api.get('/tasks/random/guest', {
      headers: { 'Accept-Language': params.locale },
      params: {
        level:      params.level,
        categories: params.categories.map(toBackendCategory),
        locale,
      },
    });
    return res.data.data;
  },
};
