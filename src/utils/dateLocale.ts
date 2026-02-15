import { ru, enUS } from 'date-fns/locale';

export const getDateLocale = (lang: string) => {
    switch (lang) {
        case 'ru':
            return ru;
        default:
            return enUS;
    }
};
